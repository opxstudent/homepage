'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Plus, FolderOpen, Target, Archive, Trash2, X, CheckCircle2, MoreHorizontal, ArchiveRestore, ChevronDown, ChevronRight, ListTodo } from 'lucide-react';
import KanbanBoard from './KanbanBoard';
import ProjectList from './ProjectList';
import ChecklistView from './ChecklistView';

export const GOAL_CATEGORIES = ['Health & Fitness', 'Career', 'Finance', 'Hobbies'] as const;
export type GoalCategory = typeof GOAL_CATEGORIES[number];

export interface Project {
    id: string;
    title: string;
    status: 'active' | 'archived';
    type: 'project' | 'goal' | 'checklist';
    category: GoalCategory | null;
    goal_year: number | null;
    updated_at: string;
}

export interface Task {
    id: string;
    project_id: string;
    title: string;
    status: 'todo' | 'in_progress' | 'done';
    due_date: string | null;
    start_date: string | null;
    end_date: string | null;
    category: string | null;
    order: number;
}

const CURRENT_YEAR = new Date().getFullYear();

export default function ProjectsDashboard() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newType, setNewType] = useState<'project' | 'goal' | 'checklist'>('project');
    const [newCategory, setNewCategory] = useState<GoalCategory | null>(null);
    const [newGoalYear, setNewGoalYear] = useState<number>(CURRENT_YEAR);
    const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
    const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
    const [showArchived, setShowArchived] = useState(false);

    useEffect(() => { fetchAll(); }, []);

    async function fetchAll() {
        const [pRes, tRes] = await Promise.all([
            supabase.from('projects').select('*').order('updated_at', { ascending: false }),
            supabase.from('tasks').select('*').order('order', { ascending: true }),
        ]);
        if (pRes.data) {
            setProjects(pRes.data);
            // Removed auto-selection so mobile users see the list first
        }
        if (tRes.data) setTasks(tRes.data);
    }

    async function saveItem() {
        if (!newTitle.trim()) return;

        const payload: Partial<Project> = {
            title: newTitle.trim(),
            status: 'active',
            type: newType,
            category: newType === 'goal' ? newCategory : null,
            goal_year: newType === 'goal' ? newGoalYear : null,
        };

        if (editingProjectId) {
            // Update existing
            const { error } = await supabase.from('projects').update(payload).eq('id', editingProjectId);
            if (!error) {
                setProjects(prev => prev.map(p => p.id === editingProjectId ? { ...p, ...payload, updated_at: new Date().toISOString() } as Project : p));
                setEditingProjectId(null);
                setShowCreateModal(false);
                setNewTitle('');
                setNewType('project');
                setNewCategory(null);
                setNewGoalYear(CURRENT_YEAR);
            }
        } else {
            // Create new
            const { data, error } = await supabase.from('projects').insert(payload).select().single();
            if (data) {
                setProjects(prev => [data, ...prev]);
                setSelectedId(data.id);
                setNewTitle('');
                setNewType('project');
                setNewCategory(null);
                setNewGoalYear(CURRENT_YEAR);
                setShowCreateModal(false);
            }
        }
    }

    function handleEdit(p: Project) {
        setEditingProjectId(p.id);
        setNewTitle(p.title);
        setNewType(p.type);
        setNewCategory(p.category);
        setNewGoalYear(p.goal_year || CURRENT_YEAR);
        setShowCreateModal(true);
    }

    async function archiveProject(id: string) {
        await supabase.from('projects').update({ status: 'archived' }).eq('id', id);
        setProjects(prev => prev.map(p => p.id === id ? { ...p, status: 'archived' } : p));
        if (selectedId === id) {
            const next = projects.find(p => p.id !== id && p.status === 'active');
            setSelectedId(next?.id ?? null);
        }
    }

    async function unarchiveProject(id: string) {
        await supabase.from('projects').update({ status: 'active' }).eq('id', id);
        setProjects(prev => prev.map(p => p.id === id ? { ...p, status: 'active' } : p));
    }

    async function deleteProject(id: string) {
        await supabase.from('projects').delete().eq('id', id);
        setProjects(prev => prev.filter(p => p.id !== id));
        setTasks(prev => prev.filter(t => t.project_id !== id));
        if (selectedId === id) setSelectedId(projects.find(p => p.id !== id)?.id ?? null);
        setDeletingProjectId(null);
    }

    const selectedProject = projects.find(p => p.id === selectedId) ?? null;
    const selectedTasks = tasks.filter(t => t.project_id === selectedId);

    function handleTasksChange(updated: Task[]) {
        setTasks(prev => [
            ...prev.filter(t => t.project_id !== selectedId),
            ...updated,
        ]);
    }

    async function addTask(status: Task['status'], title: string, dueDate: string | null, startDate: string | null = null, endDate: string | null = null, category: string | null = null) {
        if (!selectedId) return;
        const projectTasks = tasks.filter(t => t.project_id === selectedId);
        const colTasks = projectTasks.filter(t => t.status === status);

        const { data, error } = await supabase.from('tasks').insert({
            project_id: selectedId,
            title,
            status,
            due_date: dueDate || null,
            start_date: startDate || null,
            end_date: endDate || null,
            category: category || null,
            order: colTasks.length,
        }).select().single();

        if (data) {
            handleTasksChange([...projectTasks, data]);
        }
    }

    const activeProjects = projects.filter(p => p.type === 'project' && p.status === 'active');
    const activeChecklists = projects.filter(p => p.type === 'checklist' && p.status === 'active');
    // Group goals by year, sorted descending
    const goalsByYear = projects
        .filter(p => p.type === 'goal')
        .reduce<Record<number, Project[]>>((acc, p) => {
            const yr = p.goal_year ?? CURRENT_YEAR;
            if (!acc[yr]) acc[yr] = [];
            acc[yr].push(p);
            return acc;
        }, {});

    // Sort goals within each year by category order
    Object.values(goalsByYear).forEach(yearGoals => {
        yearGoals.sort((a, b) => {
            const indexA = a.category ? GOAL_CATEGORIES.indexOf(a.category) : 999;
            const indexB = b.category ? GOAL_CATEGORIES.indexOf(b.category) : 999;
            if (indexA !== indexB) return indexA - indexB;
            return a.title.localeCompare(b.title);
        });
    });

    const goalYears = Object.keys(goalsByYear).map(Number)
        .filter(yr => yr === CURRENT_YEAR || yr === CURRENT_YEAR - 1)
        .sort((a, b) => b - a);

    function SidebarItem({ p, archived = false }: { p: Project; archived?: boolean }) {
        const Icon = p.type === 'goal' ? Target : p.type === 'checklist' ? ListTodo : FolderOpen;
        const iconColor = p.type === 'project' ? 'text-blue-400' :
            p.type === 'checklist' ? 'text-pink-400' :
                p.category === 'Career' ? 'text-blue-400' :
                    p.category === 'Finance' ? 'text-emerald-400' :
                        p.category === 'Health & Fitness' ? 'text-amber-400' :
                            p.category === 'Hobbies' ? 'text-purple-400' :
                                'text-text-secondary';
        const isGoalComplete = p.type === 'goal' &&
            tasks.filter(t => t.project_id === p.id).length > 0 &&
            tasks.filter(t => t.project_id === p.id).every(t => t.status === 'done');
        const [menuOpen, setMenuOpen] = useState(false);
        return (
            <div className="relative">
                <div
                    onClick={() => {
                        setSelectedId(p.id);
                    }}
                    className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${selectedId === p.id ? 'bg-white/5 text-white' : 'text-text-secondary hover:bg-white/5 hover:text-white'} ${archived ? 'opacity-60' : ''}`}
                >
                    <Icon size={15} className={`flex-shrink-0 ${iconColor}`} />
                    <span className="text-sm flex-1 truncate">{p.title}</span>
                    {isGoalComplete && !archived && (
                        <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                    )}
                    <button
                        onPointerDown={e => e.stopPropagation()}
                        onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
                        className="p-1 hover:text-white text-text-secondary transition-all rounded"
                        title="Options"
                    >
                        <MoreHorizontal size={13} />
                    </button>
                </div>
                {menuOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                        <div className="absolute right-2 top-8 z-50 bg-[#2a2a2c] border border-[#3a3a3c] rounded-xl shadow-xl py-1 min-w-[140px]">
                            <button
                                onClick={() => { setMenuOpen(false); handleEdit(p); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-secondary hover:text-white hover:bg-white/5 transition-all"
                            >
                                <ArchiveRestore size={13} className="rotate-180" /> Edit
                            </button>
                            {archived ? (
                                <button
                                    onClick={() => { setMenuOpen(false); unarchiveProject(p.id); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-secondary hover:text-white hover:bg-white/5 transition-all"
                                >
                                    <ArchiveRestore size={13} /> Unarchive
                                </button>
                            ) : (
                                <button
                                    onClick={() => { setMenuOpen(false); archiveProject(p.id); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-secondary hover:text-white hover:bg-white/5 transition-all"
                                >
                                    <Archive size={13} /> Archive
                                </button>
                            )}
                            <div className="border-t border-[#3a3a3c] my-1" />
                            <button
                                onClick={() => { setMenuOpen(false); setDeletingProjectId(p.id); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-all"
                            >
                                <Trash2 size={13} /> Delete
                            </button>
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden">
            {/* ── Left Sidebar ── */}
            <aside className={`
                w-full md:w-64 flex-shrink-0 bg-surface/50 border-r border-[#323234] flex flex-col
                ${selectedProject ? 'hidden md:flex' : 'flex'}
            `}>
                <div className="p-5 border-b border-[#323234] flex items-center justify-between">
                    <h2 className="text-base font-semibold text-white">Projects</h2>
                    <button
                        onClick={() => { setShowCreateModal(true); setEditingProjectId(null); setNewTitle(''); setNewType('project'); }}
                        className="p-1.5 hover:bg-[#323234] rounded-lg transition-all"
                        title="New project or goal"
                    >
                        <Plus size={16} className="text-text-secondary hover:text-white" />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto p-3 space-y-4">
                    {/* Section A: Current Projects */}
                    <div>
                        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider px-2 mb-1">
                            Current Projects
                        </p>
                        {activeProjects.length === 0 ? (
                            <p className="text-text-secondary text-xs px-2 py-1 opacity-50">No projects yet</p>
                        ) : (
                            <div className="space-y-0.5">
                                {activeProjects.map(p => <SidebarItem key={p.id} p={p} />)}
                            </div>
                        )}
                    </div>

                    {/* Section B: Checklists */}
                    <div>
                        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider px-2 mb-1">
                            Checklists
                        </p>
                        {activeChecklists.length === 0 ? (
                            <p className="text-text-secondary text-xs px-2 py-1 opacity-50">No checklists yet</p>
                        ) : (
                            <div className="space-y-0.5">
                                {activeChecklists.map(p => <SidebarItem key={p.id} p={p} />)}
                            </div>
                        )}
                    </div>

                    {/* Section C: Goals grouped by year */}
                    {goalYears.length === 0 ? (
                        <div>
                            <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider px-2 mb-1">Goals</p>
                            <p className="text-text-secondary text-xs px-2 py-1 opacity-50">No goals yet</p>
                        </div>
                    ) : goalYears.map(yr => (
                        <div key={yr}>
                            <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider px-2 mb-1">
                                {yr} Goals
                            </p>
                            <div className="space-y-0.5">
                                {goalsByYear[yr].map(p => <SidebarItem key={p.id} p={p} />)}
                            </div>
                        </div>
                    ))}
                    {/* Section C: Archived (collapsible) */}
                    {(() => {
                        const archivedItems = projects.filter(p => p.status === 'archived');
                        if (archivedItems.length === 0) return null;
                        return (
                            <div>
                                <button
                                    onClick={() => setShowArchived(v => !v)}
                                    className="flex items-center gap-1.5 text-[11px] font-semibold text-text-secondary uppercase tracking-wider px-2 mb-1 hover:text-white transition-all w-full"
                                >
                                    {showArchived ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                                    Archived ({archivedItems.length})
                                </button>
                                {showArchived && (
                                    <div className="space-y-0.5">
                                        {archivedItems.map(p => <SidebarItem key={p.id} p={p} archived />)}
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </nav>
            </aside>

            {/* ── Right Pane ── */}
            <main className={`flex-1 overflow-hidden flex-col ${selectedProject ? 'flex' : 'hidden md:flex'}`}>
                {selectedProject ? (
                    <>
                        <div className="hidden md:block h-full">
                            {selectedProject.type === 'checklist' ? (
                                <ChecklistView
                                    project={selectedProject}
                                    tasks={selectedTasks}
                                    onTasksChange={handleTasksChange}
                                    onAddTask={addTask}
                                    onRefresh={fetchAll}
                                />
                            ) : (
                                <KanbanBoard
                                    project={selectedProject}
                                    tasks={selectedTasks}
                                    onTasksChange={handleTasksChange}
                                    onAddTask={addTask}
                                    onRefresh={fetchAll}
                                />
                            )}
                        </div>
                        <div className="block md:hidden h-full">
                            <ProjectList
                                project={selectedProject}
                                tasks={selectedTasks}
                                onUpdateTask={async (id, patch) => {
                                    await supabase.from('tasks').update(patch).eq('id', id);
                                    handleTasksChange(tasks.map(t => t.id === id ? { ...t, ...patch } : t));
                                }}
                                onBack={() => setSelectedId(null)}
                                onAddTask={addTask}
                            />
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-text-secondary">
                        <div className="text-center">
                            <Archive size={40} className="mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Select or create a project</p>
                        </div>
                    </div>
                )}
            </main>

            {/* ── Create/Edit Modal ── */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-[#202022] rounded-2xl p-6 max-w-sm w-full mx-4 border border-[#323234] shadow-xl">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-base font-semibold text-white">
                                {editingProjectId ? 'Edit Item' : 'New Item'}
                            </h3>
                            <button onClick={() => { setShowCreateModal(false); setEditingProjectId(null); setNewTitle(''); setNewType('project'); setNewCategory(null); }} className="text-text-secondary hover:text-white">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Type toggle */}
                        <div className="flex bg-[#2a2a2c] rounded-xl p-1 mb-4">
                            <button
                                onClick={() => setNewType('project')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${newType === 'project' ? 'bg-[#3a3a3c] text-white' : 'text-text-secondary hover:text-white'}`}
                            >
                                <FolderOpen size={14} /> Project
                            </button>
                            <button
                                onClick={() => setNewType('goal')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${newType === 'goal' ? 'bg-[#3a3a3c] text-white' : 'text-text-secondary hover:text-white'}`}
                            >
                                <Target size={14} /> Goal
                            </button>
                            <button
                                onClick={() => setNewType('checklist')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${newType === 'checklist' ? 'bg-[#3a3a3c] text-white' : 'text-text-secondary hover:text-white'}`}
                            >
                                <ListTodo size={14} /> Checklist
                            </button>
                        </div>

                        {/* Title input */}
                        <input
                            autoFocus
                            value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') saveItem();
                                if (e.key === 'Escape') { setShowCreateModal(false); setEditingProjectId(null); setNewTitle(''); setNewType('project'); }
                            }}
                            placeholder={newType === 'goal' ? 'Goal title…' : newType === 'checklist' ? 'Checklist name…' : 'Project name…'}
                            className="w-full bg-[#2a2a2c] border border-[#3a3a3c] focus:border-emerald-500 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-text-secondary focus:outline-none transition-colors mb-4"
                        />

                        {newType === 'goal' && (
                            <div className="space-y-4 mb-4">
                                <div>
                                    <label className="text-xs text-text-secondary block mb-1.5">Category</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {GOAL_CATEGORIES.map((cat) => (
                                            <button
                                                key={cat}
                                                onClick={() => setNewCategory(cat)}
                                                className={`py-2 rounded-xl text-xs font-medium transition-all border ${newCategory === cat
                                                    ? 'bg-white/10 border-white/20 text-white'
                                                    : 'bg-transparent border-white/5 text-text-secondary hover:border-white/10'
                                                    }`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-text-secondary block mb-1.5">Goal Year</label>
                                    <input
                                        type="number"
                                        value={newGoalYear}
                                        onChange={e => setNewGoalYear(Number(e.target.value))}
                                        min={2020}
                                        max={2099}
                                        className="w-full bg-[#2a2a2c] border border-[#3a3a3c] focus:border-amber-500 rounded-xl px-3 py-2 text-sm text-white focus:outline-none transition-colors"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowCreateModal(false); setEditingProjectId(null); setNewTitle(''); setNewType('project'); setNewCategory(null); setNewGoalYear(CURRENT_YEAR); }}
                                className="flex-1 py-2 bg-[#323234] hover:bg-[#3a3a3c] text-white rounded-xl text-sm transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveItem}
                                disabled={!newTitle.trim()}
                                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-all"
                            >
                                {editingProjectId ? 'Save' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete confirm ── */}
            {deletingProjectId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-[#202022] rounded-2xl p-6 max-w-sm w-full mx-4 border border-[#323234]">
                        <h3 className="text-base font-semibold text-white mb-2">Delete</h3>
                        <p className="text-text-secondary text-sm mb-6">This will permanently delete it and all its tasks.</p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setDeletingProjectId(null)} className="px-4 py-2 bg-[#323234] hover:bg-[#3a3a3c] text-white rounded-lg text-sm transition-all">Cancel</button>
                            <button onClick={() => deleteProject(deletingProjectId)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
