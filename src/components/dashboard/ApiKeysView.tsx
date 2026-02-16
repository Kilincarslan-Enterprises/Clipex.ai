'use client';

import { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Loader2, Copy, Check, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { createApiKey, listApiKeys, revokeApiKey } from '@/app/actions/api-keys';

interface ApiKeyDisplay {
    id: string;
    name: string;
    key_prefix: string;
    created_at: string;
    last_used_at?: string;
}

export default function ApiKeysView({ user }: { user: any }) {
    const [keys, setKeys] = useState<ApiKeyDisplay[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [newKeyRaw, setNewKeyRaw] = useState<string | null>(null);
    const [copiedKey, setCopiedKey] = useState(false);
    const [revokingId, setRevokingId] = useState<string | null>(null);

    useEffect(() => {
        fetchKeys();
    }, []);

    const fetchKeys = async () => {
        setLoading(true);
        const data = await listApiKeys();
        setKeys(data);
        setLoading(false);
    };

    const handleCreate = async () => {
        setCreating(true);
        const result = await createApiKey(newKeyName || 'Default Key');

        if ('error' in result) {
            alert(result.error);
        } else {
            setNewKeyRaw(result.key);
            fetchKeys();
        }
        setCreating(false);
    };

    const handleRevoke = async (id: string) => {
        if (!confirm('Diesen API Key wirklich widerrufen? Alle Anfragen mit diesem Key werden danach fehlschlagen.')) return;
        setRevokingId(id);
        const result = await revokeApiKey(id);
        if (result.success) {
            setKeys(prev => prev.filter(k => k.id !== id));
        } else {
            alert(result.error || 'Failed to revoke key');
        }
        setRevokingId(null);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
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
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-neutral-200">API Keys</h2>
                    <p className="text-sm text-neutral-500 mt-1">
                        Erstelle API Keys um Templates über HTTP Requests zu rendern.
                    </p>
                </div>
                <button
                    onClick={() => {
                        setShowCreateModal(true);
                        setNewKeyName('');
                        setNewKeyRaw(null);
                    }}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg shadow-blue-900/30"
                >
                    <Plus size={16} />
                    Neuen Key erstellen
                </button>
            </div>

            {/* ── Create Key Modal ── */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
                        {newKeyRaw ? (
                            /* ── Key Created Successfully ── */
                            <>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                        <Check className="text-emerald-400" size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-neutral-100">Key erstellt!</h3>
                                        <p className="text-xs text-neutral-500">Speichere diesen Key – er wird nie wieder angezeigt.</p>
                                    </div>
                                </div>
                                <div className="bg-neutral-950 border border-neutral-700 rounded-lg p-3 flex items-center gap-2">
                                    <code className="text-sm text-emerald-400 font-mono flex-1 break-all select-all">
                                        {newKeyRaw}
                                    </code>
                                    <button
                                        onClick={() => copyToClipboard(newKeyRaw)}
                                        className="shrink-0 p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
                                        title="Kopieren"
                                    >
                                        {copiedKey ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                                    </button>
                                </div>
                                <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                                    <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-300/80">
                                        Dieser Key wird nur einmal angezeigt. Kopiere ihn jetzt und speichere ihn sicher.
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setNewKeyRaw(null);
                                    }}
                                    className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl font-medium transition-colors"
                                >
                                    Schließen
                                </button>
                            </>
                        ) : (
                            /* ── Create Key Form ── */
                            <>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                                        <Key className="text-blue-400" size={20} />
                                    </div>
                                    <h3 className="text-lg font-bold text-neutral-100">Neuen API Key erstellen</h3>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs text-neutral-500 uppercase font-semibold">Name</label>
                                    <input
                                        type="text"
                                        value={newKeyName}
                                        onChange={(e) => setNewKeyName(e.target.value)}
                                        placeholder="z.B. Production, n8n Workflow..."
                                        className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 outline-none focus:border-blue-500 transition-colors"
                                        autoFocus
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl font-medium transition-colors"
                                    >
                                        Abbrechen
                                    </button>
                                    <button
                                        onClick={handleCreate}
                                        disabled={creating}
                                        className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                        {creating ? 'Erstelle...' : 'Erstellen'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── Keys List ── */}
            {keys.length === 0 ? (
                <div className="text-center py-20 text-neutral-500 border-2 border-dashed border-neutral-800 rounded-xl bg-neutral-900/50">
                    <Key size={48} className="mx-auto mb-4 opacity-30" />
                    <p>Keine API Keys vorhanden.</p>
                    <p className="text-sm mt-1">Erstelle deinen ersten Key, um die API zu nutzen.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {keys.map((k) => (
                        <div
                            key={k.id}
                            className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl p-4 flex items-center justify-between transition-all group"
                        >
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                    <Key size={16} className="text-blue-400" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-sm font-semibold text-neutral-200 truncate">{k.name}</h4>
                                    <div className="flex items-center gap-3 mt-0.5">
                                        <code className="text-xs text-neutral-500 font-mono">{k.key_prefix}•••••••</code>
                                        <span className="text-xs text-neutral-600">•</span>
                                        <span className="text-xs text-neutral-500">
                                            Erstellt: {new Date(k.created_at).toLocaleDateString('de-DE', {
                                                day: '2-digit', month: '2-digit', year: 'numeric'
                                            })}
                                        </span>
                                        {k.last_used_at && (
                                            <>
                                                <span className="text-xs text-neutral-600">•</span>
                                                <span className="text-xs text-neutral-500">
                                                    Zuletzt: {new Date(k.last_used_at).toLocaleDateString('de-DE', {
                                                        day: '2-digit', month: '2-digit', year: 'numeric',
                                                        hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleRevoke(k.id)}
                                disabled={revokingId === k.id}
                                className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                                title="Key widerrufen"
                            >
                                {revokingId === k.id ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Trash2 size={16} />
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Usage Example ── */}
            <div className="mt-8 bg-neutral-900/60 border border-neutral-800 rounded-xl p-5">
                <h3 className="text-sm font-bold text-neutral-300 mb-3">Beispiel: CURL Request</h3>
                <pre className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 text-xs text-neutral-400 font-mono overflow-x-auto whitespace-pre-wrap">
                    {`curl -X POST \\
  https://your-frontend.com/api/v1/render \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ck_your_api_key_here" \\
  -d '{
    "template_id": "your-template-uuid",
    "modifications": {
      "image_1.source": "https://example.com/photo.jpg",
      "image_1.duration": 3
    }
  }'`}
                </pre>
            </div>
        </div>
    );
}
