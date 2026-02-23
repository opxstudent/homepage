'use client';

import React, { useState, useEffect, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { Project, Task } from './ProjectsDashboard';
import { MoreHorizontal, CheckCircle2, Circle, Clock, ChevronDown, ChevronRight, Edit2, X, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase-client';
import { toUTCISO, formatLocalTime, formatLocalDate, formatFullDateTime } from '@/lib/dateUtils';

interface Props {
    project: Project;
    tasks: Task[];
    onUpdateTask: (id: string, patch: Partial<Task>) => void;
    onAddTask: (status: Task['status'], title: string, dueDate: string | null, startDate: string | null, endDate: string | null) => void;
    onBack: () => void;
}

export default function ProjectList({ project, tasks, onUpdateTask, onAddTask, onBack }: Props) {
    const todoTasks = tasks.filter(t => t.status === 'todo');
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
    const doneTasks = tasks.filter(t => t.status === 'done');
    const [isAdding, setIsAdding] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDue, setNewDue] = useState('');
    const [newStart, setNewStart] = useState(''); // Time string "HH:mm"
    const [newEnd, setNewEnd] = useState('');     // Time string "HH:mm"

    const handleAddTask = () => {
        if (!newTitle.trim()) return;

        const dueDate = newDue || null;
        let startDate = null;
        let endDate = null;

        if (dueDate) {
            startDate = toUTCISO(dueDate, newStart);
            endDate = toUTCISO(dueDate, newEnd);
        }

        onAddTask('todo', newTitle.trim(), dueDate, startDate, endDate);

        // Reset state
        setNewTitle('');
        setNewDue('');
        setNewStart('');
        setNewEnd('');
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
                        <label className="text-xs text-text-secondary block mb-1.5">Due Date (All-Day)</label>
                        <input
                            type="date"
                            value={newDue}
                            onChange={(e) => { setNewDue(e.target.value); if (e.target.value) { setNewStart(''); setNewEnd(''); } }}
                            className="w-full bg-[#2a2a2c] rounded-lg px-4 py-3 text-text-secondary focus:outline-none border border-transparent focus:border-emerald-500/50 mb-3"
                        />
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                                <label className="text-xs text-text-secondary block mb-1.5">Start Time</label>
                                <input
                                    type="text"
                                    placeholder="HH:mm"
                                    value={newStart}
                                    onChange={e => setNewStart(e.target.value)}
                                    className="w-full bg-[#2a2a2c] border border-[#3a3a3c] focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-white focus:outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-text-secondary block mb-1.5">End Time</label>
                                <input
                                    type="text"
                                    placeholder="HH:mm"
                                    value={newEnd}
                                    onChange={e => setNewEnd(e.target.value)}
                                    className="w-full bg-[#2a2a2c] border border-[#3a3a3c] focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-white focus:outline-none transition-colors"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => { setIsAdding(false); setNewTitle(''); setNewDue(''); setNewStart(''); setNewEnd(''); }}
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
    const [editTitle, setEditTitle] = useState('');
    const [editDue, setEditDue] = useState('');
    const [editStart, setEditStart] = useState('');
    const [editEnd, setEditEnd] = useState('');
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleStatusChange = (status: Task['status']) => {
        onUpdateTask(task.id, { status });
        setMenuOpen(false);
    };
    function handleSaveEdit() {
        if (!editTitle.trim()) return;

        const patch: Partial<Task> = {};
        if (editTitle.trim() !== task.title) patch.title = editTitle.trim();

        // The base date selected in the picker (YYYY-MM-DD)
        const datePart = editDue || null;
        patch.due_date = datePart;

        if (datePart) {
            patch.start_date = toUTCISO(datePart, editStart);
            patch.end_date = toUTCISO(datePart, editEnd);
        } else {
            // If no date is selected, we clear the specific timestamps too
            patch.start_date = null;
            patch.end_date = null;
        }

        onUpdateTask(task.id, patch);
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
                        {(task.due_date || task.start_date || task.end_date) && isMounted && (
                            <div className="flex flex-col gap-1 mt-1 text-xs text-text-secondary">
                                {task.start_date && task.end_date ? (
                                    <div className="flex items-center gap-1.5">
                                        <Clock size={12} className="text-emerald-500/70" />
                                        <span>
                                            {formatFullDateTime(task.start_date)} - {formatLocalTime(task.end_date)}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5">
                                        <Clock size={12} className="text-emerald-500/70" />
                                        <span>
                                            {task.due_date ? formatLocalDate(task.due_date) :
                                                task.start_date ? formatFullDateTime(task.start_date) :
                                                    formatFullDateTime(task.end_date!)}
                                        </span>
                                    </div>
                                )}
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

                {/* Status Dropdown / Bottom Sheet */}
                {menuOpen && isMounted && typeof document !== 'undefined' && createPortal(
                    <React.Fragment>
                        <div
                            className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-[2px] transition-opacity duration-300"
                            onClick={() => setMenuOpen(false)}
                        />
                        <div className="fixed left-0 right-0 bottom-0 z-[120] bg-gradient-to-b from-[#1c1c1e] to-[#121214] border-t border-white/5 rounded-t-[2.5rem] shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden pb-safe-area animate-in slide-in-from-bottom duration-500 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]">
                            <div className="w-10 h-1 bg-white/10 rounded-full mx-auto my-4" />
                            <div className="px-6 py-1 text-[10px] font-bold text-text-secondary/60 uppercase tracking-[2px] mb-2 flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                Project Options
                            </div>
                            <div className="px-3 pb-4 space-y-1">
                                <div className="grid grid-cols-3 gap-2 mb-2 p-1 bg-white/5 rounded-2xl">
                                    <button
                                        onClick={() => handleStatusChange('todo')}
                                        className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-all ${task.status === 'todo' ? 'bg-white/10 text-white' : 'text-text-secondary hover:text-white/80'}`}
                                    >
                                        <Circle size={16} />
                                        <span className="text-[10px] font-semibold">To Do</span>
                                    </button>
                                    <button
                                        onClick={() => handleStatusChange('in_progress')}
                                        className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-all ${task.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' : 'text-text-secondary hover:text-white/80'}`}
                                    >
                                        <Clock size={16} />
                                        <span className="text-[10px] font-semibold">Working</span>
                                    </button>
                                    <button
                                        onClick={() => handleStatusChange('done')}
                                        className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-all ${task.status === 'done' ? 'bg-emerald-500/20 text-emerald-400' : 'text-text-secondary hover:text-white/80'}`}
                                    >
                                        <CheckCircle2 size={16} />
                                        <span className="text-[10px] font-semibold">Done</span>
                                    </button>
                                </div>

                                <button
                                    onClick={() => {
                                        console.log('Opening edit for task:', task.id);
                                        try {
                                            setEditTitle(task.title);
                                            setEditDue(task.due_date ? String(task.due_date).substring(0, 10) : '');
                                            setEditStart(formatLocalTime(task.start_date));
                                            setEditEnd(formatLocalTime(task.end_date));
                                            setIsEditing(true);
                                            setMenuOpen(false);
                                            console.log('Edit state triggered');
                                        } catch (err) {
                                            console.error('Failed to open edit modal:', err);
                                            setEditTitle(task.title);
                                            setIsEditing(true);
                                            setMenuOpen(false);
                                        }
                                    }}
                                    className="w-full h-14 flex items-center gap-4 px-6 text-sm font-semibold text-white bg-white/5 hover:bg-white/10 active:scale-[0.98] rounded-2xl transition-all border border-white/5"
                                >
                                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                        <Edit2 size={16} />
                                    </div>
                                    Edit Task Details
                                </button>

                                <button
                                    onClick={() => setMenuOpen(false)}
                                    className="w-full h-14 flex items-center justify-center text-sm font-bold text-text-secondary hover:text-white bg-transparent rounded-2xl transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </React.Fragment>,
                    document.body
                )}
            </div>

            {/* Edit modal */}
            {isEditing && isMounted && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md px-4 py-6 animate-in fade-in duration-300">
                    <div className="bg-[#1c1c1e] border border-white/10 rounded-[2.5rem] p-7 w-full max-w-sm shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] flex flex-col max-h-[90vh] overflow-y-auto animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                    <Edit2 size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white leading-tight">Edit Task</h3>
                                    <p className="text-[11px] text-text-secondary font-medium tracking-wide">Refine your objectives</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="w-10 h-10 flex items-center justify-center text-text-secondary hover:text-white bg-white/5 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-6 mb-8 flex-1">
                            <div>
                                <label className="text-[10px] font-bold text-text-secondary/60 uppercase tracking-[2px] block mb-2 ml-1">Title</label>
                                <input
                                    autoFocus
                                    onFocus={e => e.target.select()}
                                    value={editTitle}
                                    onChange={e => setEditTitle(e.target.value)}
                                    className="w-full bg-white/5 border border-white/5 focus:border-emerald-500/50 rounded-2xl px-5 py-4 text-[15px] text-white focus:outline-none transition-all placeholder:text-text-secondary/30 ring-0 focus:ring-4 focus:ring-emerald-500/10"
                                    placeholder="Task title"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-text-secondary/60 uppercase tracking-[2px] block mb-2 ml-1">Due Date</label>
                                    <div className="relative group">
                                        <input
                                            type="date"
                                            value={editDue}
                                            onChange={e => setEditDue(e.target.value)}
                                            className="w-full bg-white/5 border border-white/5 focus:border-emerald-500/50 rounded-2xl px-5 py-4 text-[15px] text-white focus:outline-none transition-all color-scheme-dark appearance-none ring-0 focus:ring-4 focus:ring-emerald-500/10"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-text-secondary/60 uppercase tracking-[2px] block mb-2 ml-1">Start</label>
                                        <input
                                            type="text"
                                            placeholder="HH:mm"
                                            value={editStart}
                                            onChange={e => setEditStart(e.target.value)}
                                            className="w-full bg-white/5 border border-white/5 focus:border-emerald-500/50 rounded-2xl px-5 py-4 text-[15px] text-white focus:outline-none transition-all placeholder:text-text-secondary/30 ring-0 focus:ring-4 focus:ring-blue-500/10"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-text-secondary/60 uppercase tracking-[2px] block mb-2 ml-1">End</label>
                                        <input
                                            type="text"
                                            placeholder="HH:mm"
                                            value={editEnd}
                                            onChange={e => setEditEnd(e.target.value)}
                                            className="w-full bg-white/5 border border-white/5 focus:border-emerald-500/50 rounded-2xl px-5 py-4 text-[15px] text-white focus:outline-none transition-all placeholder:text-text-secondary/30 ring-0 focus:ring-4 focus:ring-blue-500/10"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-auto">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="flex-1 py-4 text-sm font-bold text-text-secondary hover:text-white transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={!editTitle.trim()}
                                className="flex-[2] py-4 bg-emerald-500 hover:bg-emerald-400 text-[#0a0a0b] rounded-[1.25rem] text-sm font-bold shadow-[0_10px_20px_-5px_rgba(16,185,129,0.3)] transition-all disabled:opacity-30 disabled:shadow-none active:scale-[0.98]"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </React.Fragment>
    );
}
