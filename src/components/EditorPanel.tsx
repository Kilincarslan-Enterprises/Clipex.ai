'use client';

import { useState, useEffect } from 'react';
import { CanvasPreview } from './CanvasPreview';
import { Timeline } from './Timeline';
import { JsonEditor } from './JsonEditor';
import { useStore } from '@/lib/store';
import { Block } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { Code, Layers, Video, Loader2, ArrowLeft, Wifi, WifiOff, Zap, X, Copy, Check, Monitor, Clock } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { createClient } from '@/utils/supabase/client';

interface HealthStatus {
    connected: boolean;
    latency?: number;
    error?: string;
    renderServiceUrl?: string;
    checkedAt: string;
}

export function EditorPanel() {
    const [viewMode, setViewMode] = useState<'visual' | 'json' | 'render'>('visual');
    const [isRendering, setIsRendering] = useState(false);
    const [renderUrl, setRenderUrl] = useState<string | null>(null);
    const [health, setHealth] = useState<HealthStatus | null>(null);
    const [healthChecking, setHealthChecking] = useState(false);
    const router = useRouter();
    const params = useParams(); // Get projectId from URL
    const supabase = createClient();
    const [userId, setUserId] = useState<string | null>(null);

    const { addBlock, currentTime, template, placeholders, projectId, updateCanvas } = useStore();

    const [renderProgress, setRenderProgress] = useState(0);
    const [showApiModal, setShowApiModal] = useState(false);
    const [copiedApi, setCopiedApi] = useState(false);
    const [showFormatMenu, setShowFormatMenu] = useState(false);

    // Aspect ratio presets
    const FORMAT_PRESETS = [
        { label: '9:16', w: 1080, h: 1920, desc: 'Vertical (TikTok, Reels)' },
        { label: '16:9', w: 1920, h: 1080, desc: 'Landscape (YouTube)' },
        { label: '1:1', w: 1080, h: 1080, desc: 'Square (Instagram)' },
        { label: '4:5', w: 1080, h: 1350, desc: 'Portrait (Instagram)' },
    ];

    const currentAspect = () => {
        const { width, height } = template.canvas;
        const preset = FORMAT_PRESETS.find(p => p.w === width && p.h === height);
        return preset?.label || `${width}×${height}`;
    };

    // Direct URL to the render service (bypasses broken Cloudflare Pages API routes)
    const RENDER_URL = process.env.NEXT_PUBLIC_RENDER_API_URL || 'http://localhost:3001';

    // Check health on mount & fetch user
    useEffect(() => {
        console.log('Using Render URL:', RENDER_URL);
        checkHealth();
        fetchUser();
    }, []);

    const fetchUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setUserId(user.id);
    };

    const checkHealth = async () => {
        setHealthChecking(true);
        const start = Date.now();
        try {
            const res = await fetch(`${RENDER_URL}/health`, {
                signal: AbortSignal.timeout(10000),
            });
            const latency = Date.now() - start;
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            await res.json(); // validate JSON response
            setHealth({
                connected: true,
                latency,
                renderServiceUrl: RENDER_URL,
                checkedAt: new Date().toISOString(),
            });
        } catch (err: any) {
            setHealth({
                connected: false,
                error: err.message || 'Network error',
                renderServiceUrl: RENDER_URL,
                checkedAt: new Date().toISOString(),
            });
        } finally {
            setHealthChecking(false);
        }
    };

    const handleRender = async () => {
        setIsRendering(true);
        setRenderUrl(null);
        setRenderProgress(0);

        try {
            // Start Job
            const startResponse = await fetch(`${RENDER_URL}/render`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    template,
                    assets: [], // No longer sending local assets
                    placeholders,
                    userId: userId, // Pass current user ID
                    templateId: params?.id as string, // Pass current project/template ID
                    projectId: params?.id as string, // Currently project = template
                    source: 'ui'
                })
            });

            if (!startResponse.ok) {
                const errorData = await startResponse.json().catch(() => ({}));
                throw new Error(errorData.details || errorData.error || `HTTP ${startResponse.status}`);
            }
            const { jobId } = await startResponse.json();

            // Poll Status
            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await fetch(`${RENDER_URL}/status/${jobId}`);
                    if (!statusRes.ok) throw new Error('Status check failed');

                    const statusData = await statusRes.json();
                    setRenderProgress(statusData.progress || 0);

                    if (statusData.status === 'completed') {
                        clearInterval(pollInterval);
                        setRenderUrl(statusData.url);
                        setViewMode('render');
                        setIsRendering(false);
                    } else if (statusData.status === 'failed') {
                        clearInterval(pollInterval);
                        throw new Error(statusData.error || 'Render failed');
                    }
                } catch (e: any) {
                    clearInterval(pollInterval);
                    console.error("Polling error", e);
                    alert(`Render failed: ${e.message}`);
                    setIsRendering(false);
                }
            }, 1000);

        } catch (e: any) {
            console.error("Render error", e);
            alert(`Render failed: ${e.message}`);
            setIsRendering(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (viewMode !== 'visual') return;

        const data = e.dataTransfer.getData('application/json');
        if (!data) return;

        try {
            const parsed = JSON.parse(data);

            if (parsed.type === 'library') {
                // Library item (dragged from the type cards)
                const blockType = parsed.blockType as Block['type'];
                const newBlock: Block = {
                    id: uuidv4(),
                    type: blockType,
                    track: 0,
                    start: currentTime,
                    duration: blockType === 'text' ? 3 : 5,
                    x: 0,
                    y: 0,
                    width: 0,
                    height: 0,
                    ...(blockType === 'text' ? { text: 'Your Text Here', fontSize: 48, color: '#ffffff' } : {}),
                    ...(blockType === 'audio' ? { volume: 100, loop: false } : {}),
                    source: blockType === 'text' ? undefined : '',
                };
                addBlock(newBlock);
            }
        } catch (err) {
            console.error('Drop error', err);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    // Health status dot
    const HealthDot = () => {
        if (healthChecking) {
            return (
                <button
                    className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-neutral-400 bg-neutral-800/50"
                    title="Checking connection..."
                >
                    <Loader2 size={12} className="animate-spin" />
                    <span className="hidden sm:inline">Checking...</span>
                </button>
            );
        }

        if (!health) return null;

        if (health.connected) {
            return (
                <button
                    onClick={checkHealth}
                    className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
                    title={`Connected to render service (${health.latency}ms)\n${health.renderServiceUrl || ''}\nClick to re-check`}
                >
                    <Wifi size={12} />
                    <span className="hidden sm:inline">{health.latency}ms</span>
                </button>
            );
        }

        return (
            <button
                onClick={checkHealth}
                className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors"
                title={`Render service offline: ${health.error || 'Unknown error'}\n${health.renderServiceUrl || ''}\nClick to retry`}
            >
                <WifiOff size={12} />
                <span className="hidden sm:inline">Offline</span>
            </button>
        );
    };

    const handleDownload = () => {
        if (!renderUrl) return;
        const fullUrl = renderUrl.startsWith('http') ? renderUrl : `${RENDER_URL}${renderUrl}`;
        window.open(fullUrl, '_blank');
    };

    // Generate API request JSON
    const generateApiJson = () => {
        const modifications: Record<string, string> = {};

        // Template-level dynamic fields (e.g. template.duration)
        const templateDynFields = template.dynamic?.dynamicFields || [];
        for (const field of templateDynFields) {
            modifications[`template.${field}`] = `<${field}_value>`;
        }

        // Block-level dynamic fields
        const dynamicBlocks = template.timeline.filter(
            b => b.dynamicId && b.dynamicFields && b.dynamicFields.length > 0
        );
        for (const block of dynamicBlocks) {
            for (const field of (block.dynamicFields || [])) {
                modifications[`${block.dynamicId}.${field}`] = `<${field}_value>`;
            }
        }
        return JSON.stringify({
            template_id: projectId || params?.id || '<template_uuid>',
            modifications,
        }, null, 2);
    };

    const copyApiJson = () => {
        navigator.clipboard.writeText(generateApiJson());
        setCopiedApi(true);
        setTimeout(() => setCopiedApi(false), 2000);
    };

    return (
        <div className="flex-1 flex flex-col min-w-0 bg-neutral-950 h-full relative">
            {/* Toggle Bar */}
            <div className="flex h-12 items-center justify-between px-4 bg-neutral-900 border-b border-neutral-800 shrink-0">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => router.push('/')}
                        className="mr-2 p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                        title="Back to Dashboard"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <button
                        onClick={() => setViewMode('visual')}
                        className={cn(
                            "px-3 py-1.5 rounded text-sm flex items-center gap-2 transition-colors font-medium",
                            viewMode === 'visual' ? "bg-neutral-800 text-white" : "text-neutral-500 hover:text-neutral-300"
                        )}
                    >
                        <Layers size={14} /> Visual
                    </button>
                    <button
                        onClick={() => setViewMode('json')}
                        className={cn(
                            "px-3 py-1.5 rounded text-sm flex items-center gap-2 transition-colors font-medium",
                            viewMode === 'json' ? "bg-neutral-800 text-white" : "text-neutral-500 hover:text-neutral-300"
                        )}
                    >
                        <Code size={14} /> JSON
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <HealthDot />

                    {/* ── Format / Aspect Ratio Dropdown ── */}
                    <div className="relative">
                        <button
                            onClick={() => setShowFormatMenu(!showFormatMenu)}
                            className="px-2.5 py-1.5 rounded text-sm font-medium flex items-center gap-1.5 transition-colors bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 border border-neutral-700"
                            title="Video Format / Aspect Ratio"
                        >
                            <Monitor size={14} />
                            <span className="hidden sm:inline">{currentAspect()}</span>
                        </button>
                        {showFormatMenu && (
                            <div className="absolute right-0 top-full mt-1 z-50 bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl overflow-hidden w-56">
                                {FORMAT_PRESETS.map((p) => {
                                    const isActive = template.canvas.width === p.w && template.canvas.height === p.h;
                                    return (
                                        <button
                                            key={p.label}
                                            onClick={() => { updateCanvas({ width: p.w, height: p.h }); setShowFormatMenu(false); }}
                                            className={`w-full text-left px-4 py-2.5 flex items-center justify-between text-sm hover:bg-neutral-800 transition-colors ${isActive ? 'text-blue-400 bg-blue-500/10' : 'text-neutral-300'
                                                }`}
                                        >
                                            <div>
                                                <span className="font-mono font-bold">{p.label}</span>
                                                <span className="ml-2 text-neutral-500 text-xs">{p.desc}</span>
                                            </div>
                                            {isActive && <span className="text-blue-400 text-xs">✓</span>}
                                        </button>
                                    );
                                })}
                                <div className="border-t border-neutral-800 px-4 py-2 text-[10px] text-neutral-600">
                                    {template.canvas.width} × {template.canvas.height}px
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Global Duration Input ── */}
                    <div className="flex items-center gap-1 bg-neutral-800 border border-neutral-700 rounded px-2 py-1">
                        <Clock size={12} className="text-neutral-500" />
                        <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            value={template.canvas.duration ?? ''}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                updateCanvas({ duration: isNaN(val) || val <= 0 ? undefined : val });
                            }}
                            placeholder="Auto"
                            className="w-14 bg-transparent text-sm text-neutral-200 outline-none placeholder:text-neutral-600 text-center font-mono"
                            title="Global template duration (seconds). Leave empty for auto-calculate."
                        />
                        <span className="text-[10px] text-neutral-600">s</span>
                    </div>

                    {/* API Preview Button */}
                    {(template.timeline.some(b => b.dynamicId && b.dynamicFields && b.dynamicFields.length > 0) || (template.dynamic?.dynamicFields?.length ?? 0) > 0) && (
                        <button
                            onClick={() => setShowApiModal(true)}
                            className="px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1.5 transition-colors bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20"
                            title="API Request Preview"
                        >
                            <Zap size={14} />
                            API
                        </button>
                    )}
                    <button
                        onClick={handleRender}
                        disabled={isRendering || (health !== null && !health.connected)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
                    >
                        {isRendering ? <Loader2 size={14} className="animate-spin" /> : <Video size={14} />}
                        {isRendering ? `Rendering ${renderProgress}%...` : 'Render Video'}
                    </button>
                </div>
            </div>

            {/* ── API Preview Modal ── */}
            {showApiModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Zap className="text-amber-400" size={18} />
                                <h3 className="text-lg font-bold text-neutral-100">API Request Preview</h3>
                            </div>
                            <button onClick={() => setShowApiModal(false)} className="p-1 text-neutral-500 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 font-mono text-xs text-neutral-300 overflow-x-auto whitespace-pre">
                            {generateApiJson()}
                        </div>
                        <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 font-mono text-xs text-neutral-400 overflow-x-auto whitespace-pre-wrap">
                            {`curl -X POST \\\n  ${typeof window !== 'undefined' ? window.location.origin : 'https://your-app.com'}/api/v1/render \\\n  -H "Content-Type: application/json" \\\n  -H "x-api-key: ck_your_api_key" \\\n  -d '${generateApiJson()}'`}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={copyApiJson}
                                className="flex-1 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl font-medium transition-all flex items-center justify-center gap-2 border border-amber-500/20"
                            >
                                {copiedApi ? <Check size={16} /> : <Copy size={16} />}
                                {copiedApi ? 'Kopiert!' : 'JSON Kopieren'}
                            </button>
                            <button
                                onClick={() => setShowApiModal(false)}
                                className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl font-medium transition-colors"
                            >
                                Schließen
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative flex flex-col">
                {viewMode === 'render' && renderUrl ? (
                    <div className="flex-1 flex flex-col items-center justify-center bg-neutral-950 p-8 gap-4">
                        <h2 className="text-xl font-bold text-neutral-200">Render Completed</h2>
                        <div className="bg-neutral-900 p-2 rounded-lg border border-neutral-800 shadow-2xl">
                            <video
                                src={renderUrl.startsWith('http') ? renderUrl : `${RENDER_URL}${renderUrl}`}
                                controls
                                className="max-h-[60vh] max-w-full bg-black rounded"
                            />
                        </div>
                        <div className="flex gap-4 mt-4">
                            <button
                                onClick={handleDownload}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20 flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                                Download Video
                            </button>
                            <button
                                onClick={() => setViewMode('visual')}
                                className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg font-medium transition-colors"
                            >
                                Back to Editor
                            </button>
                        </div>
                    </div>
                ) : viewMode === 'visual' ? (
                    <>
                        {/* Viewport for Canvas */}
                        <div
                            className="flex-1 flex items-center justify-center bg-neutral-950 relative overflow-hidden p-8"
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                        >
                            <div
                                className="bg-black shadow-2xl relative h-full max-h-[90%] w-auto ring-1 ring-neutral-700 rounded-sm"
                                style={{ aspectRatio: `${template.canvas.width} / ${template.canvas.height}` }}
                            >
                                {/* Canvas border glow to distinguish content area */}
                                <div className="absolute -inset-[1px] rounded-sm ring-1 ring-blue-500/20 pointer-events-none" />
                                <CanvasPreview />
                                {/* Format badge */}
                                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-[10px] font-mono text-neutral-500 pointer-events-none backdrop-blur-sm border border-neutral-800">
                                    {template.canvas.width}×{template.canvas.height}
                                </div>
                            </div>
                        </div>

                        {/* Timeline Section */}
                        <div className="h-[320px] shrink-0 border-t border-neutral-800 bg-neutral-900 z-10">
                            <Timeline />
                        </div>
                    </>
                ) : viewMode === 'json' ? (
                    <div className="flex-1 bg-[#1e1e1e] overflow-hidden">
                        <JsonEditor />
                    </div>
                ) : null}
            </div>
        </div>
    );
}
