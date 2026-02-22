'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trash2, CheckCircle2 } from 'lucide-react';
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

        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            const { error } = await supabase
                .from('quick_notes')
                .upsert({ user_id: user.id, id: 'scratchpad', content: text });

            if (error) {
                console.error('Error saving scratchpad:', error);
            }
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

    const handleClear = async () => {
        if (confirm('Clear all notes?')) {
            setContent('');
            saveScratchpad('');
        }
    };

    return (
        <div className="bg-[#1E1E1E] rounded-xl p-4 flex flex-col border border-white/5 h-full min-h-0">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em]">Inbox: Quick Notes</h3>
                </div>
                <div className="flex items-center gap-3">
                    {isSaving && (
                        <div className="flex items-center gap-1.5 animate-pulse">
                            <div className="w-1 h-1 rounded-full bg-blue-400" />
                            <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Syncing</span>
                        </div>
                    )}
                    <button
                        onClick={handleClear}
                        className="p-1 text-text-secondary hover:text-red-400 transition-colors"
                        title="Clear Notes"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
            <textarea
                value={content}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Type to capture... (Auto-saves)"
                className="flex-1 bg-white/[0.02] rounded-lg p-4 text-sm text-text-primary placeholder:text-text-secondary/30 resize-none focus:outline-none border border-transparent focus:border-white/5 transition-all font-medium leading-relaxed custom-scrollbar"
            />
        </div>
    );
}
