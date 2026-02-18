'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CheckSquare, FolderKanban, Dumbbell } from 'lucide-react';

const navItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Habits', href: '/habits', icon: CheckSquare },
    { name: 'Projects', href: '/projects', icon: FolderKanban },
    { name: 'Fitness', href: '/fitness', icon: Dumbbell },
];

export default function MobileNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 w-full h-16 bg-[#050505] border-t border-[#2A2A2A] z-50 flex md:hidden justify-around items-center px-2">
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                    <Link
                        key={item.name}
                        href={item.href}
                        className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-[#EDEDED]' : 'text-[#A1A1A1]'
                            }`}
                    >
                        <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                        {/* Optional: Add label if needed, but usually icon-only is cleaner for bottom nav unless specified */}
                    </Link>
                );
            })}
        </nav>
    );
}
