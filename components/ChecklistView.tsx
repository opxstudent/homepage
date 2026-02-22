'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Project, Task } from './ProjectsDashboard';
import { Plus, RotateCcw, CheckCircle2, Circle, Edit2, Trash2, X, Check, ChevronRight, ChevronDown } from 'lucide-react';

interface Props {
    project: Project;
    tasks: Task[];
    onTasksChange: (tasks: Task[]) => void;
    onAddTask: (status: Task['status'], title: string, dueDate: string | null, startDate: string | null, endDate: string | null, category: string | null) => void;
    onRefresh: () => void;
}

export default function ChecklistView({ project, tasks, onTasksChange, onAddTask, onRefresh }: Props) {
    const [isAdding, setIsAdding] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [editingCategory, setEditingCategory] = useState('');
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
    const [duplicateError, setDuplicateError] = useState<string | null>(null);

    const sortedTasks = [...tasks].sort((a, b) => a.order - b.order);

    async function toggleStatus(task: Task) {
        if (editingId === task.id) return; // Don't toggle while editing
        const newStatus: Task['status'] = task.status === 'done' ? 'todo' : 'done';
        const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
        if (!error) {
            onTasksChange(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
        }
    }

    async function updateTask(id: string) {
        if (!editingTitle.trim()) {
            setEditingId(null);
            return;
        }
        const patch = {
            title: editingTitle.trim(),
            category: editingCategory.trim() || null
        };
        const { error } = await supabase.from('tasks').update(patch).eq('id', id);
        if (!error) {
            onTasksChange(tasks.map(t => t.id === id ? { ...t, ...patch } : t));
            setEditingId(null);
        }
    }

    async function deleteChecklistItem(id: string) {
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (!error) {
            onTasksChange(tasks.filter(t => t.id !== id));
        }
    }

    async function resetChecks() {
        const { error } = await supabase
            .from('tasks')
            .update({ status: 'todo' })
            .eq('project_id', project.id);

        if (!error) {
            onTasksChange(tasks.map(t => ({ ...t, status: 'todo' })));
        }
    }

    async function handleAddTask() {
        if (!newTitle.trim()) return;

        // Duplicate check
        const isDuplicate = tasks.some(t => t.title.toLowerCase() === newTitle.trim().toLowerCase());
        if (isDuplicate) {
            setDuplicateError(`"${newTitle.trim()}" is already in the list.`);
            setTimeout(() => setDuplicateError(null), 3000);
            return;
        }

        await onAddTask('todo', newTitle.trim(), null, null, null, newCategory.trim() || null);
        setNewTitle('');
        setNewCategory('');
        setIsAdding(false);
    }

    // Grouping logic
    const groupedTasks = sortedTasks.reduce<Record<string, Task[]>>((acc, task) => {
        const cat = task.category || 'Uncategorized';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(task);
        return acc;
    }, {});

    const categories = Object.keys(groupedTasks).sort((a, b) => {
        if (a === 'Uncategorized') return 1;
        if (b === 'Uncategorized') return -1;
        return a.localeCompare(b);
    });

    function toggleCategory(cat: string) {
        setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
    }

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="px-8 py-5 border-b border-[#323234] flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-semibold text-white">{project.title}</h1>
                        {project.type === 'goal' && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                                {project.goal_year} Goal
                            </span>
                        )}
                        {project.type === 'checklist' && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-400 border border-pink-500/20">
                                Checklist
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={resetChecks}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 text-text-secondary hover:text-white hover:bg-white/10 rounded-lg text-xs font-medium border border-white/5 transition-all"
                        >
                            <RotateCcw size={14} /> Reset Checks
                        </button>
                    </div>
                </div>
                <p className="text-text-secondary text-sm mb-4">
                    {tasks.length} {project.type === 'goal' ? 'step' : project.type === 'checklist' ? 'item' : 'task'}{tasks.length !== 1 ? 's' : ''}
                    {' · '}
                    {tasks.filter(t => t.status === 'done').length} done
                </p>

                {/* Progress Bar */}
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden mb-2">
                    <div
                        className="bg-emerald-500 h-full transition-all duration-500 ease-out"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
                <div className="flex justify-between text-[10px] text-text-secondary font-medium uppercase tracking-wider mb-2">
                    <span>Progress</span>
                    <span>{progressPercent}%</span>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-3xl mx-auto space-y-6">
                    {categories.map(cat => (
                        <div key={cat} className="space-y-1">
                            <button
                                onClick={() => toggleCategory(cat)}
                                className="flex items-center gap-2 w-full px-2 py-1 text-xs font-semibold text-text-secondary uppercase tracking-widest hover:text-white transition-colors"
                            >
                                <span className={`transition-transform duration-200 ${expandedCategories[cat] === false ? '' : 'rotate-90'}`}>
                                    <ChevronRight size={14} />
                                </span>
                                {cat}
                                <span className="ml-auto text-[10px] opacity-50">
                                    {groupedTasks[cat].filter(t => t.status === 'done').length}/{groupedTasks[cat].length}
                                </span>
                            </button>

                            {expandedCategories[cat] !== false && (
                                <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                    {groupedTasks[cat].map(task => (
                                        <div
                                            key={task.id}
                                            className={`group flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5 ${editingId === task.id ? 'bg-white/5 border-white/10' : ''}`}
                                        >
                                            <button
                                                onClick={() => toggleStatus(task)}
                                                className={`flex-shrink-0 transition-all ${task.status === 'done' ? 'text-emerald-500' : 'text-text-secondary group-hover:text-white'}`}
                                            >
                                                {task.status === 'done' ? <CheckCircle2 size={20} fill="currentColor" fillOpacity={0.15} /> : <Circle size={20} />}
                                            </button>

                                            {editingId === task.id ? (
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            autoFocus
                                                            value={editingTitle}
                                                            onChange={e => setEditingTitle(e.target.value)}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') updateTask(task.id);
                                                                if (e.key === 'Escape') setEditingId(null);
                                                            }}
                                                            className="flex-1 bg-transparent border-none text-white focus:ring-0 p-0 text-[15px]"
                                                            placeholder="Title"
                                                        />
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => updateTask(task.id)}
                                                                className="p-1 text-emerald-500 hover:text-emerald-400"
                                                            >
                                                                <Check size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingId(null)}
                                                                className="p-1 text-text-secondary hover:text-white"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <input
                                                        value={editingCategory}
                                                        onChange={e => setEditingCategory(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') updateTask(task.id);
                                                            if (e.key === 'Escape') setEditingId(null);
                                                        }}
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white placeholder:text-text-secondary focus:outline-none focus:border-emerald-500/50 transition-all"
                                                        placeholder="Category"
                                                    />
                                                </div>
                                            ) : (
                                                <>
                                                    <span
                                                        onClick={() => toggleStatus(task)}
                                                        className={`text-[15px] flex-1 cursor-pointer transition-all ${task.status === 'done' ? 'text-text-secondary line-through' : 'text-white'}`}
                                                    >
                                                        {task.title}
                                                    </span>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingId(task.id);
                                                                setEditingTitle(task.title);
                                                                setEditingCategory(task.category || '');
                                                            }}
                                                            className="p-1.5 text-text-secondary hover:text-white rounded-lg hover:bg-white/10"
                                                            title="Edit"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                deleteChecklistItem(task.id);
                                                            }}
                                                            className="p-1.5 text-text-secondary hover:text-red-400 rounded-lg hover:bg-red-500/10"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                    <div className="pt-4">
                        {isAdding ? (
                            <div className="bg-[#2a2a2c] border border-[#3a3a3c] rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-3">
                                    <input
                                        autoFocus
                                        value={newTitle}
                                        onChange={e => setNewTitle(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleAddTask();
                                            if (e.key === 'Escape') setIsAdding(false);
                                        }}
                                        placeholder="Item name (e.g. Toothbrush)"
                                        className="w-full bg-transparent border-none text-white placeholder:text-text-secondary focus:ring-0 p-0 text-[15px]"
                                    />
                                    <input
                                        value={newCategory}
                                        onChange={e => setNewCategory(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleAddTask();
                                            if (e.key === 'Escape') setIsAdding(false);
                                        }}
                                        placeholder="Category (e.g. Toiletries)"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-text-secondary focus:outline-none focus:border-emerald-500/50 transition-all"
                                    />
                                    {duplicateError && (
                                        <p className="text-[10px] text-red-400 animate-in fade-in slide-in-from-top-1">{duplicateError}</p>
                                    ) || (
                                            <p className="text-[10px] text-text-secondary">Categories help group your list items.</p>
                                        )}
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                    <button
                                        onClick={() => setIsAdding(false)}
                                        className="px-3 py-1.5 text-xs text-text-secondary hover:text-white"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAddTask}
                                        disabled={!newTitle.trim()}
                                        className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-all hover:bg-emerald-500"
                                    >
                                        Add to List
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsAdding(true)}
                                className="flex items-center gap-3 px-4 py-3 text-text-secondary hover:text-white w-full transition-all"
                            >
                                <Plus size={20} />
                                <span className="text-[15px]">Add task</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
