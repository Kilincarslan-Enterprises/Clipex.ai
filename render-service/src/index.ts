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
}

interface Canvas {
    width: number;
    height: number;
    fps: number;
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
}

// ── Render Logic ────────────────────────────────────────
const processRender = async (jobId: string, reqBody: RenderRequest) => {
    const job = jobs.get(jobId);
    if (!job) return;

    const tempFiles: string[] = []; // Track temp files for cleanup

    try {
        job.status = 'processing';
        job.progress = 0;

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

        // ─ build ffmpeg command ─
        const cmd = ffmpeg();
        const inputMap = new Map<string, number>();
        let inputIdx = 0;

        // add media inputs (now async for remote downloads)
        for (const block of activeBlocks) {
            if (block.type !== 'video' && block.type !== 'image') continue;
            const src = await resolveSource(block.source);
            if (!src || inputMap.has(src)) continue;

            // Verify file exists
            if (!fs.existsSync(src)) {
                console.warn(`Source file not found: ${src}`);
                continue;
            }

            cmd.input(src);
            if (block.type === 'image') cmd.inputOption('-loop 1');
            inputMap.set(src, inputIdx++);
        }

        // base colour layer
        const duration = Math.max(...activeBlocks.map((b) => b.start + b.duration));
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
                const src = await resolveSource(block.source);
                if (!src || !inputMap.has(src)) continue;
                const idx = inputMap.get(src)!;
                const { start, duration: dur, x = 0, y = 0, width: w, height: h } = block;
                const end = start + dur;
                const scale = w && w > 0 || h && h > 0
                    ? `,scale=${w && w > 0 ? w : -1}:${h && h > 0 ? h : -1}`
                    : '';
                const pts = `setpts=PTS-STARTPTS+(${start}/TB)`;
                filters.push(`[${idx}:v]trim=duration=${dur},${pts}${scale}[blk${labelCounter}]`);
                filters.push(`${stream}[blk${labelCounter}]overlay=x=${x}:y=${y}:enable='between(t,${start},${end})'[${label}]`);
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
                const escaped = (block.text || '').replace(/:/g, '\\:').replace(/'/g, '');
                const { start, duration: dur, x = 0, y = 0, fontSize = 24, color = 'white', backgroundColor } = block;
                const end = start + dur;
                const fontOpt = FONT_PATH ? `:fontfile=${FONT_PATH}` : '';
                let dt = `${stream}drawtext=text='${escaped}'${fontOpt}:x=${x}:y=${y}:fontsize=${fontSize}:fontcolor=${color}:enable='between(t,${start},${end})'`;
                if (backgroundColor) dt += `:box=1:boxcolor=${backgroundColor}`;
                dt += `[${label}]`;
                filters.push(dt);
                stream = `[${label}]`;
                labelCounter++;
            }
        }

        // output
        const outName = `render_${jobId}.mp4`;
        const outPath = path.join(RENDERS_DIR, outName);

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
                .on('end', () => {
                    job.progress = 100;
                    job.status = 'completed';
                    job.url = `/renders/${outName}`;
                    resolve();
                })
                .on('error', (err) => {
                    console.error('FFmpeg error:', err);
                    reject(err);
                })
                .run();
        });

    } catch (err: any) {
        console.error('Render job error:', err);
        job.status = 'failed';
        job.error = err.message || 'Unknown error';
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
app.post('/render', (req, res) => {
    try {
        const jobId = uuidv4();
        const job: RenderJob = {
            id: jobId,
            status: 'pending',
            progress: 0,
            createdAt: new Date()
        };
        jobs.set(jobId, job);

        // Start processing in background
        processRender(jobId, req.body as RenderRequest);

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
