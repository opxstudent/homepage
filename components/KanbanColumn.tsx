'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, X } from 'lucide-react';
import { Task } from './ProjectsDashboard';
import { toUTCISO } from '@/lib/dateUtils';
import KanbanCard from './KanbanCard';

interface Props {
    id: Task['status'];
    label: string;
    tasks: Task[];
    onAddTask: (title: string, dueDate: string | null, startDate: string | null, endDate: string | null) => void;
    onUpdateTask: (id: string, patch: Partial<Task>) => void;
    onDeleteTask: (id: string) => void;
}

const COLUMN_ACCENT: Record<string, string> = {
    todo: 'text-slate-400',
    in_progress: 'text-amber-400',
    done: 'text-emerald-400',
};

export default function KanbanColumn({ id, label, tasks, onAddTask, onUpdateTask, onDeleteTask }: Props) {
    const [adding, setAdding] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDue, setNewDue] = useState('');
    const [newStart, setNewStart] = useState('');
    const [newEnd, setNewEnd] = useState('');

    const { setNodeRef, isOver } = useDroppable({ id });

    function submitAdd() {
        if (!newTitle.trim()) return;
        const dueDate = newDue || null;
        let startDate = null;
        let endDate = null;

        if (dueDate) {
            startDate = toUTCISO(dueDate, newStart);
            endDate = toUTCISO(dueDate, newEnd);
        }

        onAddTask(newTitle.trim(), dueDate, startDate, endDate);
        setNewTitle('');
        setNewDue('');
        setNewStart('');
        setNewEnd('');
        setAdding(false);
    }

    return (
        <div className="flex flex-col w-72 flex-shrink-0">
            {/* Column header */}
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${COLUMN_ACCENT[id]}`}>{label}</span>
                    <span className="text-xs text-text-secondary bg-[#2a2a2c] px-1.5 py-0.5 rounded-full">{tasks.length}</span>
                </div>
                <button
                    onClick={() => setAdding(true)}
                    className="p-1 hover:bg-white/5 rounded-lg transition-all"
                    title="Add task"
                >
                    <Plus size={14} className="text-text-secondary hover:text-white" />
                </button>
            </div>

            {/* Drop zone */}
            <div
                ref={setNodeRef}
                className={`flex-1 min-h-[200px] overflow-y-auto rounded-xl p-2 space-y-2 transition-colors ${isOver ? 'bg-white/5' : 'bg-transparent'}`}
            >
                <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {tasks.map(task => (
                        <KanbanCard
                            key={task.id}
                            task={task}
                            onUpdate={(patch) => onUpdateTask(task.id, patch)}
                            onDelete={() => onDeleteTask(task.id)}
                        />
                    ))}
                </SortableContext>

                {/* Add task form */}
                {adding && (
                    <div className="bg-[#202022] rounded-lg p-3 space-y-2 shadow-sm">
                        <input
                            autoFocus
                            value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') submitAdd();
                                if (e.key === 'Escape') { setAdding(false); setNewTitle(''); setNewDue(''); }
                            }}
                            placeholder="Task title…"
                            className="w-full bg-[#2a2a2c] rounded px-2 py-1.5 text-sm text-white placeholder:text-text-secondary focus:outline-none"
                        />
                        <label className="text-[10px] text-text-secondary px-1">Due Date (All-Day)</label>
                        <input
                            type="date"
                            value={newDue}
                            onChange={e => { setNewDue(e.target.value); if (e.target.value) { setNewStart(''); setNewEnd(''); } }}
                            className="w-full bg-[#2a2a2c] rounded px-2 py-1.5 text-xs text-text-secondary focus:outline-none"
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[10px] text-text-secondary px-1">Start Time</label>
                                <input
                                    type="text"
                                    placeholder="HH:mm"
                                    value={newStart}
                                    onChange={e => setNewStart(e.target.value)}
                                    className="w-full bg-[#2a2a2c] rounded px-1.5 py-1 text-[10px] text-text-secondary focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-text-secondary px-1">End Time</label>
                                <input
                                    type="text"
                                    placeholder="HH:mm"
                                    value={newEnd}
                                    onChange={e => setNewEnd(e.target.value)}
                                    className="w-full bg-[#2a2a2c] rounded px-1.5 py-1 text-[10px] text-text-secondary focus:outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={submitAdd} className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium transition-all">Add</button>
                            <button onClick={() => { setAdding(false); setNewTitle(''); setNewDue(''); setNewStart(''); setNewEnd(''); }} className="p-1 hover:bg-[#3a3a3c] rounded transition-all">
                                <X size={14} className="text-text-secondary" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
