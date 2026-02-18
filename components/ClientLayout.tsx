'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    // Default to collapsed or expanded? "Clean" usually suggests maybe collapsed or just standard. 
    // Let's default to expanded but allow toggle.
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Optional: Persist state
    useEffect(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        if (saved) {
            setIsCollapsed(saved === 'true');
        }
    }, []);

    const toggleSidebar = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem('sidebarCollapsed', String(newState));
    };

    return (
        <>
            <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
            <MobileNav />
            <main
                className={`min-h-screen transition-all duration-300 
                    pl-0 pb-24 md:pb-0 
                    ${isCollapsed ? 'md:pl-[80px]' : 'md:pl-[220px]'}`
                }
            >
                {children}
            </main>
        </>
    );
}
