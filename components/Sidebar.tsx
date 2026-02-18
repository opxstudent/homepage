'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CheckSquare, FolderKanban, Dumbbell, ChevronLeft, ChevronRight } from 'lucide-react';

const navItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Habits', href: '/habits', icon: CheckSquare },
    { name: 'Projects', href: '/projects', icon: FolderKanban },
    { name: 'Fitness', href: '/fitness', icon: Dumbbell },
];

interface SidebarProps {
    isCollapsed: boolean;
    toggleSidebar: () => void;
}

export default function Sidebar({ isCollapsed, toggleSidebar }: SidebarProps) {
    const pathname = usePathname();

    return (
        <aside
            className={`fixed left-0 top-0 h-screen bg-surface/95 backdrop-blur-md border-r border-border hidden md:flex flex-col transition-all duration-300 ${isCollapsed ? 'w-[80px]' : 'w-[220px]'
                }`}
        >
            <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                {/* Logo Area */}
                {!isCollapsed && <span className="font-bold text-xl tracking-tight">Dashboard</span>}

                <button
                    onClick={toggleSidebar}
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    className={`p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors ${isCollapsed ? '' : ''}`}
                >
                    {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            <nav className="px-3 flex-1">
                <ul className="space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;

                        return (
                            <li key={item.name}>
                                <Link
                                    href={item.href}
                                    title={isCollapsed ? item.name : ''}
                                    className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl
                    transition-all duration-200
                    ${isActive
                                            ? 'bg-active text-text-primary font-medium'
                                            : 'text-text-secondary hover:bg-active hover:text-text-primary'
                                        }
                    ${isCollapsed ? 'justify-center' : ''}
                  `}
                                >
                                    <Icon size={20} />
                                    {!isCollapsed && <span className="text-sm transition-opacity duration-200">{item.name}</span>}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </aside>
    );
}
