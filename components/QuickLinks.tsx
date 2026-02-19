'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import { ExternalLink, Plus, Trash2, Edit2, GripVertical } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    pointerWithin,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    DragStartEvent,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface QuickLink {
    id: string;
    title: string;
    url: string;
    image_url: string | null;
    category: string;
    position: number;
}

// Sortable Item Component
function SortableLink({ link, onEdit, onDelete }: { link: QuickLink; onEdit: (l: QuickLink) => void; onDelete: (id: string) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: link.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.3 : 1,
        position: 'relative' as const,
    };

    return (
        <div ref={setNodeRef} style={style} className="group relative h-full">
            <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-active hover:bg-[#323234] rounded-md p-2.5 flex flex-col items-center justify-center gap-1.5 transition-all h-full"
                title={link.title}
            >
                {/* Drag Handle - Only visible on hover */}
                <div
                    {...attributes}
                    {...listeners}
                    className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing p-1 hover:bg-white/10 rounded touch-none"
                    onClick={(e) => e.preventDefault()}
                >
                    <GripVertical size={12} className="text-text-secondary" />
                </div>

                <div className="w-6 h-6 flex items-center justify-center">
                    {link.image_url ? (
                        <img
                            src={link.image_url}
                            alt={link.title}
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <ExternalLink size={16} className="text-text-secondary" />
                    )}
                </div>
                <span className="text-[10px] text-text-secondary group-hover:text-text-primary transition-colors text-center line-clamp-1 w-full px-1">
                    {link.title}
                </span>
            </a>
            <div className="absolute top-0.5 right-0.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        onEdit(link);
                    }}
                    className="bg-accent-blue hover:bg-accent-blue/90 rounded-md p-1 group/btn shadow-lg"
                    title="Edit Link"
                >
                    <Edit2 size={8} className="text-white" />
                </button>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        onDelete(link.id);
                    }}
                    className="bg-red-500 hover:bg-red-600 rounded-md p-1 group/btn shadow-lg"
                    title="Delete Link"
                >
                    <Trash2 size={8} className="text-white" />
                </button>
            </div>
        </div>
    );
}

export default function QuickLinks() {
    const [links, setLinks] = useState<QuickLink[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [editingLink, setEditingLink] = useState<QuickLink | null>(null);
    const [formData, setFormData] = useState({ title: '', url: '', image_url: '', category: 'frequent' });
    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor), // Removed constraint for testing
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const fetchLinks = useCallback(async () => {
        // Fetch order by position ascending
        const { data } = await supabase
            .from('quick_links')
            .select('*')
            .order('position', { ascending: true }) // Sort by position
            .order('created_at', { ascending: true }); // Fallback sorting

        if (data) {
            // Ensure position is set if missing (for legacy data)
            const fixedData = data.map((l, idx) => ({
                ...l,
                position: l.position ?? idx
            }));
            setLinks(fixedData);
        }
    }, [setLinks]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchLinks();
    }, [fetchLinks]);

    async function handleSave() {
        if (!formData.title || !formData.url) return;

        // Calculate new position: last in category or list
        const categoryLinks = links.filter(l => l.category === formData.category);
        const nextPosition = categoryLinks.length > 0
            ? Math.max(...categoryLinks.map(l => l.position)) + 1
            : 0;

        const payload = {
            title: formData.title,
            url: formData.url,
            image_url: formData.image_url || null,
            category: formData.category,
            position: editingLink ? editingLink.position : nextPosition,
        };

        let error;
        if (editingLink) {
            const { error: updateError } = await supabase
                .from('quick_links')
                .update(payload)
                .eq('id', editingLink.id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('quick_links')
                .insert(payload);
            error = insertError;
        }

        if (!error) {
            resetForm();
            fetchLinks();
        }
    }

    function resetForm() {
        setFormData({ title: '', url: '', image_url: '', category: 'frequent' });
        setIsAdding(false);
        setEditingLink(null);
    }

    function startEdit(link: QuickLink) {
        setEditingLink(link);
        setFormData({
            title: link.title,
            url: link.url,
            image_url: link.image_url || '',
            category: link.category,
        });
        setIsAdding(true);
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this link?')) return;
        await supabase.from('quick_links').delete().eq('id', id);
        fetchLinks();
    }

    function handleDragStart(event: DragStartEvent) {
        setActiveId(event.active.id as string);
    }

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        setActiveId(null);

        if (over && active.id !== over.id) {
            const oldIndex = links.findIndex((l) => l.id === active.id);
            const newIndex = links.findIndex((l) => l.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                const newLinks = arrayMove(links, oldIndex, newIndex);

                // Update positions based on new index
                // We only need to update position for items in the same category that were affected
                // But simplified: just update positions for all in the target category based on new order

                // NOTE: Dragging might move item between categories if we supported that, but here
                // we are sorting within categories or global?
                // The SortableContext needs to be per container (category) or global?
                // The current UI displays categories separately.
                // We should probably only allow sorting *within* a category for simplicity first.
                // Or if we drag between categories, we need to update category too.

                // Let's assume sorting within generic list for now, but UI is grouped.
                // If UI is grouped, we need separate SortableContexts or one big one?
                // Actually, if we use one big list but display grouped, reordering visually might be tricky
                // if items jump categories.
                // Let's restrict sorting to be within the same category for now visually.

                // Wait, the UI renders `categoryOrder.map`.
                // So we should have a `SortableContext` per category.

                // Updating local state first
                setLinks(newLinks);

                // Update database
                // Re-calculate positions for ALL links in the affected category to be safe and simple
                // If different categories (shouldn't happen if we constrain DND), we'd need to handle that.
                // For now, let's just save the new order of everything to be consistent?
                // Or just the affected ones.

                // Simple approach: Update all positions from the new array
                const updates = newLinks.map((link, index) => ({
                    id: link.id,
                    position: index,
                }));

                // Batch update positions
                // Supabase doesn't support bulk update easily in one query for different values
                // without stored procedure or upsert with all fields.
                // We can use upsert if we include all required fields, or loop.
                // Loop is inefficient but fine for small lists (~10-20 items).

                // Better: Create a stored procedure or use Promise.all
                await Promise.all(updates.map(u =>
                    supabase.from('quick_links').update({ position: u.position }).eq('id', u.id)
                ));
            }
        }
    }

    // Group links by category for rendering
    // But for DND we need to handle sorting.
    // If we want to sort *within* a category, we need to filter links per category.

    // Let's update the sorting logic in handleDragEnd to specific category contexts.

    const categoryOrder = ['frequent', 'other'];
    const categoryLabels: Record<string, string> = {
        frequent: 'Frequent',
        other: 'Other',
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="bg-surface rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-white">Quick Links</h3>
                    <button
                        onClick={() => {
                            if (isAdding) resetForm();
                            else setIsAdding(true);
                        }}
                        className="p-1.5 bg-accent-blue hover:bg-accent-blue/90 rounded-lg transition-all"
                    >
                        <Plus size={14} className={`text-white transition-transform ${isAdding ? 'rotate-45' : ''}`} />
                    </button>
                </div>

                {/* Link Form (Add or Edit) */}
                {isAdding && (
                    <div className="mb-4 p-3 bg-active rounded-lg space-y-2 border border-white/5">
                        <p className="text-[10px] uppercase font-bold text-text-secondary px-1">
                            {editingLink ? 'Edit Link' : 'Add New Link'}
                        </p>
                        <input
                            type="text"
                            placeholder="Title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full bg-background rounded px-2 py-1 text-xs text-text-primary border border-white/5 focus:border-accent-blue outline-none transition-colors"
                        />
                        <input
                            type="text"
                            placeholder="URL"
                            value={formData.url}
                            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                            className="w-full bg-background rounded px-2 py-1 text-xs text-text-primary border border-white/5 focus:border-accent-blue outline-none transition-colors"
                        />
                        <input
                            type="text"
                            placeholder="Image URL (optional)"
                            value={formData.image_url}
                            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                            className="w-full bg-background rounded px-2 py-1 text-xs text-text-primary border border-white/5 focus:border-accent-blue outline-none transition-colors"
                        />
                        <div className="flex gap-2">
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="bg-background rounded px-2 py-1 text-xs text-text-primary border border-white/5 focus:border-accent-blue outline-none transition-colors flex-1"
                            >
                                <option value="frequent">Frequent</option>
                                <option value="other">Other</option>
                            </select>
                            <button
                                onClick={handleSave}
                                className="bg-accent-blue hover:bg-accent-blue/90 text-white text-xs px-4 py-1.5 rounded font-medium transition-colors"
                            >
                                {editingLink ? 'Update' : 'Add'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Categories in vertical columns */}
                <div className="grid grid-cols-2 gap-4">
                    {categoryOrder.map((category) => {
                        // Filter links for this category
                        const categoryLinks = links.filter(l => l.category === category);

                        return (
                            <div key={category}>
                                <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2 px-1">
                                    {categoryLabels[category]}
                                </h4>
                                <SortableContext
                                    id={category}
                                    items={categoryLinks.map(l => l.id)}
                                    strategy={rectSortingStrategy}
                                >
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {categoryLinks.map((link) => (
                                            <SortableLink
                                                key={link.id}
                                                link={link}
                                                onEdit={startEdit}
                                                onDelete={handleDelete}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </div>
                        );
                    })}
                </div>
            </div>
            {/* Drag Overlay for smooth dragging preview */}
            <DragOverlay>
                {activeId ? (
                    <div className="bg-active rounded-md p-2.5 flex flex-col items-center justify-center gap-1.5 h-full opacity-80 cursor-grabbing border border-accent-blue shadow-xl w-[100px] h-[80px]">
                        <div className="w-6 h-6 flex items-center justify-center">
                            <ExternalLink size={16} className="text-text-secondary" />
                        </div>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
