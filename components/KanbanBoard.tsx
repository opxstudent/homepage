'use client';

import { useState } from 'react';
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    pointerWithin,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { supabase } from '@/lib/supabase-client';
import { Project, Task } from './ProjectsDashboard';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';

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
    onRefresh: () => void;
}

export default function KanbanBoard({ project, tasks, onTasksChange, onRefresh }: Props) {
    const [activeTask, setActiveTask] = useState<Task | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    function handleDragStart(event: DragStartEvent) {
        const task = tasks.find(t => t.id === event.active.id);
        setActiveTask(task ?? null);
    }

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        setActiveTask(null);
        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        const draggedTask = tasks.find(t => t.id === activeId);
        if (!draggedTask) return;

        // Determine the target column
        const targetStatus: Task['status'] = COLUMN_IDS.has(overId as Task['status'])
            ? (overId as Task['status'])
            : (tasks.find(t => t.id === overId)?.status ?? draggedTask.status);

        // Build the updated task list
        let updated = tasks.map(t =>
            t.id === activeId ? { ...t, status: targetStatus } : t
        );

        // Reorder within the target column
        const colTasks = updated.filter(t => t.status === targetStatus);
        const oldIdx = colTasks.findIndex(t => t.id === activeId);
        const newIdx = COLUMN_IDS.has(overId as Task['status'])
            ? colTasks.length - 1  // dropped on empty column → end
            : colTasks.findIndex(t => t.id === overId);

        let reordered = colTasks;
        if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
            reordered = arrayMove(colTasks, oldIdx, newIdx);
        }
        reordered = reordered.map((t, i) => ({ ...t, order: i }));

        const others = updated.filter(t => t.status !== targetStatus);
        updated = [...others, ...reordered];
        onTasksChange(updated);

        // Persist
        await Promise.all(
            reordered.map(t =>
                supabase.from('tasks').update({ status: t.status, order: t.order }).eq('id', t.id)
            )
        );
    }

    async function addTask(status: Task['status'], title: string, dueDate: string | null) {
        const colTasks = tasks.filter(t => t.status === status);
        const { data } = await supabase.from('tasks').insert({
            project_id: project.id,
            title,
            status,
            due_date: dueDate || null,
            order: colTasks.length,
        }).select().single();
        if (data) onTasksChange([...tasks, data]);
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
            <div className="px-8 py-5 border-b border-[#323234] flex-shrink-0">
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

            {/* Kanban columns */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden">
                <DndContext
                    sensors={sensors}
                    collisionDetection={pointerWithin}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="flex gap-5 h-full p-4 md:p-8 min-w-max">
                        {COLUMNS.map(col => (
                            <KanbanColumn
                                key={col.id}
                                id={col.id}
                                label={col.label}
                                tasks={tasks.filter(t => t.status === col.id)}
                                onAddTask={(title: string, dueDate: string | null) => addTask(col.id, title, dueDate)}
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
