'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { RenderRow } from '@/types/db';
import {
    LayoutTemplate, ScrollText, Plus, Pencil, Check, X, Trash2,
    Film, Loader2, Download, ChevronDown, ChevronUp, Clock,
    CheckCircle2, XCircle, AlertCircle, ExternalLink, Copy, Key
} from 'lucide-react';
import ApiKeysView from './ApiKeysView';

// Using ProjectRow structure but calling them "Templates" in UI
interface ProjectRow {
    id: string;
    name: string;
    data: any;
    user_id?: string;
    created_at: string;
    updated_at: string;
}

// ═══════════════════════════════════════════════════════════
// Templates Tab (Uses 'projects' table)
// ═══════════════════════════════════════════════════════════
function TemplatesView({
    user,
    onOpenEditor,
}: {
    user: any;
    onOpenEditor: (projectId: string) => void;
}) {
    const supabase = createClient();
    const [projects, setProjects] = useState<ProjectRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const editRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchProjects();
    }, []);

    useEffect(() => {
        if (editingId && editRef.current) {
            editRef.current.focus();
            editRef.current.select();
        }
    }, [editingId]);

    const fetchProjects = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order('updated_at', { ascending: false });

        if (!error) setProjects(data || []);
        setLoading(false);
    };

    const handleCreate = async () => {
        if (!user) return;
        setCreating(true);

        const { data, error } = await supabase
            .from('projects')
            .insert({
                name: `Template ${new Date().toLocaleTimeString()}`,
                user_id: user.id,
                data: {
                    canvas: { width: 1080, height: 1920, fps: 30 },
                    timeline: [],
                    assets: [],
                    placeholders: {}
                },
            })
            .select()
            .single();

        if (!error && data) {
            onOpenEditor(data.id);
        }
        setCreating(false);
    };

    const handleRename = async (id: string) => {
        if (!editName.trim()) return;
        const { error } = await supabase
            .from('projects')
            .update({ name: editName.trim(), updated_at: new Date().toISOString() })
            .eq('id', id);

        if (!error) {
            setProjects((prev) =>
                prev.map((p) => (p.id === id ? { ...p, name: editName.trim() } : p))
            );
        }
        setEditingId(null);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this template?')) return;
        const { error } = await supabase.from('projects').delete().eq('id', id);
        if (!error) {
            setProjects((prev) => prev.filter((p) => p.id !== id));
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-neutral-600" size={32} />
            </div>
        );
    }

    return (
        <div>
            {/* Create Button */}
            <div className="mb-6">
                <button
                    onClick={handleCreate}
                    disabled={creating}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-blue-900/30"
                >
                    {creating ? (
                        <Loader2 className="animate-spin" size={18} />
                    ) : (
                        <Plus size={18} />
                    )}
                    Neues Template erstellen
                </button>
            </div>

            {projects.length === 0 ? (
                <div className="text-center py-20 text-neutral-500 border-2 border-dashed border-neutral-800 rounded-xl bg-neutral-900/50">
                    <LayoutTemplate size={48} className="mx-auto mb-4 opacity-30" />
                    <p>Noch keine Templates vorhanden.</p>
                    <p className="text-sm mt-1">
                        Erstelle dein erstes Template, um loszulegen!
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                    {projects.map((proj) => (
                        <div
                            key={proj.id}
                            className="group bg-neutral-900 border border-neutral-800 hover:border-blue-500/50 rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:shadow-blue-900/10 hover:-translate-y-1 relative"
                        >
                            {/* Preview Placeholder */}
                            <div
                                onClick={() => onOpenEditor(proj.id)}
                                className="aspect-[9/16] bg-neutral-950 flex items-center justify-center relative overflow-hidden"
                            >
                                <Film className="text-neutral-800 w-14 h-14 group-hover:text-neutral-700 transition-colors" />
                                <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 to-transparent opacity-50" />
                            </div>

                            <div className="p-4">
                                {editingId === proj.id ? (
                                    <div className="flex items-center gap-1">
                                        <input
                                            ref={editRef}
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleRename(proj.id);
                                                if (e.key === 'Escape') setEditingId(null);
                                            }}
                                            className="flex-1 bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm text-neutral-200 outline-none focus:border-blue-500"
                                        />
                                        <button
                                            onClick={() => handleRename(proj.id)}
                                            className="p-1 text-green-400 hover:text-green-300"
                                        >
                                            <Check size={16} />
                                        </button>
                                        <button
                                            onClick={() => setEditingId(null)}
                                            className="p-1 text-neutral-400 hover:text-neutral-300"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <h3
                                        onClick={() => onOpenEditor(proj.id)}
                                        className="font-semibold text-neutral-200 truncate group-hover:text-blue-400 transition-colors pr-14"
                                    >
                                        {proj.name}
                                    </h3>
                                )}
                                <p className="text-xs text-neutral-500 mt-1">
                                    {new Date(proj.updated_at).toLocaleDateString('de-DE', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </p>
                            </div>

                            {/* Action buttons */}
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingId(proj.id);
                                        setEditName(proj.name);
                                    }}
                                    className="p-2 bg-neutral-900/80 hover:bg-blue-900/80 text-neutral-400 hover:text-white rounded-full"
                                    title="Umbenennen"
                                >
                                    <Pencil size={14} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(proj.id);
                                    }}
                                    className="p-2 bg-neutral-900/80 hover:bg-red-900/80 text-neutral-400 hover:text-white rounded-full"
                                    title="Löschen"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
// Logs Tab
// ═══════════════════════════════════════════════════════════
function LogsView({ user }: { user: any }) {
    const supabase = createClient();
    const [renders, setRenders] = useState<RenderRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [downloading, setDownloading] = useState<string | null>(null);

    useEffect(() => {
        fetchRenders();
    }, []);

    const fetchRenders = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('renders')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error) setRenders(data || []);
        setLoading(false);
    };

    const statusConfig: Record<
        string,
        { icon: React.ReactNode; color: string; bg: string; label: string }
    > = {
        completed: {
            icon: <CheckCircle2 size={16} />,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10 border-emerald-500/20',
            label: 'Success',
        },
        failed: {
            icon: <XCircle size={16} />,
            color: 'text-red-400',
            bg: 'bg-red-500/10 border-red-500/20',
            label: 'Failed',
        },
        processing: {
            icon: <Loader2 size={16} className="animate-spin" />,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10 border-amber-500/20',
            label: 'Processing',
        },
        pending: {
            icon: <Clock size={16} />,
            color: 'text-neutral-400',
            bg: 'bg-neutral-500/10 border-neutral-500/20',
            label: 'Pending',
        },
    };

    // Force Download Helper
    const handleDownload = async (url: string, filename?: string) => {
        if (!url) return;

        try {
            setDownloading(url);
            const renderApiUrl = process.env.NEXT_PUBLIC_RENDER_API_URL || '';
            const fullUrl = url.startsWith('http') ? url : `${renderApiUrl}${url}`;

            // Try fetching effectively acting as a proxy download
            const response = await fetch(fullUrl);
            if (!response.ok) throw new Error('Download failed');

            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename || url.split('/').pop() || 'render.mp4';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);

        } catch (e) {
            console.error("Download failed, falling back to new tab", e);
            // Fallback
            const renderApiUrl = process.env.NEXT_PUBLIC_RENDER_API_URL || '';
            const fullUrl = url.startsWith('http') ? url : `${renderApiUrl}${url}`;
            window.open(fullUrl, '_blank');
        } finally {
            setDownloading(null);
        }
    };


    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-neutral-600" size={32} />
            </div>
        );
    }

    if (renders.length === 0) {
        return (
            <div className="text-center py-20 text-neutral-500 border-2 border-dashed border-neutral-800 rounded-xl bg-neutral-900/50">
                <ScrollText size={48} className="mx-auto mb-4 opacity-30" />
                <p>Noch keine Render-Logs vorhanden.</p>
                <p className="text-sm mt-1">Render-Outputs werden hier angezeigt.</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {/* Header Row */}
            <div className="grid grid-cols-[1fr_100px_160px_110px_50px] gap-3 px-4 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider border-b border-neutral-800">
                <span>Account : Render ID</span>
                <span>Resolution</span>
                <span>Created</span>
                <span>Status</span>
                <span></span>
            </div>

            {renders.map((render) => {
                const sc = statusConfig[render.status] || statusConfig.pending;
                const isExpanded = expandedId === render.id;
                const isDownloading = downloading === render.output_url;

                return (
                    <div key={render.id}>
                        {/* Row */}
                        <div
                            onClick={() =>
                                setExpandedId(isExpanded ? null : render.id)
                            }
                            className={`grid grid-cols-[1fr_100px_160px_110px_50px] gap-3 items-center px-4 py-3 rounded-lg cursor-pointer transition-all 
                                ${isExpanded
                                    ? 'bg-neutral-800/80 border border-neutral-700'
                                    : 'bg-neutral-900/60 hover:bg-neutral-800/50 border border-transparent hover:border-neutral-800'
                                }`}
                        >
                            {/* Account : Render ID */}
                            <div className="flex items-center gap-2 min-w-0">
                                <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${render.source === 'api'
                                        ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                                        : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                                        }`}
                                >
                                    {render.source}
                                </span>
                                <span className="text-sm font-mono text-neutral-300 truncate">
                                    {render.render_job_id || render.id.slice(0, 8)}
                                </span>
                            </div>

                            {/* Resolution */}
                            <span className="text-sm text-neutral-400">
                                {render.resolution || '—'}
                            </span>

                            {/* Created */}
                            <span className="text-sm text-neutral-400">
                                {new Date(render.created_at).toLocaleDateString('de-DE', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </span>

                            {/* Status */}
                            <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${sc.bg} ${sc.color}`}
                            >
                                {sc.icon}
                                {sc.label}
                            </span>

                            {/* Expand icon */}
                            <span className="text-neutral-500">
                                {isExpanded ? (
                                    <ChevronUp size={16} />
                                ) : (
                                    <ChevronDown size={16} />
                                )}
                            </span>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                            <div className="ml-4 mr-4 mb-2 mt-1 p-4 bg-neutral-900/80 border border-neutral-800 rounded-lg space-y-3 animate-in slide-in-from-top-2">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-neutral-500 block text-xs mb-1">
                                            Render ID (Full)
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <code className="text-neutral-300 font-mono text-xs bg-neutral-800 px-2 py-1 rounded">
                                                {render.id}
                                            </code>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    copyToClipboard(render.id);
                                                }}
                                                className="text-neutral-500 hover:text-neutral-300"
                                                title="Kopieren"
                                            >
                                                <Copy size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 block text-xs mb-1">
                                            Job ID
                                        </span>
                                        <code className="text-neutral-300 font-mono text-xs bg-neutral-800 px-2 py-1 rounded">
                                            {render.render_job_id || '—'}
                                        </code>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 block text-xs mb-1">
                                            Source
                                        </span>
                                        <span className="text-neutral-300">
                                            {render.source === 'api' ? 'API Request' : 'UI (Editor)'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 block text-xs mb-1">
                                            Template ID
                                        </span>
                                        <code className="text-neutral-300 font-mono text-xs bg-neutral-800 px-2 py-1 rounded">
                                            {render.template_id || '—'}
                                        </code>
                                    </div>
                                    {render.resolution && (
                                        <div>
                                            <span className="text-neutral-500 block text-xs mb-1">
                                                Resolution
                                            </span>
                                            <span className="text-neutral-300">
                                                {render.resolution}
                                            </span>
                                        </div>
                                    )}
                                    <div>
                                        <span className="text-neutral-500 block text-xs mb-1">
                                            Created
                                        </span>
                                        <span className="text-neutral-300">
                                            {new Date(render.created_at).toLocaleString('de-DE')}
                                        </span>
                                    </div>
                                </div>

                                {/* Error Message */}
                                {render.error_message && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
                                        <AlertCircle
                                            size={16}
                                            className="text-red-400 flex-shrink-0 mt-0.5"
                                        />
                                        <div>
                                            <span className="text-xs text-red-400 font-semibold block mb-1">
                                                Error
                                            </span>
                                            <p className="text-sm text-red-300/80 font-mono">
                                                {render.error_message}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Metadata */}
                                {render.metadata && Object.keys(render.metadata).length > 0 && (
                                    <div>
                                        <span className="text-neutral-500 text-xs block mb-1">
                                            Metadata
                                        </span>
                                        <pre className="text-xs text-neutral-400 bg-neutral-800 rounded p-2 overflow-x-auto">
                                            {JSON.stringify(render.metadata, null, 2)}
                                        </pre>
                                    </div>
                                )}

                                {/* Download / View Output */}
                                {render.output_url && (
                                    <div className="flex items-center gap-3 pt-2 border-t border-neutral-800">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDownload(render.output_url!, `render_${render.render_job_id}.mp4`);
                                            }}
                                            disabled={isDownloading}
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-50"
                                        >
                                            {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                            {isDownloading ? 'Lade herunter...' : 'Download Output'}
                                        </button>
                                        <a
                                            href={
                                                render.output_url.startsWith('http')
                                                    ? render.output_url
                                                    : `${process.env.NEXT_PUBLIC_RENDER_API_URL || ''}${render.output_url}`
                                            }
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm rounded-lg font-medium transition-colors"
                                        >
                                            <ExternalLink size={14} />
                                            Im Browser öffnen
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
// Dashboard Component (Main Export)
// ═══════════════════════════════════════════════════════════
export type DashboardTab = 'templates' | 'logs' | 'api';

export default function Dashboard({
    user,
    onOpenEditor,
}: {
    user: any;
    onOpenEditor: (projectId: string) => void;
}) {
    const [activeTab, setActiveTab] = useState<DashboardTab>('templates');

    const tabs: { id: DashboardTab; label: string; icon: React.ReactNode }[] = [
        { id: 'templates', label: 'Templates', icon: <LayoutTemplate size={18} /> },
        { id: 'logs', label: 'Logs', icon: <ScrollText size={18} /> },
        { id: 'api', label: 'API Keys', icon: <Key size={18} /> },
    ];

    return (
        <div>
            {/* Tab Navigation */}
            <div className="flex items-center gap-1 mb-8 bg-neutral-900/60 p-1 rounded-xl border border-neutral-800 w-fit">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all
                            ${activeTab === tab.id
                                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-900/30'
                                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {activeTab === 'templates' && (
                <TemplatesView user={user} onOpenEditor={onOpenEditor} />
            )}
            {activeTab === 'logs' && <LogsView user={user} />}
            {activeTab === 'api' && <ApiKeysView user={user} />}
        </div>
    );
}
