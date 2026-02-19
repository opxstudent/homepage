'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, Calendar, X } from 'lucide-react';
import { Task } from './ProjectsDashboard';

interface Props {
    task: Task;
    isDragging?: boolean;
    onUpdate: (patch: Partial<Task>) => void;
    onDelete: () => void;
}

export default function KanbanCard({ task, isDragging, onUpdate, onDelete }: Props) {
    const [editingTitle, setEditingTitle] = useState(false);
    const [titleDraft, setTitleDraft] = useState(task.title);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging: isSortableDragging,
    } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const isDone = task.status === 'done';

    function getDueLabel(dateStr: string | null): { label: string; color: string } | null {
        if (!dateStr) return null;
        const due = new Date(dateStr.slice(0, 10) + 'T00:00:00');
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const today = new Date(todayStr + 'T00:00:00');
        const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, color: 'text-red-400' };
        if (diffDays === 0) return { label: 'Due today', color: 'text-amber-400' };
        if (diffDays === 1) return { label: 'Due tomorrow', color: 'text-amber-400' };
        return { label: `${diffDays}d left`, color: 'text-text-secondary' };
    }

    function saveTitle() {
        if (titleDraft.trim() && titleDraft !== task.title) {
            onUpdate({ title: titleDraft.trim() });
        }
        setEditingTitle(false);
    }

    const dueInfo = getDueLabel(task.due_date);

    return (
        <>
            <div
                ref={setNodeRef}
                style={style}
                {...attributes}
                {...listeners}
                className={`bg-[#202022] rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing select-none group transition-opacity ${isDone ? 'opacity-50' : 'opacity-100'} ${isSortableDragging || isDragging ? 'opacity-30 ring-1 ring-white/20' : ''}`}
            >
                {/* Title */}
                {editingTitle ? (
                    <input
                        autoFocus
                        value={titleDraft}
                        onChange={e => setTitleDraft(e.target.value)}
                        onBlur={saveTitle}
                        onKeyDown={e => {
                            if (e.key === 'Enter') saveTitle();
                            if (e.key === 'Escape') { setTitleDraft(task.title); setEditingTitle(false); }
                        }}
                        onClick={e => e.stopPropagation()}
                        onPointerDown={e => e.stopPropagation()}
                        className="w-full bg-[#2a2a2c] rounded px-2 py-1 text-sm text-white focus:outline-none"
                    />
                ) : (
                    <p
                        className={`text-sm leading-snug ${isDone ? 'line-through text-text-secondary' : 'text-white'}`}
                        onPointerDown={e => e.stopPropagation()}
                        onClick={e => { e.stopPropagation(); setEditingTitle(true); setTitleDraft(task.title); }}
                    >
                        {task.title}
                    </p>
                )}

                {/* Footer: due label + delete */}
                <div className="flex items-center justify-between mt-2">
                    {dueInfo ? (
                        <span className={`flex items-center gap-1 text-[11px] ${dueInfo.color}`}>
                            <Calendar size={10} />
                            {dueInfo.label}
                        </span>
                    ) : <span />}

                    <button
                        onPointerDown={e => e.stopPropagation()}
                        onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}
                        className="p-1 hover:text-red-400 text-text-secondary transition-all"
                        title="Delete task"
                    >
                        <Trash2 size={11} />
                    </button>
                </div>
            </div>

            {/* Delete confirmation dialog */}
            {confirmDelete && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                    onPointerDown={e => e.stopPropagation()}
                >
                    <div className="bg-[#202022] rounded-2xl p-6 max-w-sm w-full mx-4 border border-[#323234] shadow-xl">
                        <div className="flex items-start justify-between mb-2">
                            <h3 className="text-base font-semibold text-white">Delete Task</h3>
                            <button onClick={() => setConfirmDelete(false)} className="text-text-secondary hover:text-white">
                                <X size={16} />
                            </button>
                        </div>
                        <p className="text-text-secondary text-sm mb-5">
                            Delete <span className="text-white font-medium">"{task.title}"</span>? This can't be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setConfirmDelete(false)}
                                className="px-4 py-2 bg-[#323234] hover:bg-[#3a3a3c] text-white rounded-lg text-sm transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => { setConfirmDelete(false); onDelete(); }}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
