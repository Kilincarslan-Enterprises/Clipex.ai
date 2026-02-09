'use client';

import { useStore } from '@/lib/store';
import { useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { AssetsPanel } from '@/components/AssetsPanel';
import { EditorPanel } from '@/components/EditorPanel';
import { PropertiesPanel } from '@/components/PropertiesPanel';

// ... imports

export const runtime = 'edge';

export default function EditorPage() {
  const { id } = useParams();
  const { loadProject, saveProject, template, assets, placeholders } = useStore();
  const hasLoadedRef = useRef(false);

  // Load project on mount
  useEffect(() => {
    if (typeof id === 'string' && !hasLoadedRef.current) {
      loadProject(id);
      hasLoadedRef.current = true;
    }
  }, [id, loadProject]);

  // Auto-save on changes (debounced)
  useEffect(() => {
    if (!hasLoadedRef.current) return; // Don't save on initial load

    const timeoutId = setTimeout(() => {
      saveProject();
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timeoutId);
  }, [template, assets, placeholders, saveProject]);

  return (
    <main className="flex h-screen w-full bg-neutral-900 text-neutral-200 overflow-hidden font-sans">
      {/* Header / Save Status could go here */}

      {/* Left: Assets Panel */}
      <div className="w-[300px] border-r border-neutral-800 flex flex-col shrink-0 bg-neutral-900">
        <div className="h-12 border-b border-neutral-800 flex items-center justify-between px-4 font-semibold text-sm tracking-wide bg-neutral-900 sticky top-0 uppercase text-neutral-500">
          <span>Assets</span>
          <button
            onClick={() => saveProject()}
            className="text-xs bg-neutral-800 hover:bg-neutral-700 px-2 py-1 rounded normal-case text-neutral-300 transition-colors"
            title="Manual Save (Auto-saves every 2s)"
          >
            Save
          </button>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          <AssetsPanel />
        </div>
      </div>

      {/* Center: Editor / Timeline */}
      <div className="flex-1 flex flex-col min-w-0 bg-neutral-950 overflow-hidden">
        <EditorPanel />
      </div>

      {/* Right: Properties Panel */}
      <div className="w-[320px] border-l border-neutral-800 flex flex-col shrink-0 bg-neutral-900 h-full overflow-hidden">
        <PropertiesPanel />
      </div>
    </main>
  );
}
