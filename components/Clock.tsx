'use client';

import { useState, useEffect } from 'react';

export default function Clock() {
    const [time, setTime] = useState<string | null>(null);

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setTime(now.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            }));
        };

        updateTime();
        const timer = setInterval(updateTime, 1000);
        return () => clearInterval(timer);
    }, []);

    if (!time) return null;

    return <span>{time}</span>;
}
