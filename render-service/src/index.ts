import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import https from 'https';
import http from 'http';
import { createClient } from '@supabase/supabase-js';

// ── Supabase Setup ──────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wqpzszingrxsjeypnwvl.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxcHpzemluZ3J4c2pleXBud3ZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDU4ODYwMSwiZXhwIjoyMDg2MTY0NjAxfQ.yEk8SnZwzUO48JORBelPTx5zYP-YjKjXEYC7honAjtI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
});

// ── FFmpeg ──────────────────────────────────────────────
// In production (Docker), we use the system ffmpeg (apk add ffmpeg) which has full support.
// largely because ffmpeg-static binaries may have issues on Alpine or miss filters.
if (process.env.NODE_ENV !== 'production' && ffmpegStatic) {
    ffmpeg.setFfmpegPath(ffmpegStatic);
}

// Default font path for Alpine/Debian in Docker
// Ensure you have: apt-get install fonts-dejavu-core
const FONT_PATH = process.env.NODE_ENV === 'production'
    ? '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    : undefined;

// ── Express ─────────────────────────────────────────────
const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Logging Middleware
app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '50mb' }));

// Ensure dirs exist
const UPLOADS_DIR = path.join(__dirname, '..', 'data', 'uploads');
const RENDERS_DIR = path.join(__dirname, '..', 'data', 'renders');
const TEMP_DIR = path.join(__dirname, '..', 'data', 'temp');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(RENDERS_DIR, { recursive: true });
fs.mkdirSync(TEMP_DIR, { recursive: true });

// Serve rendered files
app.use('/renders', express.static(RENDERS_DIR));
app.use('/uploads', express.static(UPLOADS_DIR));

// ── Job Store (In-Memory) ───────────────────────────────
interface RenderJob {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    url?: string;
    error?: string;
    createdAt: Date;
    // Database record ID
    dbId?: string;
}

const jobs = new Map<string, RenderJob>();

// Cleanup old jobs periodically
setInterval(() => {
    const now = Date.now();
    for (const [id, job] of jobs.entries()) {
        if (now - job.createdAt.getTime() > 1000 * 60 * 60) { // 1 hour
            jobs.delete(id);
        }
    }
}, 1000 * 60 * 60);

// ── Upload ──────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
        const safe = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        cb(null, `${uuidv4()}_${safe}`);
    },
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } }); // 500 MB

app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const publicUrl = `/uploads/${req.file.filename}`;
    res.json({ url: publicUrl, filename: req.file.filename });
});

// ── Remote Asset Download ───────────────────────────────
const downloadAsset = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const ext = path.extname(new URL(url).pathname) || '.bin';
        const filename = `${uuidv4()}${ext}`;
        const destPath = path.join(TEMP_DIR, filename);
        const file = fs.createWriteStream(destPath);

        const client = url.startsWith('https') ? https : http;

        const request = client.get(url, (response) => {
            // Follow redirects
            if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                file.close();
                fs.unlinkSync(destPath);
                return downloadAsset(response.headers.location).then(resolve).catch(reject);
            }

            if (response.statusCode && response.statusCode !== 200) {
                file.close();
                fs.unlinkSync(destPath);
                return reject(new Error(`Failed to download ${url}: HTTP ${response.statusCode}`));
            }

            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`Downloaded remote asset: ${url} -> ${destPath}`);
                resolve(destPath);
            });
        });

        request.on('error', (err) => {
            file.close();
            if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
            reject(err);
        });

        // 60s timeout
        request.setTimeout(60000, () => {
            request.destroy();
            file.close();
            if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
            reject(new Error(`Download timeout for ${url}`));
        });
    });
};

// ── VTT Parser ──────────────────────────────────────────
interface SubtitleCue {
    start: number;
    end: number;
    text: string;
}

const parseVTTTimestamp = (ts: string): number => {
    // Format: HH:MM:SS.mmm or MM:SS.mmm
    const parts = ts.trim().split(':');
    let hours = 0, minutes = 0, seconds = 0;
    if (parts.length === 3) {
        hours = parseFloat(parts[0]);
        minutes = parseFloat(parts[1]);
        seconds = parseFloat(parts[2]);
    } else if (parts.length === 2) {
        minutes = parseFloat(parts[0]);
        seconds = parseFloat(parts[1]);
    }
    return hours * 3600 + minutes * 60 + seconds;
};

const parseVTT = (vttContent: string): SubtitleCue[] => {
    const cues: SubtitleCue[] = [];
    const lines = vttContent.replace(/\r\n/g, '\n').split('\n');
    let i = 0;

    // Skip WEBVTT header
    while (i < lines.length && !lines[i].includes('-->')) {
        i++;
    }

    while (i < lines.length) {
        const line = lines[i].trim();

        if (line.includes('-->')) {
            const [startStr, endStr] = line.split('-->').map(s => s.trim());
            const start = parseVTTTimestamp(startStr);
            const end = parseVTTTimestamp(endStr);

            // Collect text lines
            i++;
            const textLines: string[] = [];
            while (i < lines.length && lines[i].trim() !== '') {
                textLines.push(lines[i].trim());
                i++;
            }

            const text = textLines.join(' ').replace(/<[^>]+>/g, ''); // Strip HTML tags
            if (text) {
                cues.push({ start, end, text });
            }
        } else {
            i++;
        }
    }

    return cues;
};

// ── Subtitle Chunking ───────────────────────────────────
// Split long cues into smaller "karaoke-style" chunks of ~3 words
const chunkSubtitleCues = (cues: SubtitleCue[], maxWordsPerChunk: number = 3): SubtitleCue[] => {
    const chunked: SubtitleCue[] = [];

    for (const cue of cues) {
        const words = cue.text.split(/\s+/).filter(w => w.length > 0);
        if (words.length <= maxWordsPerChunk) {
            chunked.push(cue);
            continue;
        }

        const totalDuration = cue.end - cue.start;
        const numChunks = Math.ceil(words.length / maxWordsPerChunk);
        const chunkDuration = totalDuration / numChunks;

        for (let c = 0; c < numChunks; c++) {
            const chunkWords = words.slice(c * maxWordsPerChunk, (c + 1) * maxWordsPerChunk);
            chunked.push({
                start: cue.start + c * chunkDuration,
                end: cue.start + (c + 1) * chunkDuration,
                text: chunkWords.join(' '),
            });
        }
    }

    return chunked;
};

// ── Types ───────────────────────────────────────────────
interface RenderAnimation {
    id: string;
    type: 'shake' | 'fade_in' | 'fade_out' | 'slide_in' | 'slide_out' | 'scale' | 'rotate' | 'bounce' | 'pulse';
    time: number;       // relative to block start
    duration: number;
    easing?: string;
    strength?: number;
    frequency?: number;
    direction?: 'left' | 'right' | 'top' | 'bottom';
    startScale?: number;
    endScale?: number;
    angle?: number;
    rotateDirection?: 'cw' | 'ccw';
}

interface Block {
    id: string;
    type: 'video' | 'image' | 'text' | 'audio';
    source?: string;
    text?: string;
    start: number;
    duration: number;
    track: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    fontSize?: number;
    color?: string;
    backgroundColor?: string;
    isDynamic?: boolean;
    subtitleEnabled?: boolean;
    subtitleSource?: string;
    subtitleStyleId?: string;
    volume?: number;
    loop?: boolean;
    animations?: RenderAnimation[];
}

// ── FFmpeg Animation Expression Builder ─────────────────
// Generates overlay x/y offset expressions and extra filter chains for animations
interface AnimExprResult {
    xOffsetExpr: string;   // expression added to overlay x
    yOffsetExpr: string;   // expression added to overlay y
    // Extra filters to insert BEFORE the overlay (applied to the block's stream)
    preFilters: string[];
    // Extra filters to insert AFTER the overlay (applied to the composited stream)
    postFilters: string[];
}

function buildAnimationExpressions(block: Block, canvasW: number, canvasH: number): AnimExprResult {
    const result: AnimExprResult = { xOffsetExpr: '', yOffsetExpr: '', preFilters: [], postFilters: [] };
    if (!block.animations || block.animations.length === 0) return result;

    const xParts: string[] = [];
    const yParts: string[] = [];

    for (const anim of block.animations) {
        // t is global time; block starts at block.start
        // localT = t - block.start
        // animStart = anim.time relative to block
        // animEnd = anim.time + anim.duration
        const bStart = block.start;
        const aStart = bStart + anim.time;
        const aEnd = aStart + anim.duration;
        const aDur = anim.duration;
        // FFmpeg expression for progress: (t - aStart) / aDur, clamped 0..1
        // enable = between(t, aStart, aEnd)
        const enableExpr = `between(t,${aStart},${aEnd})`;
        const progressExpr = `(t-${aStart})/${aDur}`;

        switch (anim.type) {
            case 'shake': {
                const str = anim.strength ?? 10;
                const freq = anim.frequency ?? 8;
                // decay = 1 - progress
                // x += sin(2*PI*freq*t) * str * decay
                // y += cos(2*PI*freq*0.7*t) * str * 0.5 * decay
                xParts.push(`if(${enableExpr}, sin(2*PI*${freq}*t)*${str}*(1-${progressExpr}), 0)`);
                yParts.push(`if(${enableExpr}, cos(2*PI*${freq}*0.7*t)*${str}*0.5*(1-${progressExpr}), 0)`);
                break;
            }
            case 'slide_in': {
                const dist = 300;
                const remaining = `(1-${progressExpr})`;
                switch (anim.direction) {
                    case 'right': xParts.push(`if(${enableExpr}, ${dist}*${remaining}, 0)`); break;
                    case 'top': yParts.push(`if(${enableExpr}, -${dist}*${remaining}, 0)`); break;
                    case 'bottom': yParts.push(`if(${enableExpr}, ${dist}*${remaining}, 0)`); break;
                    default: xParts.push(`if(${enableExpr}, -${dist}*${remaining}, 0)`); break; // left
                }
                break;
            }
            case 'slide_out': {
                const dist = 300;
                switch (anim.direction) {
                    case 'right': xParts.push(`if(${enableExpr}, ${dist}*${progressExpr}, 0)`); break;
                    case 'top': yParts.push(`if(${enableExpr}, -${dist}*${progressExpr}, 0)`); break;
                    case 'bottom': yParts.push(`if(${enableExpr}, ${dist}*${progressExpr}, 0)`); break;
                    default: xParts.push(`if(${enableExpr}, -${dist}*${progressExpr}, 0)`); break; // left
                }
                break;
            }
            case 'bounce': {
                const str = anim.strength ?? 20;
                const freq = anim.frequency ?? 3;
                // y -= abs(sin(progress * freq * PI)) * str * decay
                yParts.push(`if(${enableExpr}, -abs(sin(${progressExpr}*${freq}*PI))*${str}*(1-${progressExpr}), 0)`);
                break;
            }
            case 'fade_in': {
                // We handle fade via alpha on the block's stream before overlay
                // Using format=rgba + colorchannelmixer with enable expression
                result.postFilters.push(
                    `fade=t=in:st=${aStart}:d=${aDur}:alpha=1`
                );
                break;
            }
            case 'fade_out': {
                result.postFilters.push(
                    `fade=t=out:st=${aStart}:d=${aDur}:alpha=1`
                );
                break;
            }
            // Scale, rotate, pulse are complex with FFmpeg expressions; 
            // We implement them as zoompan/rotate on the block stream before overlay
            case 'scale': {
                const s0 = anim.startScale ?? 0;
                const s1 = anim.endScale ?? 1;
                // Use zoompan to animate scale (applied pre-overlay)
                // zoom expression: if in animation window, interpolate between s0 and s1
                // Outside window: 1
                const zoomExpr = `if(${enableExpr}, ${s0}+(${s1}-${s0})*${progressExpr}, 1)`;
                result.preFilters.push(
                    `zoompan=z='${zoomExpr}':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${block.width || canvasW}x${block.height || canvasH}:fps=${30}`
                );
                break;
            }
            case 'rotate': {
                const totalAngle = anim.angle ?? 360;
                const dir = anim.rotateDirection === 'ccw' ? -1 : 1;
                // rotate filter angle is in radians
                const maxRad = (totalAngle * Math.PI / 180) * dir;
                const rotExpr = `if(${enableExpr}, ${maxRad}*${progressExpr}, 0)`;
                result.preFilters.push(
                    `rotate=a='${rotExpr}':fillcolor=none:ow=rotw(iw):oh=roth(ih)`
                );
                break;
            }
            case 'pulse': {
                const str = anim.strength ?? 0.2;
                const freq = anim.frequency ?? 2;
                const zoomExpr = `if(${enableExpr}, 1+sin(${progressExpr}*${freq}*2*PI)*${str}, 1)`;
                result.preFilters.push(
                    `zoompan=z='${zoomExpr}':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${block.width || canvasW}x${block.height || canvasH}:fps=${30}`
                );
                break;
            }
        }
    }

    if (xParts.length > 0) result.xOffsetExpr = '+' + xParts.join('+');
    if (yParts.length > 0) result.yOffsetExpr = '+' + yParts.join('+');

    return result;
}

interface Canvas {
    width: number;
    height: number;
    fps: number;
    duration?: number; // Optional fixed duration
}

interface Asset {
    id: string;
    name: string;
    type: string;
    url: string;
}

interface RenderRequest {
    template: { canvas: Canvas; timeline: Block[] };
    assets: Asset[];
    placeholders: Record<string, string | null>;
    userId?: string;
    templateId?: string;
    projectId?: string;
    source?: 'ui' | 'api';
}

// ── Auth Middleware ─────────────────────────────────────
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = process.env.RENDER_ACCESS_TOKEN;
    if (!token) {
        // If no token is set in env, allow all (or warn)
        // For security, strictly speaking we should block, but for dev we might allow.
        // Given user request, we assume they will set it.
        return next();
    }

    const authHeader = req.headers['x-render-access-token'];
    if (!authHeader || authHeader !== token) {
        console.warn(`[Auth] Unauthorized access attempt from ${req.ip}`);
        return res.status(401).json({ error: 'Unauthorized: Invalid access token' });
    }
    next();
};

// ── Render Logic ────────────────────────────────────────
const processRender = async (jobId: string, reqBody: RenderRequest) => {
    const job = jobs.get(jobId);
    if (!job) return;

    const tempFiles: string[] = []; // Track temp files for cleanup

    try {
        job.status = 'processing';
        job.progress = 0;

        // Update DB status to processing
        if (job.dbId) {
            await supabase.from('renders').update({
                status: 'processing'
            }).eq('id', job.dbId);
        }

        const { template, assets, placeholders } = reqBody;
        const { canvas, timeline } = template;

        const activeBlocks = timeline
            .filter((b) => b.duration > 0)
            .sort((a, b) => a.track - b.track);

        // ─ resolve source path (supports remote URLs) ─
        const resolveSource = async (source?: string): Promise<string | null> => {
            if (!source) return null;

            // Direct remote URL
            if (source.startsWith('http://') || source.startsWith('https://')) {
                const localPath = await downloadAsset(source);
                tempFiles.push(localPath);
                return localPath;
            }

            // Placeholder {{key}}
            const m = source.match(/^{{(.+)}}$/);
            if (!m) return null;
            const assetId = placeholders[m[1]];
            if (!assetId) return null;

            // Check if assetId is itself a URL (sent via API)
            if (assetId.startsWith('http://') || assetId.startsWith('https://')) {
                const localPath = await downloadAsset(assetId);
                tempFiles.push(localPath);
                return localPath;
            }

            const asset = assets.find((a) => a.id === assetId);
            if (!asset) return null;

            // Asset URL could be a remote URL or a local path
            if (asset.url.startsWith('http://') || asset.url.startsWith('https://')) {
                const localPath = await downloadAsset(asset.url);
                tempFiles.push(localPath);
                return localPath;
            }

            // Local path: /uploads/xxx.mp4
            return path.join(UPLOADS_DIR, path.basename(asset.url));
        };

        // ─ Resolve VTT content ─
        const resolveVTT = async (subtitleSource?: string): Promise<string | null> => {
            if (!subtitleSource) return null;

            // Placeholder {{key}}
            const m = subtitleSource.match(/^{{(.+)}}$/);
            if (m) {
                const value = placeholders[m[1]];
                if (!value) return null;
                // Value could be VTT content or URL
                if (value.startsWith('http://') || value.startsWith('https://')) {
                    const localPath = await downloadAsset(value);
                    tempFiles.push(localPath);
                    return fs.readFileSync(localPath, 'utf-8');
                }
                return value; // Raw VTT content from API
            }

            // Direct URL to .vtt file
            if (subtitleSource.startsWith('http://') || subtitleSource.startsWith('https://')) {
                const localPath = await downloadAsset(subtitleSource);
                tempFiles.push(localPath);
                return fs.readFileSync(localPath, 'utf-8');
            }

            // Raw VTT content string
            if (subtitleSource.includes('-->')) {
                return subtitleSource;
            }

            return null;
        };

        // ─ Pre-resolve all sources (download remote assets once) ─
        const resolvedSources = new Map<string, string | null>();
        for (const block of activeBlocks) {
            if ((block.type === 'video' || block.type === 'image') && block.source) {
                if (!resolvedSources.has(block.source)) {
                    const resolved = await resolveSource(block.source);
                    resolvedSources.set(block.source, resolved);
                    console.log(`[${jobId}] Resolved source "${block.source}" -> "${resolved}"`);
                }
            }
        }

        // ─ build ffmpeg command ─
        const cmd = ffmpeg();
        const inputMap = new Map<string, number>();
        let inputIdx = 0;

        // add media inputs using pre-resolved paths
        for (const block of activeBlocks) {
            if (block.type !== 'video' && block.type !== 'image') continue;
            const src = resolvedSources.get(block.source!) ?? null;
            if (!src || inputMap.has(src)) continue;

            // Verify file exists
            if (!fs.existsSync(src)) {
                console.warn(`[${jobId}] Source file not found: ${src}`);
                continue;
            }

            cmd.input(src);
            if (block.type === 'image') cmd.inputOption('-loop 1');
            inputMap.set(src, inputIdx++);
        }

        // base colour layer
        // Use canvas.duration if provided, otherwise calculate from blocks
        const calculatedDuration = Math.max(...activeBlocks.map((b) => b.start + b.duration));
        const duration = canvas.duration || calculatedDuration;

        // Ensure duration is at least 1s to avoid ffmpeg errors
        const safeDuration = Math.max(duration, 1);

        cmd.input(`color=c=black:s=${canvas.width}x${canvas.height}:d=${safeDuration}`).inputFormat('lavfi');
        const baseIdx = inputIdx++;

        let stream = `[${baseIdx}:v]`;
        const filters: string[] = [];
        let labelCounter = 0;

        for (const block of activeBlocks) {
            const label = `layer${labelCounter}`;

            if (block.type === 'video' || block.type === 'image') {
                const src = resolvedSources.get(block.source!) ?? null;
                if (!src || !inputMap.has(src)) continue;
                const idx = inputMap.get(src)!;
                const { start, duration: dur, x = 0, y = 0, width: w, height: h } = block;
                const end = start + dur;
                const scale = w && w > 0 || h && h > 0
                    ? `,scale=${w && w > 0 ? w : -1}:${h && h > 0 ? h : -1}`
                    : '';
                const pts = `setpts=PTS-STARTPTS+(${start}/TB)`;

                // Build animation expressions for this block
                const animExprs = buildAnimationExpressions(block, canvas.width, canvas.height);

                // Base block preparation (trim, pts, scale)
                let blockStream = `[${idx}:v]trim=duration=${dur},${pts}${scale}`;

                // Apply pre-filters (rotate, zoompan for scale/pulse)
                if (animExprs.preFilters.length > 0) {
                    blockStream += ',' + animExprs.preFilters.join(',');
                }

                blockStream += `[blk${labelCounter}]`;
                filters.push(blockStream);

                // Apply post-filters (fade) to block before overlay
                if (animExprs.postFilters.length > 0) {
                    const postLabel = `blkp${labelCounter}`;
                    filters.push(`[blk${labelCounter}]${animExprs.postFilters.join(',')}[${postLabel}]`);
                    // Overlay using post-processed block
                    const xExpr = animExprs.xOffsetExpr ? `'${x}${animExprs.xOffsetExpr}'` : `${x}`;
                    const yExpr = animExprs.yOffsetExpr ? `'${y}${animExprs.yOffsetExpr}'` : `${y}`;
                    filters.push(`${stream}[${postLabel}]overlay=x=${xExpr}:y=${yExpr}:enable='between(t,${start},${end})'[${label}]`);
                } else {
                    // Overlay with animation offset expressions
                    const xExpr = animExprs.xOffsetExpr ? `'${x}${animExprs.xOffsetExpr}'` : `${x}`;
                    const yExpr = animExprs.yOffsetExpr ? `'${y}${animExprs.yOffsetExpr}'` : `${y}`;
                    filters.push(`${stream}[blk${labelCounter}]overlay=x=${xExpr}:y=${yExpr}:enable='between(t,${start},${end})'[${label}]`);
                }

                stream = `[${label}]`;
                labelCounter++;

                // ─ Subtitle rendering for this block ─
                if (block.subtitleEnabled && block.subtitleSource) {
                    const vttContent = await resolveVTT(block.subtitleSource);
                    if (vttContent) {
                        const rawCues = parseVTT(vttContent);
                        const cues = chunkSubtitleCues(rawCues);

                        // Get style from linked text block
                        let fontSize = 36;
                        let fontColor = 'white';
                        let bgColor: string | null = null;

                        if (block.subtitleStyleId) {
                            const styleBlock = activeBlocks.find(b => b.id === block.subtitleStyleId);
                            if (styleBlock) {
                                fontSize = styleBlock.fontSize || fontSize;
                                fontColor = styleBlock.color || fontColor;
                                bgColor = styleBlock.backgroundColor || null;
                            }
                        }

                        // Generate drawtext for each subtitle cue
                        for (const cue of cues) {
                            const subLabel = `sub${labelCounter}`;
                            const escaped = cue.text.replace(/:/g, '\\:').replace(/'/g, '');
                            // Center horizontally, place near bottom (80% of height)
                            const subY = Math.round(canvas.height * 0.82);
                            const fontOpt = FONT_PATH ? `:fontfile=${FONT_PATH}` : '';
                            let dt = `${stream}drawtext=text='${escaped}'${fontOpt}:x=(w-text_w)/2:y=${subY}:fontsize=${fontSize}:fontcolor=${fontColor}:enable='between(t,${cue.start},${cue.end})'`;
                            if (bgColor) dt += `:box=1:boxcolor=${bgColor}:boxborderw=8`;
                            dt += `[${subLabel}]`;
                            filters.push(dt);
                            stream = `[${subLabel}]`;
                            labelCounter++;
                        }
                    }
                }
            } else if (block.type === 'text') {
                const { start, duration: dur, x = 0, y = 0, fontSize = 24, color = 'white', backgroundColor } = block;
                const end = start + dur;
                const fontOpt = FONT_PATH ? `:fontfile=${FONT_PATH}` : '';

                // ─ Subtitle mode: parse VTT and generate per-cue drawtext ─
                if (block.subtitleEnabled && block.subtitleSource) {
                    const vttContent = await resolveVTT(block.subtitleSource);
                    if (vttContent) {
                        const rawCues = parseVTT(vttContent);
                        const cues = chunkSubtitleCues(rawCues);

                        for (const cue of cues) {
                            const subLabel = `sub${labelCounter}`;
                            const escaped = cue.text.replace(/:/g, '\\:').replace(/'/g, '');
                            // Offset cue times by block start so they align with the global timeline
                            const cueStart = start + cue.start;
                            const cueEnd = Math.min(start + cue.end, end);
                            // Center horizontally at block position, use block y for vertical
                            let dt = `${stream}drawtext=text='${escaped}'${fontOpt}:x=${x}+(w-text_w)/2:y=${y}:fontsize=${fontSize}:fontcolor=${color}:enable='between(t,${cueStart},${cueEnd})'`;
                            if (backgroundColor) dt += `:box=1:boxcolor=${backgroundColor}:boxborderw=8`;
                            dt += `[${subLabel}]`;
                            filters.push(dt);
                            stream = `[${subLabel}]`;
                            labelCounter++;
                        }
                    } else {
                        // VTT could not be resolved, skip this block
                        console.warn(`[${jobId}] Could not resolve VTT for text block ${block.id}`);
                    }
                } else {
                    // ─ Normal static text ─
                    const escaped = (block.text || '').replace(/:/g, '\\:').replace(/'/g, '');
                    let dt = `${stream}drawtext=text='${escaped}'${fontOpt}:x=${x}:y=${y}:fontsize=${fontSize}:fontcolor=${color}:enable='between(t,${start},${end})'`;
                    if (backgroundColor) dt += `:box=1:boxcolor=${backgroundColor}`;
                    dt += `[${label}]`;
                    filters.push(dt);
                    stream = `[${label}]`;
                    labelCounter++;
                }
            }
        }

        // output
        const outName = `render_${jobId}.mp4`;
        const outPath = path.join(RENDERS_DIR, outName);

        // If no filters were generated, just use the base layer directly
        if (filters.length === 0) {
            console.log(`[${jobId}] No overlay filters generated, using base layer directly.`);
            filters.push(`[${baseIdx}:v]null[out]`);
            stream = '[out]';
        }

        console.log(`[${jobId}] Filter chain (${filters.length} filters): ${JSON.stringify(filters)}`);

        await new Promise<void>((resolve, reject) => {
            cmd
                .complexFilter(filters)
                .map(stream)
                .outputOptions([
                    '-c:v libx264',
                    '-pix_fmt yuv420p',
                    `-r ${canvas.fps}`,
                    '-preset veryfast', // Optimized for speed
                    '-movflags +faststart'
                ])
                .output(outPath)
                .on('start', (cmdLine: string) => {
                    console.log(`[${jobId}] Ffmpeg spawned: ${cmdLine}`);
                    job.progress = 1;
                })

                .on('progress', (progress) => {
                    if (progress.percent) {
                        job.progress = Math.min(Math.round(progress.percent), 99);
                    }
                })
                .on('end', async () => {
                    job.progress = 100;
                    job.status = 'completed';
                    job.url = `/renders/${outName}`;

                    // Update DB status to completed
                    if (job.dbId) {
                        await supabase.from('renders').update({
                            status: 'completed',
                            output_url: job.url,
                            resolution: `${canvas.width}x${canvas.height}`
                        }).eq('id', job.dbId);
                    }
                    resolve();
                })
                .on('error', async (err) => {
                    console.error('FFmpeg error:', err);
                    // Update DB status to failed
                    if (job.dbId) {
                        await supabase.from('renders').update({
                            status: 'failed',
                            error_message: err.message || 'Unknown error'
                        }).eq('id', job.dbId);
                    }
                    reject(err);
                })
                .run();
        });

    } catch (err: any) {
        console.error('Render job error:', err);
        job.status = 'failed';
        job.error = err.message || 'Unknown error';

        // Update DB status to failed (catch-all)
        if (job.dbId) {
            await supabase.from('renders').update({
                status: 'failed',
                error_message: job.error
            }).eq('id', job.dbId);
        }

    } finally {
        // Cleanup temp files
        for (const tmpFile of tempFiles) {
            try {
                if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
            } catch { /* ignore cleanup errors */ }
        }
    }
};

// ── Render Endpoints ────────────────────────────────────
// Apply auth middleware to protect POST /render
app.post('/render', requireAuth, async (req, res) => {
    try {
        const jobId = uuidv4();
        const body = req.body as RenderRequest;

        // Create Database Entry
        let dbId = undefined;
        try {
            const { data: renderRow, error: dbError } = await supabase.from('renders').insert({
                user_id: body.userId,
                template_id: body.templateId,
                project_id: body.projectId,
                render_job_id: jobId,
                source: body.source || 'ui',
                status: 'pending',
                resolution: body.template?.canvas ? `${body.template.canvas.width}x${body.template.canvas.height}` : undefined
            }).select().single();

            if (dbError) {
                console.error('Failed to create render log in DB:', dbError);
            } else if (renderRow) {
                dbId = renderRow.id;
            }
        } catch (e) {
            console.error('Supabase insert exception:', e);
        }

        const job: RenderJob = {
            id: jobId,
            status: 'pending',
            progress: 0,
            createdAt: new Date(),
            dbId: dbId
        };
        jobs.set(jobId, job);

        // Start processing in background
        processRender(jobId, body);

        res.json({ jobId });
    } catch (err: any) {
        res.status(500).json({ error: 'Failed to start render', details: err.message });
    }
});

app.get('/status/:id', (req, res) => {
    const jobId = req.params.id;
    const job = jobs.get(jobId);

    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
        id: job.id,
        status: job.status,
        progress: job.progress,
        url: job.url,
        error: job.error
    });
});


// ── Health ──────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'clipex-render', timestamp: new Date().toISOString() });
});

// ── Start ───────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎬 Clipex Render Service listening on port ${PORT}`);
});
