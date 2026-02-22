'use client';

import { useState } from 'react';
import {
    DndContext,
    DragEndEvent,
    DragOverEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    pointerWithin,
    closestCorners,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { supabase } from '@/lib/supabase-client';
import { Project, Task } from './ProjectsDashboard';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';
import { LayoutGrid, ListTodo } from 'lucide-react';

const COLUMNS: { id: Task['status']; label: string }[] = [
    { id: 'todo', label: 'To Do' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'done', label: 'Done' },
];

const COLUMN_IDS = new Set(COLUMNS.map(c => c.id));

interface Props {
    project: Project;
    tasks: Task[];
    onTasksChange: (tasks: Task[]) => void;
    onAddTask: (status: Task['status'], title: string, dueDate: string | null, startDate: string | null, endDate: string | null) => void;
    onRefresh: () => void;
}

export default function KanbanBoard({ project, tasks, onTasksChange, onAddTask, onRefresh }: Props) {
    const [activeTask, setActiveTask] = useState<Task | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    function handleDragStart(event: DragStartEvent) {
        const task = tasks.find(t => t.id === event.active.id);
        setActiveTask(task ?? null);
    }

    function handleDragOver(event: DragOverEvent) {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        if (activeId === overId) return;

        const activeTask = tasks.find(t => t.id === activeId);
        const overTask = tasks.find(t => t.id === overId);

        if (!activeTask) return;

        // Determine destination status
        let overStatus: Task['status'] | null = null;
        if (COLUMN_IDS.has(overId as any)) {
            overStatus = overId as any;
        } else if (overTask) {
            overStatus = overTask.status;
        }

        if (!overStatus || activeTask.status === overStatus) return;

        // Move across columns in state immediately for visual feedback
        const updated = tasks.map(t =>
            t.id === activeId ? { ...t, status: overStatus! } : t
        );
        onTasksChange(updated);
    }

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        setActiveTask(null);
        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        const draggedTask = tasks.find(t => t.id === activeId);
        if (!draggedTask) return;

        const overTask = tasks.find(t => t.id === overId);
        const targetStatus: Task['status'] = COLUMN_IDS.has(overId as any)
            ? (overId as any)
            : (overTask?.status ?? draggedTask.status);

        // Get all tasks in target column from current state
        const colTasks = tasks.filter(t => t.status === targetStatus);
        const oldIdx = colTasks.findIndex(t => t.id === activeId);
        const newIdx = COLUMN_IDS.has(overId as any)
            ? colTasks.length - 1
            : colTasks.findIndex(t => t.id === overId);

        if (oldIdx !== -1 && newIdx !== -1) {
            let reordered = colTasks;
            if (oldIdx !== newIdx) {
                reordered = arrayMove(colTasks, oldIdx, newIdx);
            }
            const withOrder = reordered.map((t, i) => ({ ...t, order: i }));

            const final = [
                ...tasks.filter(t => t.status !== targetStatus),
                ...withOrder
            ];
            onTasksChange(final);

            // Persist all in target column
            await Promise.all(
                withOrder.map(t =>
                    supabase.from('tasks').update({ status: targetStatus, order: t.order }).eq('id', t.id)
                )
            );
        }
    }

    async function updateTask(id: string, patch: Partial<Task>) {
        await supabase.from('tasks').update(patch).eq('id', id);
        onTasksChange(tasks.map(t => t.id === id ? { ...t, ...patch } : t));
    }

    async function deleteTask(id: string) {
        await supabase.from('tasks').delete().eq('id', id);
        onTasksChange(tasks.filter(t => t.id !== id));
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="px-8 py-5 border-b border-[#323234] flex-shrink-0 flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-semibold text-white">{project.title}</h1>
                        {project.type === 'goal' && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                                {project.goal_year} Goal
                            </span>
                        )}
                    </div>
                    <p className="text-text-secondary text-sm mt-0.5">
                        {tasks.length} {project.type === 'goal' ? 'step' : 'task'}{tasks.length !== 1 ? 's' : ''}
                        {' · '}
                        {tasks.filter(t => t.status === 'done').length} done
                    </p>
                </div>
            </div>

            {/* Kanban columns */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                >
                    <div className="flex gap-5 h-full p-4 md:p-8 min-w-max">
                        {COLUMNS.map(col => (
                            <KanbanColumn
                                key={col.id}
                                id={col.id}
                                label={col.label}
                                tasks={tasks.filter(t => t.status === col.id)}
                                onAddTask={(title: string, due: string | null, start: string | null, end: string | null) => onAddTask(col.id, title, due, start, end)}
                                onUpdateTask={updateTask}
                                onDeleteTask={deleteTask}
                            />
                        ))}
                    </div>

                    <DragOverlay>
                        {activeTask && (
                            <KanbanCard task={activeTask} isDragging onUpdate={() => { }} onDelete={() => { }} />
                        )}
                    </DragOverlay>
                </DndContext>
            </div>
        </div>
    );
}
