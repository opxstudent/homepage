'use client';

import React, { useState, useEffect, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { Project, Task } from './ProjectsDashboard';
import { MoreHorizontal, CheckCircle2, Circle, Clock, ChevronDown, ChevronRight, Edit2, X, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase-client';
import { toUTCISO, formatLocalTime, formatLocalDate, formatFullDateTime } from '@/lib/dateUtils';

interface Props {
    project: Project;
    tasks: Task[];
    onUpdateTask: (id: string, patch: Partial<Task>) => void;
    onDeleteTask: (id: string) => void;
    onAddTask: (status: Task['status'], title: string, dueDate: string | null, startDate: string | null, endDate: string | null) => void;
    onBack: () => void;
}

export default function ProjectList({ project, tasks, onUpdateTask, onDeleteTask, onBack, onAddTask }: Props) {
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

                <TaskGroup title="In Progress" tasks={inProgressTasks} color="text-blue-400" onUpdateTask={onUpdateTask} onDeleteTask={onDeleteTask} />
                <TaskGroup title="To Do" tasks={todoTasks} color="text-text-secondary" onUpdateTask={onUpdateTask} onDeleteTask={onDeleteTask} />
                <TaskGroup title="Done" tasks={doneTasks} color="text-emerald-400" onUpdateTask={onUpdateTask} onDeleteTask={onDeleteTask} />
            </div>
        </div>
    );
}

function TaskGroup({ title, tasks, color, onUpdateTask, onDeleteTask }: { title: string; tasks: Task[]; color: string; onUpdateTask: Props['onUpdateTask']; onDeleteTask: Props['onDeleteTask'] }) {
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
                        <MobileTaskCard key={task.id} task={task} onUpdateTask={onUpdateTask} onDeleteTask={onDeleteTask} />
                    ))}
                </div>
            )}
        </div>
    );
}

function MobileTaskCard({ task, onUpdateTask, onDeleteTask }: { task: Task; onUpdateTask: Props['onUpdateTask']; onDeleteTask: Props['onDeleteTask'] }) {
    const [isEditing, setIsEditing] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [editTitle, setEditTitle] = useState(task.title);
    const [editDue, setEditDue] = useState(task.due_date ? String(task.due_date).substring(0, 10) : '');
    const [editStart, setEditStart] = useState(formatLocalTime(task.start_date));
    const [editEnd, setEditEnd] = useState(formatLocalTime(task.end_date));
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleStatusChange = (status: Task['status']) => {
        onUpdateTask(task.id, { status });
    };

    function handleSaveEdit() {
        if (!editTitle.trim()) return;
        const patch: Partial<Task> = {};
        if (editTitle.trim() !== task.title) patch.title = editTitle.trim();
        const datePart = editDue || null;
        patch.due_date = datePart;
        if (datePart) {
            patch.start_date = toUTCISO(datePart, editStart);
            patch.end_date = toUTCISO(datePart, editEnd);
        } else {
            patch.start_date = null;
            patch.end_date = null;
        }
        onUpdateTask(task.id, patch);
        setIsEditing(false);
    }

    if (isEditing) {
        return (
            <div className="bg-[#202022] border border-emerald-500/30 rounded-2xl p-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-text-secondary/60 uppercase tracking-[2px] block mb-2 ml-1">Title</label>
                        <input
                            autoFocus
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            className="w-full bg-white/5 border border-white/5 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all"
                            placeholder="Task title"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-1 bg-white/5 rounded-xl">
                        {(['todo', 'in_progress', 'done'] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => handleStatusChange(status)}
                                className={`py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${task.status === status
                                    ? status === 'done' ? 'bg-emerald-500/20 text-emerald-400' :
                                        status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-white'
                                    : 'text-text-secondary hover:text-white/80'}`}
                            >
                                {status === 'in_progress' ? 'Working' : status}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-text-secondary/60 uppercase tracking-[2px] block mb-2 ml-1">Due Date</label>
                            <input
                                type="date"
                                value={editDue}
                                onChange={e => setEditDue(e.target.value)}
                                className="w-full bg-white/5 border border-white/5 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all color-scheme-dark"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="text"
                                placeholder="Start HH:mm"
                                value={editStart}
                                onChange={e => setEditStart(e.target.value)}
                                className="w-full bg-white/5 border border-white/5 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all"
                            />
                            <input
                                type="text"
                                placeholder="End HH:mm"
                                value={editEnd}
                                onChange={e => setEditEnd(e.target.value)}
                                className="w-full bg-white/5 border border-white/5 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="flex-1 py-3 text-sm font-bold text-text-secondary hover:text-white transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveEdit}
                            disabled={!editTitle.trim()}
                            className="flex-[2] py-3 bg-emerald-500 hover:bg-emerald-400 text-[#0a0a0b] rounded-xl text-sm font-bold shadow-lg transition-all disabled:opacity-30 active:scale-[0.98]"
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#202022] border border-[#323234] rounded-xl p-4 relative active:scale-[0.99] transition-transform hover:border-white/10 group">
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1 flex gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 mt-[7px] ${task.status === 'done' ? 'bg-emerald-500' : task.status === 'in_progress' ? 'bg-blue-500' : 'bg-slate-500'}`} />
                    <div className="min-w-0 flex-1">
                        <h3 className={`text-base font-medium text-white mb-1 truncate ${task.status === 'done' ? 'line-through text-text-secondary' : ''}`}>
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
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => {
                            setEditTitle(task.title);
                            setEditDue(task.due_date ? String(task.due_date).substring(0, 10) : '');
                            setEditStart(formatLocalTime(task.start_date));
                            setEditEnd(formatLocalTime(task.end_date));
                            setIsEditing(true);
                        }}
                        className="p-1 text-text-secondary hover:text-white transition-colors"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="p-1 text-text-secondary hover:text-red-400 transition-colors"
                    >
                        <Trash2 size={16} className="lucide lucide-trash-2" />
                    </button>
                </div>
            </div>

            {/* Delete Confirmation Overlay */}
            {showDeleteConfirm && (
                <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 rounded-xl">
                    <div className="text-center animate-in fade-in zoom-in-95 duration-200">
                        <h4 className="text-white font-semibold mb-1 text-sm">Remove Task?</h4>
                        <p className="text-[10px] text-text-secondary mb-3">Permanent action.</p>
                        <div className="flex justify-center gap-2">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-white bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    onDeleteTask(task.id);
                                }}
                                className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-white bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
