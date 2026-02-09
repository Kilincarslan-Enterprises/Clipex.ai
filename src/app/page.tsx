'use client';

import { useStore } from '@/lib/store';
import { AssetsPanel } from '@/components/AssetsPanel';
import { EditorPanel } from '@/components/EditorPanel';
import { PropertiesPanel } from '@/components/PropertiesPanel';

export default function Home() {
  return (
    <main className="flex h-screen w-full bg-neutral-900 text-neutral-200 overflow-hidden font-sans">
      {/* Left: Assets Panel */}
      <div className="w-[300px] border-r border-neutral-800 flex flex-col shrink-0 bg-neutral-900">
        <div className="h-12 border-b border-neutral-800 flex items-center px-4 font-semibold text-sm tracking-wide bg-neutral-900 sticky top-0 uppercase text-neutral-500">
          Assets
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
