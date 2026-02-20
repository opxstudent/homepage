'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    // Default to collapsed or expanded? "Clean" usually suggests maybe collapsed or just standard. 
    // Let's default to expanded but allow toggle.
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();

    const isLogin = pathname === '/login';

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
            {!isLogin && <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />}
            {!isLogin && <MobileNav />}
            <main
                className={`min-h-screen transition-all duration-300 
                    ${!isLogin ? 'pl-0 pb-24 md:pb-0' : 'p-0 w-full'} 
                    ${!isLogin ? (isCollapsed ? 'md:pl-[80px]' : 'md:pl-[220px]') : ''}`
                }
            >
                {children}
            </main>
        </>
    );
}
