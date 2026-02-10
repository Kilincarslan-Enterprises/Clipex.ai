'use client';

import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, Plus, Film } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
    const router = useRouter();
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Error fetching projects:', error);
        } else {
            setProjects(data || []);
        }
        setLoading(false);
    };

    const handleCreateNew = async () => {
        setCreating(true);
        const newId = uuidv4();
        const newProject = {
            id: newId,
            name: `Untitled Project ${new Date().toLocaleTimeString()}`,
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

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans p-8">
            <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-10">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        Clipex.ai
                    </h1>
                    <button
                        onClick={handleCreateNew}
                        disabled={creating}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-medium flex items-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
                    >
                        {creating ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                        New Project
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="animate-spin text-neutral-600" size={32} />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {projects.length === 0 ? (
                            <div className="col-span-full text-center py-20 text-neutral-500 border-2 border-dashed border-neutral-800 rounded-xl">
                                <p>No projects yet. Create one to get started!</p>
                            </div>
                        ) : (
                            projects.map((project) => (
                                <div
                                    key={project.id}
                                    onClick={() => router.push(`/editor/${project.id}`)}
                                    className="group bg-neutral-900 border border-neutral-800 hover:border-blue-500/50 rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:shadow-blue-900/10 hover:-translate-y-1"
                                >
                                    {/* Preview Placeholder */}
                                    <div className="aspect-[9/16] bg-neutral-950 flex items-center justify-center relative overflow-hidden">
                                        <Film className="text-neutral-800 w-16 h-16 group-hover:text-neutral-700 transition-colors" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 to-transparent opacity-50" />
                                    </div>

                                    <div className="p-4">
                                        <h3 className="font-semibold text-neutral-200 truncate group-hover:text-blue-400 transition-colors">
                                            {project.name}
                                        </h3>
                                        <p className="text-xs text-neutral-500 mt-1">
                                            Edited {new Date(project.updated_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
