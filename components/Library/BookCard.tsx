'use client';

import { Book } from '@/lib/libraryUtils';
import { Star, BookOpen, ArrowUp, ArrowRight, ArrowDown } from 'lucide-react';

const priorityConfig = {
    high: { icon: ArrowUp, color: 'text-red-400', bg: 'bg-red-500/10', label: 'High' },
    medium: { icon: ArrowRight, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Med' },
    low: { icon: ArrowDown, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Low' },
};

const statusColors: Record<string, string> = {
    'to-read': 'bg-slate-500',
    'reading': 'bg-blue-500',
    'finished': 'bg-emerald-500',
};

interface BookCardProps {
    book: Book;
    onClick: () => void;
}

export default function BookCard({ book, onClick }: BookCardProps) {
    const priority = priorityConfig[book.priority] || priorityConfig.medium;
    const PriorityIcon = priority.icon;

    return (
        <button
            onClick={onClick}
            className="group w-full text-left bg-[#1a1a1c] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-all hover:scale-[1.02] active:scale-[0.98] focus:outline-none"
        >
            {/* Cover */}
            <div className="relative aspect-[2/3] bg-gradient-to-br from-white/5 to-white/[0.02] overflow-hidden">
                {book.cover_url ? (
                    <img
                        src={book.cover_url}
                        alt={book.title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <BookOpen size={40} className="text-white/10" />
                    </div>
                )}
                {/* Status dot */}
                <div className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full ${statusColors[book.status]} ring-2 ring-black/50`} />
                {/* Priority badge */}
                <div className={`absolute top-2 left-2 ${priority.bg} backdrop-blur-sm rounded-lg px-1.5 py-0.5 flex items-center gap-1`}>
                    <PriorityIcon size={10} className={priority.color} />
                    <span className={`text-[9px] font-bold ${priority.color}`}>{priority.label}</span>
                </div>
            </div>

            {/* Info */}
            <div className="p-3">
                <h3 className="text-sm font-semibold text-white truncate group-hover:text-emerald-400 transition-colors">
                    {book.title}
                </h3>
                {book.author && (
                    <p className="text-xs text-text-secondary mt-0.5 truncate">{book.author}</p>
                )}
                {book.rating && (
                    <div className="flex items-center gap-0.5 mt-1.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                                key={i}
                                size={10}
                                className={i < book.rating! ? 'text-amber-400 fill-amber-400' : 'text-white/10'}
                            />
                        ))}
                    </div>
                )}
            </div>
        </button>
    );
}
