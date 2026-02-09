'use client';

import { useStore } from '@/lib/store';
import Editor from '@monaco-editor/react';
import { useState, useEffect } from 'react';
import { Template } from '@/types';

export function JsonEditor() {
    const { template, setTemplate } = useStore();
    const [jsonText, setJsonText] = useState(JSON.stringify(template, null, 2));
    const [error, setError] = useState<string | null>(null);

    // Sync from store to local text when template changes externally
    // But we need to avoid overwriting user's in-progress typing if they are the one changing it.
    // One way is to track if the change came from this component.
    // For simplicity: We only update local text if the store template is significantly different 
    // and we are not currently focused? No, that's hard to track.
    // Let's just trust Monaco's model update for now, or just one-way sync on mount/external change.
    // Actually, if we type in the editor, we update the store.
    // If we change the store (e.g. move a block in dragging), we want the editor to update.

    useEffect(() => {
        // Only update if the parsed current text doesn't match the new template
        // This prevents re-formatting while typing if the values are logically same
        try {
            const currentParams = JSON.parse(jsonText);
            if (JSON.stringify(currentParams) !== JSON.stringify(template)) {
                setJsonText(JSON.stringify(template, null, 2));
            }
        } catch (e) {
            // If current text is invalid JSON, we definitely don't want to overwrite it 
            // unless the user explicitly reset or something.
            // But if the store updated (e.g. via drag), we probably DO want to overwrite 
            // to show the new state, even if user had syntax error? 
            // Maybe yes, maybe no. For now, let's update.
            // setJsonText(JSON.stringify(template, null, 2)); 
            // Actually if user has a syntax error, we shouldn't overwrite their work 
            // just because a background timer fired or something.
            // But here store only updates on user action.
        }
    }, [template]); // Warning: this might cause cursor jumps if we are not careful

    const handleEditorChange = (value: string | undefined) => {
        if (!value) return;
        setJsonText(value);

        try {
            const parsed = JSON.parse(value) as Template;
            // Basic schema validation
            if (parsed.canvas && parsed.timeline && Array.isArray(parsed.timeline)) {
                setError(null);
                // We avoid setTemplate if it causes a re-render that overwrites jsonText 
                // with formatted JSON while user is typing.
                // So we update the store, but the useEffect above needs to be smart.
                // The useEffect check `JSON.stringify(currentParams) !== JSON.stringify(template)` helps.
                setTemplate(parsed);
            } else {
                setError("Invalid schema: missing canvas or timeline");
            }
        } catch (e) {
            setError((e as Error).message);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#1e1e1e]">
            <div className="p-2 bg-[#252526] text-xs text-neutral-400 border-b border-[#3e3e42] flex justify-between">
                <span>template.json</span>
                {error && <span className="text-red-400">{error}</span>}
            </div>
            <div className="flex-1 overflow-hidden">
                <Editor
                    height="100%"
                    defaultLanguage="json"
                    theme="vs-dark"
                    value={jsonText}
                    onChange={handleEditorChange}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 12,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 2,
                    }}
                />
            </div>
        </div>
    );
}
