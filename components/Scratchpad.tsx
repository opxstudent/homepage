'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';

export default function Scratchpad() {
    const [content, setContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

    // Fetch scratchpad content on mount
    useEffect(() => {
        async function fetchScratchpad() {
            const { data, error } = await supabase
                .from('quick_notes')
                .select('content')
                .eq('id', 'scratchpad')
                .single();

            if (data) {
                setContent(data.content || '');
            }
        }
        fetchScratchpad();
    }, []);

    // Auto-save with debounce
    const saveScratchpad = useCallback(async (text: string) => {
        setIsSaving(true);

        const { error } = await supabase
            .from('quick_notes')
            .upsert({ id: 'scratchpad', content: text });

        if (error) {
            console.error('Error saving scratchpad:', error);
        }

        setIsSaving(false);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        setContent(newContent);

        // Clear existing timeout
        if (saveTimeout) clearTimeout(saveTimeout);

        // Set new timeout for auto-save
        const timeout = setTimeout(() => {
            saveScratchpad(newContent);
        }, 1000);

        setSaveTimeout(timeout);
    };

    const handleBlur = () => {
        // Save immediately on blur
        if (saveTimeout) clearTimeout(saveTimeout);
        saveScratchpad(content);
    };

    return (
        <div className="bg-surface rounded-xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Quick Notes</h3>
                {isSaving && (
                    <span className="text-xs text-text-secondary">Saving...</span>
                )}
            </div>
            <textarea
                value={content}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Jot down your thoughts..."
                className="bg-active rounded-lg p-3 text-text-primary placeholder:text-text-secondary resize-none focus:outline-none focus:ring-2 focus:ring-accent-blue/50 transition-all"
                style={{ height: '160px' }}
            />
        </div>
    );
}
