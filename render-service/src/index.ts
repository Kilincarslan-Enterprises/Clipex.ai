import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

// ── FFmpeg ──────────────────────────────────────────────
if (ffmpegStatic) ffmpeg.setFfmpegPath(ffmpegStatic);

// ── Express ─────────────────────────────────────────────
const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '50mb' }));

// Ensure dirs exist
const UPLOADS_DIR = path.join(__dirname, '..', 'data', 'uploads');
const RENDERS_DIR = path.join(__dirname, '..', 'data', 'renders');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(RENDERS_DIR, { recursive: true });

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

// ── Types ───────────────────────────────────────────────
interface Block {
    id: string;
    type: 'video' | 'image' | 'text';
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

    try {
        job.status = 'processing';
        job.progress = 0;

        const { template, assets, placeholders } = reqBody;
        const { canvas, timeline } = template;

        const activeBlocks = timeline
            .filter((b) => b.duration > 0)
            .sort((a, b) => a.track - b.track);

        // ─ resolve source path ─
        const resolveSource = (source?: string): string | null => {
            if (!source) return null;
            const m = source.match(/^{{(.+)}}$/);
            if (!m) return null;
            const assetId = placeholders[m[1]];
            if (!assetId) return null;
            const asset = assets.find((a) => a.id === assetId);
            if (!asset) return null;
            // asset.url is like "/uploads/xxx.mp4"
            return path.join(UPLOADS_DIR, path.basename(asset.url));
        };

        // ─ build ffmpeg command ─
        const cmd = ffmpeg();
        const inputMap = new Map<string, number>();
        let inputIdx = 0;

        // add media inputs
        for (const block of activeBlocks) {
            if (block.type !== 'video' && block.type !== 'image') continue;
            const src = resolveSource(block.source);
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

        activeBlocks.forEach((block, i) => {
            const label = `layer${i}`;

            if (block.type === 'video' || block.type === 'image') {
                const src = resolveSource(block.source);
                if (!src || !inputMap.has(src)) return;
                const idx = inputMap.get(src)!;
                const { start, duration: dur, x = 0, y = 0, width: w, height: h } = block;
                const end = start + dur;
                const scale = w && w > 0 || h && h > 0
                    ? `,scale=${w && w > 0 ? w : -1}:${h && h > 0 ? h : -1}`
                    : '';
                const pts = `setpts=PTS-STARTPTS+(${start}/TB)`;
                filters.push(`[${idx}:v]trim=duration=${dur},${pts}${scale}[blk${i}]`);
                filters.push(`${stream}[blk${i}]overlay=x=${x}:y=${y}:enable='between(t,${start},${end})'[${label}]`);
                stream = `[${label}]`;
            } else if (block.type === 'text') {
                const escaped = (block.text || '').replace(/:/g, '\\:').replace(/'/g, '');
                const { start, duration: dur, x = 0, y = 0, fontSize = 24, color = 'white', backgroundColor } = block;
                const end = start + dur;
                let dt = `${stream}drawtext=text='${escaped}':x=${x}:y=${y}:fontsize=${fontSize}:fontcolor=${color}:enable='between(t,${start},${end})'`;
                if (backgroundColor) dt += `:box=1:boxcolor=${backgroundColor}`;
                dt += `[${label}]`;
                filters.push(dt);
                stream = `[${label}]`;
            }
        });

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
                .on('progress', (progress) => {
                    // Update job progress
                    // progress.percent is not always reliable with complex filters, but we use what we can
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
