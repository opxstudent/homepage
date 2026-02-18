'use client';

import { useState, useEffect } from 'react';
import { Image as ImageIcon, X } from 'lucide-react';
import { getUserSettings, updateUserSettings, UserSettings } from '@/lib/settingsUtils';

interface SidebarImageProps {
    settingKey: keyof UserSettings;
    aspectRatio?: string;
    label?: string;
}

export default function SidebarImage({
    settingKey,
    aspectRatio = 'aspect-[2/3]',
    label = 'Image'
}: SidebarImageProps) {
    const [image, setImage] = useState<string | null>(null);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [url, setUrl] = useState('');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const settings = await getUserSettings();
        if (settings && settings[settingKey]) {
            setImage(settings[settingKey] as string);
        }
    };

    const saveImage = async (img: string | null) => {
        setImage(img);
        await updateUserSettings({ [settingKey]: img });
    };

    const handleUrlSubmit = async () => {
        if (!url.trim()) return;

        let finalUrl = url.trim();
        // Only attempt Drive conversion if it looks like a Google Drive link
        if (finalUrl.includes('drive.google.com')) {
            const driveRegex = /(?:[\/=d]\/|id=)([a-zA-Z0-9_-]{25,})/;
            const match = finalUrl.match(driveRegex);
            if (match && match[1]) {
                finalUrl = `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
            }
        }

        await saveImage(finalUrl);
        setShowUrlInput(false);
        setUrl('');
    };

    if (image) {
        return (
            <div className="px-3">
                <div className={`relative w-full ${aspectRatio} group rounded-2xl overflow-hidden border border-white/5 shadow-2xl`}>
                    <img
                        src={image}
                        alt="Sidebar"
                        className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                            console.error('Sidebar image load error:', image);
                        }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                        <button
                            onClick={() => saveImage(null)}
                            className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-lg text-red-200 transition-colors"
                            title="Remove image"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="px-3">
            {showUrlInput ? (
                <div className={`w-full ${aspectRatio} bg-active rounded-2xl p-4 flex flex-col justify-center gap-3 border border-white/5`}>
                    <input
                        autoFocus
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUrlSubmit();
                            if (e.key === 'Escape') setShowUrlInput(false);
                        }}
                        placeholder="Paste image URL..."
                        className="w-full bg-surface border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent-blue"
                    />
                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={() => setShowUrlInput(false)}
                            className="text-[10px] text-text-secondary hover:text-white px-2 py-1"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleUrlSubmit}
                            className="text-[10px] bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30 px-3 py-1.5 rounded-lg font-bold transition-all"
                        >
                            Save
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setShowUrlInput(true)}
                    className={`w-full ${aspectRatio} border-2 border-dashed border-white/5 hover:border-white/20 rounded-2xl flex flex-col items-center justify-center gap-3 text-text-secondary hover:text-white transition-all hover:bg-white/[0.02] group`}
                >
                    <div className="p-4 rounded-full bg-white/5 group-hover:scale-110 transition-transform">
                        <ImageIcon size={24} className="opacity-40" />
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Add Sidebar</span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">{label}</span>
                    </div>
                </button>
            )}
        </div>
    );
}
