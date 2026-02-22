'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { FolderOpen, Target } from 'lucide-react';
import Link from 'next/link';

interface Project {
    id: string;
    title: string;
    type: 'project' | 'goal';
    category: 'Career' | 'Finance' | 'Health & Fitness' | 'Hobbies' | null;
    goal_year: number | null;
}

interface Task {
    id: string;
    project_id: string;
    status: 'todo' | 'in_progress' | 'done';
}

interface FocusWidgetProps {
    mode?: 'all' | 'goals' | 'projects';
}

export default function FocusWidget({ mode = 'all' }: FocusWidgetProps) {
    const [items, setItems] = useState<{ project: Project; progress: number }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            setLoading(true);
            const [pRes, tRes] = await Promise.all([
                supabase.from('projects')
                    .select('id, title, type, category, goal_year')
                    .eq('status', 'active')
                    .order('updated_at', { ascending: false }),
                supabase.from('tasks').select('project_id, status')
            ]);

            if (pRes.data) {
                const tasks = tRes.data || [];
                const calculated = pRes.data.map(p => {
                    const pTasks = tasks.filter(t => t.project_id === p.id);
                    const total = pTasks.length;
                    const completed = pTasks.filter(t => t.status === 'done').length;
                    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
                    return { project: p, progress };
                });
                setItems(calculated);
            }
            setLoading(false);
        }
        load();
    }, []);

    if (loading) return <div className="h-32 bg-surface rounded-xl animate-pulse" />;

    // Split items into sections
    const currentYear = new Date().getFullYear();
    const currentYearGoals = items
        .filter(i => i.project.type === 'goal' && i.project.goal_year === currentYear)
        .sort((a, b) => (a.project.category || '').localeCompare(b.project.category || ''));
    const activeProjects = items.filter(i => i.project.type === 'project');

    if (currentYearGoals.length === 0 && activeProjects.length === 0) return null;

    function renderCard(item: { project: Project, progress: number }) {
        const { project, progress } = item;
        const Icon = project.type === 'goal' ? Target : FolderOpen;
        const iconColor = project.type === 'project' ? 'text-blue-400' :
            project.category === 'Career' ? 'text-blue-400' :
                project.category === 'Finance' ? 'text-emerald-400' :
                    project.category === 'Health & Fitness' ? 'text-amber-400' :
                        project.category === 'Hobbies' ? 'text-purple-400' :
                            'text-purple-400';

        return (
            <Link
                key={project.id}
                href="/projects"
                className="bg-[#202022] hover:bg-[#2a2a2c] transition-colors rounded-lg p-1.5 flex flex-col justify-center gap-1 group border border-transparent hover:border-white/5 h-full min-h-[52px]"
            >
                <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <Icon size={8} className={`${iconColor} flex-shrink-0`} />
                            <span className="text-[10px] font-medium text-white/90 truncate leading-tight">
                                {project.title}
                            </span>
                        </div>
                        <span className="text-[9px] font-mono text-text-secondary opacity-60 flex-shrink-0">{progress}%</span>
                    </div>
                </div>

                <div className="h-[2px] w-full bg-white/5 rounded-full overflow-hidden mt-0.5">
                    <div
                        className={`h-full bg-gradient-to-r ${project.type === 'goal' ? 'from-amber-500/80 to-amber-400/80' : 'from-blue-500/80 to-purple-500/80'} transition-all duration-500`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </Link>
        );
    }

    // Mode: Goals Only
    if (mode === 'goals') {
        if (currentYearGoals.length === 0) return null;
        return (
            <div>
                <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2 pl-1">
                    {currentYear} Goals
                </h3>
                <div className="grid grid-cols-5 gap-4">
                    {currentYearGoals.map(renderCard)}
                </div>
            </div>
        );
    }

    // Mode: Projects Only
    if (mode === 'projects') {
        if (activeProjects.length === 0) return null;
        return (
            <div>
                <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2 pl-1">
                    Active Projects
                </h3>
                <div className="grid grid-cols-1 gap-2">
                    {activeProjects.map(renderCard)}
                </div>
            </div>
        );
    }

    // Mode: All (Default side-by-side)
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {currentYearGoals.length > 0 && (
                <div>
                    <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2 pl-1">
                        {currentYear} Goals
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                        {currentYearGoals.map(renderCard)}
                    </div>
                </div>
            )}

            {activeProjects.length > 0 && (
                <div>
                    <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2 pl-1">
                        Active Projects
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                        {activeProjects.map(renderCard)}
                    </div>
                </div>
            )}
        </div>
    );
}
