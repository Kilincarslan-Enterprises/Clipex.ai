'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, LogOut } from 'lucide-react';
import Dashboard from '@/components/dashboard/Dashboard';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }
            setUser(user);
            setLoading(false);
        };
        checkUser();
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    const handleOpenEditor = (projectId: string) => {
        router.push(`/editor/${projectId}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <Loader2 className="animate-spin text-neutral-600" size={40} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
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
                    </div>
                </div>

                {/* Dashboard */}
                <Dashboard user={user} onOpenEditor={handleOpenEditor} />
            </div>
        </div>
    );
}
