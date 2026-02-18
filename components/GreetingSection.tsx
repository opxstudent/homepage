'use client';

import { useState, useEffect } from 'react';
import { Edit2, Check } from 'lucide-react';
import Clock from './Clock';
import { getUserSettings, updateUserSettings } from '@/lib/settingsUtils';

export default function GreetingSection() {
    const [name, setName] = useState('OPX');
    const [isEditing, setIsEditing] = useState(false);
    const [greeting, setGreeting] = useState('');
    const [dateString, setDateString] = useState('');

    useEffect(() => {
        loadSettings();

        const updateTime = () => {
            const now = new Date();
            const hour = now.getHours();
            let newGreeting = 'Good evening';
            if (hour < 12) newGreeting = 'Good morning';
            else if (hour < 18) newGreeting = 'Good afternoon';
            setGreeting(newGreeting);

            setDateString(now.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }));
        };

        updateTime();
        const timer = setInterval(updateTime, 60000);
        return () => clearInterval(timer);
    }, []);

    const loadSettings = async () => {
        const settings = await getUserSettings();
        if (settings?.user_name) setName(settings.user_name);
    };

    const handleSave = async () => {
        setIsEditing(false);
        await updateUserSettings({ user_name: name });
    };

    return (
        <div className="flex-1 min-w-[280px]">
            <div className="flex items-center gap-3 mb-2 group">
                <h1 className="text-4xl font-bold text-white whitespace-nowrap">
                    {greeting},
                </h1>
                {isEditing ? (
                    <div className="flex items-center gap-2">
                        <input
                            autoFocus
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                            onBlur={handleSave}
                            className="bg-transparent text-4xl font-bold text-accent-blue focus:outline-none border-b-2 border-accent-blue w-[150px]"
                        />
                        <button onClick={handleSave} className="p-1 hover:bg-white/10 rounded-full text-emerald-400">
                            <Check size={24} />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <span className="text-4xl font-bold text-accent-blue truncate max-w-[200px]">
                            {name}
                        </span>
                        <button
                            onClick={() => setIsEditing(true)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-white/10 rounded-lg text-text-secondary hover:text-white"
                        >
                            <Edit2 size={16} />
                        </button>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3 text-text-secondary text-lg">
                <span>{dateString}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                <Clock />
            </div>
        </div>
    );
}
