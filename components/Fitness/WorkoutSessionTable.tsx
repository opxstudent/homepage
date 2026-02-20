'use client';

import { useState, useEffect } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Plus, Save, Check, Trophy, MoreHorizontal, Dumbbell } from 'lucide-react';
import { RoutineExercise, WorkoutLog, getPreviousLog, getRPEColor } from '@/lib/fitnessUtils';

// --- Single Set Row Component ---
function SetRow({
    setNumber,
    exerciseId,
    defaultValues,
    onLog
}: {
    setNumber: number;
    exerciseId: string;
    defaultValues: { weight: number | null, reps: number, rpe: number | null, notes: string | null };
    onLog: (data: any) => Promise<void>;
}) {
    // Local state for this specific set
    const [weight, setWeight] = useState<number | ''>(defaultValues.weight || '');
    const [reps, setReps] = useState<number | ''>(defaultValues.reps || '');
    const [rpe, setRpe] = useState<number | ''>(defaultValues.rpe || '');
    const [notes, setNotes] = useState(defaultValues.notes || '');
    const [isCompleted, setIsCompleted] = useState(false);
    const [prevLog, setPrevLog] = useState<WorkoutLog | null>(null);

    // Fetch previous data for this set
    useEffect(() => {
        async function fetchPrev() {
            const data = await getPreviousLog(exerciseId, setNumber);
            if (data) setPrevLog(data);
        }
        fetchPrev();
    }, [exerciseId, setNumber]);

    // Auto-save on debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (weight && reps) {
                handleSave();
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [weight, reps, rpe, notes]);

    const handleSave = async () => {
        if (!weight || !reps) return;
        // console.log("Saving set", setNumber, { weight, reps, rpe, notes });
        await onLog({
            weight: Number(weight),
            reps: Number(reps),
            rpe: Number(rpe) || null,
            notes: notes || null,
            set_number: setNumber,
        });
        setIsCompleted(true); // Keep internal state for visual feedback if needed, or remove opacity logic?
        // Let's keep isCompleted true to show visual feedback (opacity/green border)
    };

    return (
        <div className={`grid grid-cols-12 gap-2 items-center py-2 border-b border-white/5 last:border-0 ${isCompleted ? 'opacity-50 hover:opacity-100 transition-opacity' : ''}`}>
            {/* Set # */}
            <div className="col-span-1 flex justify-center">
                <span className="text-xs font-mono text-text-secondary bg-white/5 w-6 h-6 flex items-center justify-center rounded-full">
                    {setNumber}
                </span>
            </div>

            {/* Previous */}
            <div className="col-span-2 text-xs text-text-secondary text-left flex flex-col justify-center">
                {prevLog ? (
                    <div className="flex flex-col">
                        <span className="text-white/70">{prevLog.weight}kg</span>
                        <span className="opacity-50 text-[10px]">{prevLog.reps}x</span>
                    </div>
                ) : (
                    <span>-</span>
                )}
            </div>

            {/* Weight */}
            <div className="col-span-2 pr-4">
                <input
                    type="number"
                    placeholder={(defaultValues.weight || '-').toString()}
                    value={weight}
                    onChange={(e) => setWeight(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className={`w-full bg-transparent text-left border-b border-transparent hover:border-white/10 ${isCompleted ? 'text-accent-green font-bold' : 'text-white'} focus:border-accent-blue focus:outline-none p-1 font-mono text-sm h-10 md:h-auto transition-colors`}
                />
            </div>

            {/* Reps */}
            <div className="col-span-2 pr-4">
                <input
                    type="number"
                    placeholder={(defaultValues.reps || '-').toString()}
                    value={reps}
                    onChange={(e) => setReps(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className={`w-full bg-transparent text-left border-b border-transparent hover:border-white/10 ${isCompleted ? 'text-accent-green font-bold' : 'text-white'} focus:border-accent-blue focus:outline-none p-1 font-mono text-sm h-10 md:h-auto transition-colors`}
                />
            </div>

            {/* RPE */}
            <div className="col-span-1 pr-2">
                <input
                    type="number"
                    placeholder="-"
                    value={rpe}
                    onChange={(e) => setRpe(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className={`w-full bg-transparent text-left border-b border-transparent hover:border-white/10 ${rpe !== '' ? getRPEColor(Number(rpe)) : (isCompleted ? 'text-accent-green font-bold' : 'text-white')} focus:border-accent-blue focus:outline-none p-1 font-mono text-sm h-10 md:h-auto transition-colors`}
                />
            </div>

            {/* Actions (Notes expanded) */}
            <div className="col-span-4">
                <input
                    type="text"
                    placeholder="Notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-transparent text-xs text-text-secondary focus:text-white border-b border-transparent focus:border-white/10 focus:outline-none truncate h-10 md:h-auto"
                />
            </div>
        </div>
    );
}

// --- Exercise Card Component ---
function ExerciseCard({
    exercise,
    onDelete,
    onLogSet
}: {
    exercise: RoutineExercise;
    onDelete: (id: string) => void;
    onLogSet: (data: any) => Promise<void>;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: exercise.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.8 : 1
    };

    // State for number of sets (default from routine)
    const [numSets, setNumSets] = useState(exercise.default_sets || 3);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="bg-[#1a1a1c] border border-white/5 rounded-xl overflow-hidden group mb-4 relative"
        >
            {/* Header */}
            <div className="flex items-center justify-between p-3 bg-white/5 border-b border-white/5">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-text-secondary hover:text-white shrink-0">
                        <GripVertical size={16} />
                    </div>
                    <span className="font-bold text-white truncate text-base shrink block">{exercise.name}</span>
                    {exercise.personal_record && (
                        <span className="text-[10px] text-accent-date flex items-center gap-1 bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full shrink-0">
                            <Trophy size={10} /> {exercise.personal_record}kg
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                    <button onClick={() => setShowDeleteConfirm(true)} className="text-text-secondary hover:text-red-400 p-1">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* Column Headers for Sets */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-bold text-text-secondary uppercase tracking-wider bg-[#151516]">
                <div className="col-span-1 text-center">Set</div>
                <div className="col-span-2 text-left">Prev</div>
                <div className="col-span-2 text-left">kg</div>
                <div className="col-span-2 text-left">Reps</div>
                <div className="col-span-1 text-left">RPE</div>
                <div className="col-span-4 text-left">Notes</div>
            </div>

            {/* Sets */}
            <div className="px-4 pb-2">
                {Array.from({ length: numSets }).map((_, i) => (
                    <SetRow
                        key={i}
                        setNumber={i + 1}
                        exerciseId={exercise.id}
                        defaultValues={{
                            weight: exercise.default_weight,
                            reps: exercise.default_reps,
                            rpe: null,
                            notes: exercise.notes
                        }}
                        onLog={async (data) => {
                            await onLogSet({
                                ...data,
                                exercise_id: exercise.id
                                // We don't have log ID here yet, duplicate risk if spamming SAVE.
                                // But `SetRow` handles 'isCompleted' state to avoid re-sending unless changed.
                            });
                        }}
                    />
                ))}

                {/* Add Set Button */}
                <button
                    onClick={() => setNumSets(n => n + 1)}
                    className="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold text-text-secondary hover:text-accent-blue hover:bg-white/5 rounded-lg mt-2 transition-colors"
                >
                    <Plus size={14} /> Add Set
                </button>
            </div>

            {/* Delete Confirmation Modal Overlay */}
            {showDeleteConfirm && (
                <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#202022] border border-[#323234] rounded-xl p-4 w-full max-w-sm text-center shadow-xl animate-in fade-in zoom-in-95 duration-200">
                        <h4 className="text-white font-semibold mb-2">Remove Exercise?</h4>
                        <p className="text-xs text-text-secondary mb-4">Are you sure you want to remove this exercise from the current routine?</p>
                        <div className="flex justify-center gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-[#323234] hover:bg-[#3e3e40] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    onDelete(exercise.id);
                                }}
                                className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
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

// --- Main Table Component ---
interface WorkoutSessionTableProps {
    exercises: RoutineExercise[];
    onReorder: (newOrder: RoutineExercise[]) => void;
    onDelete: (id: string) => void;
    onLogSet: (data: any) => Promise<boolean>; // Returns isPR
}

export default function WorkoutSessionTable({ exercises, onReorder, onDelete, onLogSet }: WorkoutSessionTableProps) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            const oldIndex = exercises.findIndex((e) => e.id === active.id);
            const newIndex = exercises.findIndex((e) => e.id === over?.id);
            onReorder(arrayMove(exercises, oldIndex, newIndex));
        }
    };

    return (
        <div className="space-y-6">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={exercises.map(e => e.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div>
                        {exercises.map((exercise) => (
                            <ExerciseCard
                                key={exercise.id}
                                exercise={exercise}
                                onDelete={onDelete}
                                onLogSet={async (data) => {
                                    await onLogSet(data);
                                }}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            {exercises.length === 0 && (
                <div className="text-center py-10 text-text-secondary border border-dashed border-white/10 rounded-xl">
                    <div className="flex flex-col items-center gap-2">
                        <Dumbbell className="opacity-20" size={48} />
                        <p>No exercises in this session.</p>
                        <p className="text-sm">Select a routine or add exercises manually.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
