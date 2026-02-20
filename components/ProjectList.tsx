'use client';

import React, { useState, Fragment } from 'react';
import { Project, Task } from './ProjectsDashboard';
import { MoreHorizontal, CheckCircle2, Circle, Clock, ChevronDown, ChevronRight, Edit2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase-client';

import { Plus } from 'lucide-react';

interface Props {
    project: Project;
    tasks: Task[];
    onUpdateTask: (id: string, patch: Partial<Task>) => void;
    onAddTask: (status: Task['status'], title: string, dueDate: string | null) => void;
    onBack: () => void;
}

export default function ProjectList({ project, tasks, onUpdateTask, onAddTask, onBack }: Props) {
    const todoTasks = tasks.filter(t => t.status === 'todo');
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
    const doneTasks = tasks.filter(t => t.status === 'done');
    const [isAdding, setIsAdding] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDue, setNewDue] = useState('');

    const handleAddTask = () => {
        if (!newTitle.trim()) return;
        onAddTask('todo', newTitle.trim(), newDue || null);
        setNewTitle('');
        setNewDue('');
        setIsAdding(false);
    };

    return (
        <div className="flex flex-col h-full bg-surface/50">
            {/* Header */}
            <div className="px-6 py-6 border-b border-[#323234] flex items-center justify-between gap-3 bg-[#1a1a1c]">
                <div className="flex items-center gap-3">
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
                <button
                    onClick={() => setIsAdding(true)}
                    className="p-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl shadow-lg hover:brightness-110 transition-all"
                >
                    <Plus size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
                {isAdding && (
                    <div className="bg-[#202022] border border-[#323234] rounded-xl p-4 animate-in fade-in slide-in-from-top-4">
                        <input
                            autoFocus
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddTask();
                                if (e.key === 'Escape') setIsAdding(false);
                            }}
                            placeholder="What needs to be done?"
                            className="w-full bg-[#2a2a2c] rounded-lg px-4 py-3 text-white placeholder:text-text-secondary focus:outline-none border border-transparent focus:border-emerald-500/50 mb-3"
                        />
                        <input
                            type="date"
                            value={newDue}
                            onChange={(e) => setNewDue(e.target.value)}
                            className="w-full bg-[#2a2a2c] rounded-lg px-4 py-3 text-text-secondary focus:outline-none border border-transparent focus:border-emerald-500/50 mb-3"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => { setIsAdding(false); setNewTitle(''); setNewDue(''); }}
                                className="px-4 py-2 text-text-secondary hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddTask}
                                disabled={!newTitle.trim()}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium disabled:opacity-50"
                            >
                                Add Task
                            </button>
                        </div>
                    </div>
                )}

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
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(task.title);
    const [editDue, setEditDue] = useState(task.due_date ? task.due_date.slice(0, 10) : '');

    const handleStatusChange = (status: Task['status']) => {
        onUpdateTask(task.id, { status });
        setMenuOpen(false);
    };

    function handleSaveEdit() {
        if (!editTitle.trim()) return;
        const patch: Partial<Task> = {};
        if (editTitle.trim() !== task.title) patch.title = editTitle.trim();
        const due = editDue ? editDue : null;
        if (due !== (task.due_date ? task.due_date.slice(0, 10) : null)) patch.due_date = due;

        if (Object.keys(patch).length > 0) {
            onUpdateTask(task.id, patch);
        }
        setIsEditing(false);
    }

    return (
        <React.Fragment>
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
                    <React.Fragment>
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
                            <div className="border-t border-[#3a3a3c] my-1" />
                            <button
                                onClick={() => {
                                    setMenuOpen(false);
                                    setEditTitle(task.title);
                                    setEditDue(task.due_date ? task.due_date.slice(0, 10) : '');
                                    setIsEditing(true);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-text-secondary hover:bg-white/5 hover:text-white transition-colors"
                            >
                                <Edit2 size={16} /> Edit
                            </button>
                        </div>
                    </React.Fragment>
                )}
            </div>

            {/* Edit modal */}
            {isEditing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                    <div className="bg-[#202022] rounded-2xl p-6 w-full max-w-sm border border-[#323234] shadow-xl">
                        <div className="flex items-start justify-between mb-4">
                            <h3 className="text-base font-semibold text-white">Edit Task</h3>
                            <button onClick={() => setIsEditing(false)} className="text-text-secondary hover:text-white">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="text-xs text-text-secondary block mb-1.5">Title</label>
                                <input
                                    autoFocus
                                    value={editTitle}
                                    onChange={e => setEditTitle(e.target.value)}
                                    className="w-full bg-[#2a2a2c] border border-[#3a3a3c] focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-white focus:outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-text-secondary block mb-1.5">Due Date</label>
                                <input
                                    type="date"
                                    value={editDue}
                                    onChange={e => setEditDue(e.target.value)}
                                    className="w-full bg-[#2a2a2c] border border-[#3a3a3c] focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-white focus:outline-none transition-colors"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 bg-[#323234] hover:bg-[#3a3a3c] text-white rounded-lg text-sm transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={!editTitle.trim()}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </React.Fragment>
    );
}
