'use client';

import { useState } from 'react';
import { Project, Task } from './ProjectsDashboard';
import { MoreHorizontal, CheckCircle2, Circle, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase-client';

interface Props {
    project: Project;
    tasks: Task[];
    onUpdateTask: (id: string, patch: Partial<Task>) => void;
    onBack: () => void;
}

export default function ProjectList({ project, tasks, onUpdateTask, onBack }: Props) {
    const todoTasks = tasks.filter(t => t.status === 'todo');
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
    const doneTasks = tasks.filter(t => t.status === 'done');

    return (
        <div className="flex flex-col h-full bg-surface/50">
            {/* Header */}
            <div className="px-6 py-6 border-b border-[#323234] flex items-center gap-3">
                <button
                    onClick={onBack}
                    className="p-1 -ml-2 text-text-secondary hover:text-white"
                >
                    <ChevronDown className="rotate-90" size={24} />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-white mb-0.5">{project.title}</h1>
                    <p className="text-text-secondary text-sm">
                        {tasks.length} tasks · {doneTasks.length} completed
                    </p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
                <TaskGroup title="In Progress" tasks={inProgressTasks} color="text-blue-400" onUpdateTask={onUpdateTask} />
                <TaskGroup title="To Do" tasks={todoTasks} color="text-text-secondary" onUpdateTask={onUpdateTask} />
                <TaskGroup title="Done" tasks={doneTasks} color="text-emerald-400" onUpdateTask={onUpdateTask} />
            </div>
        </div>
    );
}

function TaskGroup({ title, tasks, color, onUpdateTask }: { title: string; tasks: Task[]; color: string; onUpdateTask: Props['onUpdateTask'] }) {
    const [isOpen, setIsOpen] = useState(true);

    if (tasks.length === 0) return null;

    return (
        <div>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 w-full mb-3 text-sm font-semibold text-text-secondary uppercase tracking-wider"
            >
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {title} <span className="text-xs opacity-50">({tasks.length})</span>
            </button>

            {isOpen && (
                <div className="space-y-3">
                    {tasks.map(task => (
                        <MobileTaskCard key={task.id} task={task} onUpdateTask={onUpdateTask} />
                    ))}
                </div>
            )}
        </div>
    );
}

function MobileTaskCard({ task, onUpdateTask }: { task: Task; onUpdateTask: Props['onUpdateTask'] }) {
    const [menuOpen, setMenuOpen] = useState(false);

    const handleStatusChange = (status: Task['status']) => {
        onUpdateTask(task.id, { status });
        setMenuOpen(false);
    };

    return (
        <div className="bg-[#202022] border border-[#323234] rounded-xl p-4 relative active:scale-[0.99] transition-transform">
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                    <h3 className={`text-base font-medium text-white mb-1 ${task.status === 'done' ? 'line-through text-text-secondary' : ''}`}>
                        {task.title}
                    </h3>
                    {task.due_date && (
                        <div className="flex items-center gap-1.5 text-xs text-text-secondary mt-1">
                            <Clock size={12} />
                            <span>{new Date(task.due_date).toLocaleDateString()}</span>
                        </div>
                    )}
                </div>
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="p-2 -mr-2 -mt-2 text-text-secondary hover:text-white"
                >
                    <MoreHorizontal size={20} />
                </button>
            </div>

            {/* Status Dropdown */}
            {menuOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-8 z-20 w-48 bg-[#2a2a2c] border border-[#3a3a3c] rounded-xl shadow-2xl overflow-hidden py-1">
                        <div className="px-3 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wider border-b border-[#3a3a3c]">
                            Move to...
                        </div>
                        <button
                            onClick={() => handleStatusChange('todo')}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-text-secondary hover:bg-white/5 hover:text-white transition-colors"
                        >
                            <Circle size={16} /> To Do
                        </button>
                        <button
                            onClick={() => handleStatusChange('in_progress')}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-blue-400 hover:bg-white/5 hover:text-blue-300 transition-colors"
                        >
                            <Clock size={16} /> In Progress
                        </button>
                        <button
                            onClick={() => handleStatusChange('done')}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-emerald-400 hover:bg-white/5 hover:text-emerald-300 transition-colors"
                        >
                            <CheckCircle2 size={16} /> Done
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
