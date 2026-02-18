'use client';

import { useState, useEffect } from 'react';
import { Image as ImageIcon, X } from 'lucide-react';
import { getUserSettings, updateUserSettings } from '@/lib/settingsUtils';

export default function BannerWidget() {
    const [image, setImage] = useState<string | null>(null);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [url, setUrl] = useState('');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const settings = await getUserSettings();
        if (settings?.banner_url) setImage(settings.banner_url);
    };

    const saveImage = async (img: string | null) => {
        setImage(img);
        await updateUserSettings({ banner_url: img });
    };

    const handleUrlSubmit = async () => {
        if (!url.trim()) return;

        let finalUrl = url.trim();
        // Only attempt Drive conversion if it looks like a Google Drive link
        if (finalUrl.includes('drive.google.com')) {
            const driveRegex = /(?:[\/=d]\/|id=)([a-zA-Z0-9_-]{25,})/;
            const match = finalUrl.match(driveRegex);
            if (match && match[1]) {
                // sz=w1920 requests a large thumbnail
                finalUrl = `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1920`;
            }
        }

        await saveImage(finalUrl);
        setShowUrlInput(false);
        setUrl('');
    };

    if (image) {
        return (
            <div className="flex-1 max-w-md h-[120px]">
                <div className="relative w-full h-full group rounded-xl overflow-hidden">
                    <img
                        src={image}
                        alt="Banner"
                        className="w-full h-full object-cover object-center"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                            // Clear image if it fails to load
                            setImage(null);
                        }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                        <button
                            onClick={() => saveImage(null)}
                            className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-lg text-red-200 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 max-w-md h-[120px] flex items-center justify-center">
            {showUrlInput ? (
                <div className="w-full h-full bg-[#202022] rounded-xl p-3 flex flex-col justify-center gap-2">
                    <input
                        autoFocus
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUrlSubmit();
                            if (e.key === 'Escape') setShowUrlInput(false);
                        }}
                        placeholder="Paste image URL..."
                        className="w-full bg-[#2a2a2c] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-accent-blue"
                    />
                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={() => setShowUrlInput(false)}
                            className="text-xs text-text-secondary hover:text-white px-2 py-1"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleUrlSubmit}
                            className="text-xs bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 px-3 py-1 rounded-lg font-medium transition-colors"
                        >
                            Save
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setShowUrlInput(true)}
                    className="w-full h-full border-2 border-dashed border-white/10 hover:border-white/20 rounded-xl flex flex-col items-center justify-center gap-2 text-text-secondary hover:text-white transition-all hover:bg-white/5 group"
                >
                    <div className="p-3 rounded-full bg-white/5 group-hover:scale-110 transition-transform">
                        <ImageIcon size={24} className="opacity-50" />
                    </div>
                    <span className="text-xs font-medium uppercase tracking-wider opacity-60">Add Image URL</span>
                </button>
            )}
        </div>
    );
}
