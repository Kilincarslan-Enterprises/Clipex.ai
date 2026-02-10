'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, Plus, Film, Trash2, LogOut } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
    const router = useRouter();
    const supabase = createClient();
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }
            setUser(user);
            fetchProjects(user.id);
        };
        checkUser();
    }, []);

    const fetchProjects = async (userId: string) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Error fetching projects:', error);
        } else {
            setProjects(data || []);
        }
        setLoading(false);
    };

    const handleCreateNew = async () => {
        if (!user) return;
        setCreating(true);
        const newId = uuidv4();
        const newProject = {
            id: newId,
            name: `Untitled Project ${new Date().toLocaleTimeString()}`,
            user_id: user.id,
            data: {
                canvas: { width: 1080, height: 1920, fps: 30 },
                timeline: []
            }
        };

        const { error } = await supabase
            .from('projects')
            .insert(newProject);

        if (error) {
            console.error("Error creating project:", error);
            alert("Failed to create project");
            setCreating(false);
        } else {
            router.push(`/editor/${newId}`);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this project?')) return;

        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("Error deleting project:", error);
            alert("Failed to delete project");
        } else {
            setProjects(projects.filter(p => p.id !== id));
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-10 border-b border-neutral-800 pb-6">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        Clipex.ai
                    </h1>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-neutral-500 hidden sm:inline-block">
                            {user?.email}
                        </span>
                        <button
                            onClick={handleSignOut}
                            className="text-neutral-400 hover:text-white transition-colors"
                            title="Sign Out"
                        >
                            <LogOut size={20} />
                        </button>
                        <button
                            onClick={handleCreateNew}
                            disabled={creating}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-medium flex items-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20 ml-2"
                        >
                            {creating ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                            New Project
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="animate-spin text-neutral-600" size={32} />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {projects.length === 0 ? (
                            <div className="col-span-full text-center py-20 text-neutral-500 border-2 border-dashed border-neutral-800 rounded-xl bg-neutral-900/50">
                                <p>No projects yet. Create one to get started!</p>
                            </div>
                        ) : (
                            projects.map((project) => (
                                <div
                                    key={project.id}
                                    onClick={() => router.push(`/editor/${project.id}`)}
                                    className="group bg-neutral-900 border border-neutral-800 hover:border-blue-500/50 rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:shadow-blue-900/10 hover:-translate-y-1 relative"
                                >
                                    {/* Preview Placeholder */}
                                    <div className="aspect-[9/16] bg-neutral-950 flex items-center justify-center relative overflow-hidden">
                                        <Film className="text-neutral-800 w-16 h-16 group-hover:text-neutral-700 transition-colors" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 to-transparent opacity-50" />
                                    </div>

                                    <div className="p-4">
                                        <h3 className="font-semibold text-neutral-200 truncate group-hover:text-blue-400 transition-colors pr-6">
                                            {project.name}
                                        </h3>
                                        <p className="text-xs text-neutral-500 mt-1">
                                            Edited {new Date(project.updated_at).toLocaleDateString()}
                                        </p>
                                    </div>

                                    <button
                                        onClick={(e) => handleDelete(project.id, e)}
                                        className="absolute top-2 right-2 p-2 bg-neutral-900/80 hover:bg-red-900/80 text-neutral-400 hover:text-white rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
                                        title="Delete Project"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
