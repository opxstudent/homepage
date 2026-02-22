'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Dumbbell, Plus, Play, Calendar, Timer, Flame, TrendingUp, ChevronRight, X, LayoutGrid, Zap, Trash2, Edit2, Pencil, GripVertical } from 'lucide-react';
import { getWorkoutGroups, getRoutineExercises, getAllExercises, createWorkoutGroup, createExercise, updateExercise, deleteExercise, getFitnessStats, logSet, addExerciseToRoutine, updateRoutineExercise, removeExerciseFromRoutine, deleteWorkoutGroup, updateRoutineExercisesOrder, WorkoutGroup, Exercise, RoutineExercise, FitnessStats } from '@/lib/fitnessUtils';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import WorkoutSessionTable from '@/components/Fitness/WorkoutSessionTable';
import FitnessStatsDashboard from '@/components/Fitness/FitnessStats';
import WorkoutHistory from '@/components/Fitness/WorkoutHistory';
import { v4 as uuidv4 } from 'uuid';

type ViewState = 'dashboard' | 'group_select' | 'workout' | 'custom_setup' | 'free_session' | 'exercises' | 'history';

function SortableExerciseRow({
    exercise,
    index,
    selectedGroupId,
    onDelete,
    onUpdate
}: {
    exercise: RoutineExercise,
    index: number,
    selectedGroupId: string | null,
    onDelete: (id: string) => void,
    onUpdate: (id: string, updates: any) => Promise<void>
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
        zIndex: isDragging ? 2 : 1,
        opacity: isDragging ? 0.9 : 1
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="bg-[#202022] rounded-xl p-3 border border-white/5 flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 group relative"
        >
            <div className="flex items-center gap-3 w-full md:flex-1 min-w-0">
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing text-text-secondary hover:text-white shrink-0 -ml-1"
                >
                    <GripVertical size={16} />
                </div>
                <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center text-xs text-text-secondary font-mono bg-white/5 rounded-full">
                    {index + 1}
                </div>
                <div className="flex-1 min-w-0 pr-4">
                    <div className="font-bold text-white truncate">{exercise.name}</div>
                    <div className="text-xs text-text-secondary truncate">{exercise.category}</div>
                </div>
                {/* Mobile Delete Button (visible on top row) */}
                <button
                    onClick={() => onDelete(exercise.id)}
                    className="md:hidden p-2 text-text-secondary hover:text-red-400 shrink-0"
                >
                    <Trash2 size={16} />
                </button>
            </div>

            {/* Defaults Editor */}
            <div className="flex flex-wrap md:flex-nowrap items-center gap-2 text-xs w-full md:w-auto justify-between md:justify-end bg-[#151516] md:bg-transparent p-2 md:p-0 rounded-lg shrink-0">
                <div className="flex flex-col items-center w-12">
                    <span className="text-text-secondary text-[10px] uppercase">Sets</span>
                    <input
                        type="number"
                        className="w-full bg-black/20 text-center rounded p-1 text-white focus:outline-accent-blue border border-transparent hover:border-white/10 transition-colors"
                        defaultValue={exercise.default_sets}
                        onBlur={async (e) => {
                            const val = parseInt(e.target.value);
                            if (val > 0) {
                                await onUpdate(exercise.id, { default_sets: val });
                            }
                        }}
                    />
                </div>
                <div className="flex flex-col items-center w-12">
                    <span className="text-text-secondary text-[10px] uppercase">Reps</span>
                    <input
                        type="number"
                        className="w-full bg-black/20 text-center rounded p-1 text-white focus:outline-accent-blue border border-transparent hover:border-white/10 transition-colors"
                        defaultValue={exercise.default_reps}
                        onBlur={async (e) => {
                            const val = parseInt(e.target.value);
                            if (val > 0) {
                                await onUpdate(exercise.id, { default_reps: val });
                            }
                        }}
                    />
                </div>
                <div className="flex flex-col items-center w-16">
                    <span className="text-text-secondary text-[10px] uppercase">Weight</span>
                    <input
                        type="number"
                        className="w-full bg-black/20 text-center rounded p-1 text-white focus:outline-accent-blue border border-transparent hover:border-white/10 transition-colors"
                        placeholder="-"
                        defaultValue={exercise.default_weight ?? ''}
                        onBlur={async (e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                                await onUpdate(exercise.id, { default_weight: val });
                            }
                        }}
                    />
                </div>
                <div className="flex flex-col items-center w-12">
                    <span className="text-text-secondary text-[10px] uppercase">Mins</span>
                    <input
                        type="number"
                        className="w-full bg-black/20 text-center rounded p-1 text-white focus:outline-accent-blue border border-transparent hover:border-white/10 transition-colors"
                        placeholder="-"
                        defaultValue={exercise.default_duration_mins ?? ''}
                        onBlur={async (e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                                await onUpdate(exercise.id, { default_duration_mins: val });
                            }
                        }}
                    />
                </div>
                <div className="flex flex-col items-start w-full md:w-32 mt-2 md:mt-0">
                    <span className="text-text-secondary text-[10px] uppercase md:hidden mb-1">Notes</span>
                    <input
                        type="text"
                        className="w-full bg-black/20 text-left rounded p-1 text-white text-xs focus:outline-accent-blue px-2 border border-transparent hover:border-white/10 transition-colors"
                        placeholder="Notes..."
                        defaultValue={exercise.notes ?? ''}
                        onBlur={async (e) => {
                            const val = e.target.value;
                            await onUpdate(exercise.id, { notes: val });
                        }}
                    />
                </div>
            </div>

            {/* Desktop Delete Button */}
            <button
                onClick={() => onDelete(exercise.id)}
                className="hidden md:block p-2 hover:bg-white/10 rounded-lg text-text-secondary hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
            >
                <Trash2 size={16} />
            </button>
        </div>
    );
}

export default function FitnessPage() {
    const [view, setView] = useState<ViewState>('dashboard');
    const [groups, setGroups] = useState<WorkoutGroup[]>([]);

    // Stats State
    const [stats, setStats] = useState<FitnessStats | null>(null);

    // Workout State
    // Now using RoutineExercise which has sets/reps defaults
    const [exercises, setExercises] = useState<RoutineExercise[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<WorkoutGroup | null>(null);
    const [sessionTitle, setSessionTitle] = useState('');

    // Loading States
    const [isLoading, setIsLoading] = useState(false);

    // Custom/Free Creation State
    const [showAddExercise, setShowAddExercise] = useState(false);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [routineExerciseIdToDelete, setRoutineExerciseIdToDelete] = useState<string | null>(null);
    const [newExerciseName, setNewExerciseName] = useState('');
    const [newGroupName, setNewGroupName] = useState('');

    // Master Library State (for adding exercises)
    const [masterLibrary, setMasterLibrary] = useState<Exercise[]>([]);

    // Dashboard Selection State
    const [dashboardRoutineId, setDashboardRoutineId] = useState<string>('free');
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);

    // DND Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Fetch initial data
    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        const [groupsData, statsData, libraryData] = await Promise.all([
            getWorkoutGroups(),
            getFitnessStats(),
            getAllExercises()
        ]);
        setGroups(groupsData);
        setStats(statsData);
        setMasterLibrary(libraryData);
    };

    // --- Actions ---

    const handleStartWorkout = () => {
        // Use dashboard selection
        if (dashboardRoutineId === 'free') {
            handleStartFreeSession();
        } else {
            handleGroupSelect(dashboardRoutineId);
        }
    };

    const handleGroupSelect = async (groupId: string) => {
        if (groupId === 'free') {
            handleStartFreeSession();
            return;
        }

        const group = groups.find(g => g.id === groupId);
        if (!group) return;

        setSelectedGroupId(group.id);
        setSelectedGroup(group);
        setSessionTitle(group.name);
        setIsLoading(true);
        const data = await getRoutineExercises(group.id);
        setExercises(data);
        setIsLoading(false);
        setView('workout');
    };

    const handleStartFreeSession = async () => {
        setSelectedGroupId(null);
        setSelectedGroup(null);
        setSessionTitle('Free Session');
        setExercises([]); // Start empty
        setView('workout');
    };

    const handleAddExercise = async (name: string) => {
        // Check if exists in Master Library
        let exerciseId = '';
        let exerciseName = name.trim();
        let exerciseCategory: Exercise['category'] = 'Upper Body'; // Default
        let personalRecord = 0;

        const existing = masterLibrary.find(e => e.name.toLowerCase() === exerciseName.toLowerCase());

        if (existing) {
            exerciseId = existing.id;
            exerciseName = existing.name;
            exerciseCategory = existing.category;
            personalRecord = existing.personal_record || 0;
        } else {
            // Create new in Master Library
            const newEx = await createExercise(exerciseName);
            if (newEx) {
                exerciseId = newEx.id;
                exerciseName = newEx.name;
                exerciseCategory = newEx.category;
                personalRecord = 0;
                // Refresh library
                setMasterLibrary([...masterLibrary, newEx]);
            } else {
                return; // Failed
            }
        }

        // Logic split based on view
        if (view === 'exercises') {
            // Just add to library (already done above via createExercise)
            setNewExerciseName('');
            setShowAddExercise(false);
            return;
        }

        if (view === 'custom_setup' && selectedGroupId) {
            // Add to Routine (Database)
            // Check if already in routine
            if (exercises.some(e => e.id === exerciseId)) {
                alert("Exercise already in this routine.");
                return;
            }

            const success = await addExerciseToRoutine(selectedGroupId, exerciseId);
            if (success) {
                // Refresh routine exercises
                const updated = await getRoutineExercises(selectedGroupId);
                setExercises(updated);
                setNewExerciseName('');
                setShowAddExercise(false);
            }
        } else {
            // Add to Session (Local State)
            const newRoutineExercise: RoutineExercise = {
                id: exerciseId,
                name: exerciseName,
                category: exerciseCategory,
                personal_record: personalRecord,
                default_sets: 3,
                default_reps: 10,
                default_weight: null,
                default_duration_mins: null,
                notes: null,
                sort_order: exercises.length
            };
            setExercises([...exercises, newRoutineExercise]);
            setNewExerciseName('');
            setShowAddExercise(false);
        }
    };

    const handleBack = () => {
        if (view === 'workout' || view === 'custom_setup' || view === 'exercises' || view === 'history') {
            setView('dashboard');
            setExercises([]);
            loadInitialData(); // Refresh stats on return
        }
    };

    // --- Renderers ---

    const renderDashboard = () => (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in duration-300">
            {/* Stats Widget */}
            <div className="w-full">
                {stats ? <FitnessStatsDashboard stats={stats} /> : (
                    <div className="h-48 flex items-center justify-center text-text-secondary animate-pulse">Loading Stats...</div>
                )}
            </div>

            {/* Main Action Area */}
            <div className="flex flex-col items-center gap-6">

                {/* Routine Selector & Start Button Group */}
                <div className="flex flex-col md:flex-row items-center gap-4 bg-[#1a1a1c] p-2 rounded-2xl border border-white/10 shadow-lg">
                    {/* Selector */}
                    <div className="relative group px-2">
                        <select
                            value={dashboardRoutineId}
                            onChange={(e) => setDashboardRoutineId(e.target.value)}
                            className="appearance-none bg-transparent hover:bg-white/5 text-lg font-bold text-white rounded-lg pr-8 py-2 pl-4 focus:outline-none focus:bg-white/10 transition-colors cursor-pointer w-full md:w-64"
                        >
                            <option value="free" className="bg-[#1a1a1c]">Free Session</option>
                            <option disabled className="bg-[#1a1a1c]">──────────</option>
                            {groups.map(g => (
                                <option key={g.id} value={g.id} className="bg-[#1a1a1c]">{g.name}</option>
                            ))}
                        </select>
                        <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none rotate-90" size={16} />
                    </div>

                    {/* Start Button */}
                    <button
                        onClick={handleStartWorkout}
                        className="group relative px-8 py-3 bg-white text-black font-bold text-lg rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-105 transition-all flex items-center gap-2 overflow-hidden whitespace-nowrap"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:animate-shimmer" />
                        <Play fill="currentColor" size={20} />
                        Start Session
                    </button>
                </div>

                {/* Management Links */}
                <div className="flex gap-4 text-xs text-text-secondary uppercase tracking-wider font-bold mt-2">
                    <button onClick={() => setView('custom_setup')} className="hover:text-white flex items-center gap-1 transition-colors">
                        <LayoutGrid size={16} /> Manage Routines
                    </button>
                    {/* Placeholder for future Exercise Library management */}
                    <button onClick={() => setView('exercises')} className="hover:text-white flex items-center gap-1 transition-colors">
                        <Dumbbell size={16} /> Exercise Library
                    </button>
                    <button onClick={() => setView('history')} className="hover:text-white flex items-center gap-1 transition-colors">
                        <Calendar size={16} /> History
                    </button>
                </div>
            </div>
        </div>
    );

    // renderGroupSelect removed as requested (merged into Dropdown)
    const renderGroupSelect = () => null;

    const renderWorkoutView = () => (
        <div className="max-w-4xl mx-auto h-full flex flex-col animate-in fade-in slide-in-from-right-8 duration-300">
            {/* Workout Header Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Session Routine</label>
                    <div className="relative group">
                        <select
                            value={selectedGroupId || 'free'}
                            onChange={(e) => handleGroupSelect(e.target.value)}
                            className="appearance-none bg-transparent hover:bg-white/5 text-2xl font-bold text-white rounded-lg pr-8 py-1 -ml-2 p-2 focus:outline-none focus:bg-white/10 transition-colors cursor-pointer w-full md:w-auto"
                        >
                            <option value="free" className="bg-[#1a1a1c]">Free Session</option>
                            <option disabled className="bg-[#1a1a1c]">──────────</option>
                            {groups.map(g => (
                                <option key={g.id} value={g.id} className="bg-[#1a1a1c]">{g.name}</option>
                            ))}
                        </select>
                        <ChevronRight className="absolute right-0 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none rotate-90" size={20} />
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => setShowAddExercise(true)}
                        className="px-4 py-2 bg-[#1a1a1c] border border-white/10 text-white rounded-lg hover:bg-[#252527] transition-colors flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Add Exercise
                    </button>
                    {showCancelConfirm ? (
                        <div className="flex gap-2 animate-in fade-in slide-in-from-right-4 duration-200">
                            <button
                                onClick={() => setShowCancelConfirm(false)}
                                className="px-3 py-2 bg-white/5 border border-white/10 text-text-secondary rounded-lg hover:bg-white/10 transition-colors text-sm"
                            >
                                Keep
                            </button>
                            <button
                                onClick={() => {
                                    setExercises([]);
                                    setView('dashboard');
                                    setSessionTitle('');
                                    setSelectedGroupId(null);
                                    setSelectedGroup(null);
                                    setShowCancelConfirm(false);
                                }}
                                className="px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors font-semibold text-sm"
                            >
                                Confirm Cancel
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => {
                                if (exercises.length === 0) {
                                    setView('dashboard');
                                    setSessionTitle('');
                                    setSelectedGroupId(null);
                                    setSelectedGroup(null);
                                } else {
                                    setShowCancelConfirm(true);
                                }
                            }}
                            className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors font-semibold"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={() => {
                            setView('dashboard');
                            loadInitialData(); // Refresh stats
                        }}
                        className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Finish
                    </button>
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-[#0f0f11] rounded-2xl min-h-[400px]">
                <WorkoutSessionTable
                    exercises={exercises}
                    onReorder={setExercises}
                    onDelete={(id) => setExercises(exercises.filter(e => e.id !== id))}
                    onLogSet={async (data) => {
                        const { log, newPR } = await logSet(data);
                        if (newPR) {
                            loadInitialData(); // Refresh stats on PR
                            // Also update local state PR if needed
                        }
                        return log?.id;
                    }}
                />
            </div>

            {/* Add Exercise Modal / Input Area (Shared) */}
            {showAddExercise && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1a1a1c] border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">
                                {view === 'custom_setup' ? 'Add to Routine' : 'Add to Session'}
                            </h3>
                            <button onClick={() => setShowAddExercise(false)} className="text-text-secondary hover:text-white"><X size={20} /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-text-secondary uppercase font-bold mb-2 block">Exercise Name</label>
                                <div className="relative">
                                    <input
                                        autoFocus
                                        type="text"
                                        className="w-full bg-[#202022] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-blue"
                                        placeholder="Search or Create..."
                                        value={newExerciseName}
                                        onChange={e => setNewExerciseName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddExercise(newExerciseName)}
                                    />
                                    {/* Autocomplete suggestions */}
                                    {newExerciseName && (
                                        <div className="absolute top-full left-0 right-0 bg-[#252527] border border-white/10 rounded-xl mt-2 max-h-48 overflow-y-auto z-50 shadow-xl">
                                            {masterLibrary
                                                .filter(ex => ex.name.toLowerCase().includes(newExerciseName.toLowerCase()))
                                                .slice(0, 5)
                                                .map(ex => (
                                                    <button
                                                        key={ex.id}
                                                        onClick={() => handleAddExercise(ex.name)}
                                                        className="w-full text-left px-4 py-2 hover:bg-white/10 text-white flex justify-between items-center"
                                                    >
                                                        <span>{ex.name}</span>
                                                        <span className="text-xs text-text-secondary">{ex.category}</span>
                                                    </button>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => handleAddExercise(newExerciseName)}
                                disabled={!newExerciseName.trim()}
                                className="w-full bg-accent-blue text-black font-bold py-3 rounded-xl hover:bg-accent-blue/90 transition-colors disabled:opacity-50"
                            >
                                {view === 'custom_setup' ? 'Add to Routine' : 'Add to Session'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // Routine Creation State
    const [showCreateRoutine, setShowCreateRoutine] = useState(false);

    const renderCustomSetup = () => (
        <div className="max-w-6xl mx-auto h-[calc(100vh-140px)] flex flex-col md:flex-row gap-6 animate-in fade-in slide-in-from-right-8 duration-300">
            {/* Left Col: Routine List */}
            <div className={`w-full md:w-1/3 bg-[#1a1a1c] border border-white/5 rounded-2xl flex-col overflow-hidden ${selectedGroup ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#151516]">
                    <h3 className="font-bold text-white">Routines</h3>
                    <button
                        onClick={() => setShowCreateRoutine(true)}
                        className="p-1 hover:bg-white/10 rounded-lg text-accent-blue"
                    >
                        <Plus size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
                    {groups.map(g => (
                        <div
                            key={g.id}
                            onClick={async () => {
                                setSelectedGroupId(g.id);
                                setSelectedGroup(g);
                                setIsLoading(true);
                                const data = await getRoutineExercises(g.id);
                                setExercises(data);
                                setIsLoading(false);
                            }}
                            className={`p-3 rounded-xl cursor-pointer transition-colors flex justify-between items-center group ${selectedGroupId === g.id ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20' : 'hover:bg-white/5 text-text-secondary hover:text-white'}`}
                        >
                            <span className="font-medium truncate">{g.name}</span>
                            {selectedGroupId === g.id && (
                                <ChevronRight size={16} />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Col: Editor */}
            <div className={`flex-1 bg-[#1a1a1c] border border-white/5 rounded-2xl flex-col overflow-hidden ${selectedGroup ? 'flex' : 'hidden md:flex'}`}>
                {selectedGroup ? (
                    <>
                        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#151516]">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => { setSelectedGroup(null); setSelectedGroupId(null); }}
                                    className="md:hidden p-1 -ml-1 hover:bg-white/10 rounded-lg text-text-secondary"
                                >
                                    <ArrowLeft size={20} />
                                </button>
                                <div>
                                    <h3 className="font-bold text-white text-lg">{selectedGroup.name}</h3>
                                    <p className="text-xs text-text-secondary">{exercises.length} exercises</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowAddExercise(true)}
                                    className="px-3 py-1.5 bg-accent-blue text-black text-xs font-bold rounded-lg hover:bg-accent-blue/90 flex items-center gap-1"
                                >
                                    <Plus size={14} /> Add Exercise
                                </button>
                                {/* Delete Routine Button - Optional safety check? */}
                                <button
                                    onClick={() => setShowDeleteConfirmation(true)}
                                    className="px-3 py-1.5 bg-red-500/10 text-red-500 text-xs font-bold rounded-lg hover:bg-red-500/20"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                            {isLoading ? (
                                <div className="text-center py-10 text-text-secondary">Loading exercises...</div>
                            ) : exercises.length === 0 ? (
                                <div className="text-center py-20 text-text-secondary border border-dashed border-white/10 rounded-xl">
                                    No exercises in this routine.<br /> Click "Add Exercise" to populate it.
                                </div>
                            ) : (
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={async (event: DragEndEvent) => {
                                        const { active, over } = event;
                                        if (over && active.id !== over.id) {
                                            const oldIndex = exercises.findIndex((ex) => ex.id === active.id);
                                            const newIndex = exercises.findIndex((ex) => ex.id === over.id);
                                            const newOrder = arrayMove(exercises, oldIndex, newIndex);
                                            setExercises(newOrder);

                                            if (selectedGroupId) {
                                                await updateRoutineExercisesOrder(
                                                    selectedGroupId,
                                                    newOrder.map(e => e.id)
                                                );
                                            }
                                        }
                                    }}
                                >
                                    <SortableContext
                                        items={exercises.map(ex => ex.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="space-y-3">
                                            {exercises.map((ex, idx) => (
                                                <SortableExerciseRow
                                                    key={ex.id}
                                                    exercise={ex}
                                                    index={idx}
                                                    selectedGroupId={selectedGroupId}
                                                    onDelete={(id) => setRoutineExerciseIdToDelete(id)}
                                                    onUpdate={async (id, updates) => {
                                                        if (selectedGroupId) {
                                                            await updateRoutineExercise(selectedGroupId, id, updates);
                                                        }
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            )}
                        </div>

                        {/* Exercise Delete Confirmation Modal */}
                        {routineExerciseIdToDelete && (
                            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                                <div className="bg-[#202022] border border-[#323234] rounded-xl p-4 w-full max-w-sm text-center shadow-xl animate-in fade-in zoom-in-95 duration-200">
                                    <h4 className="text-white font-semibold mb-2">Remove Exercise?</h4>
                                    <p className="text-xs text-text-secondary mb-4">Are you sure you want to remove this exercise from the routine?</p>
                                    <div className="flex justify-center gap-3">
                                        <button
                                            onClick={() => setRoutineExerciseIdToDelete(null)}
                                            className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-[#323234] hover:bg-[#3e3e40] transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (selectedGroupId && routineExerciseIdToDelete) {
                                                    const success = await removeExerciseFromRoutine(selectedGroupId, routineExerciseIdToDelete);
                                                    if (success) {
                                                        setExercises(exercises.filter(e => e.id !== routineExerciseIdToDelete));
                                                    }
                                                }
                                                setRoutineExerciseIdToDelete(null);
                                            }}
                                            className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-text-secondary">
                        <div className="text-center">
                            <p>Select a routine from the left to edit.</p>
                            <p className="text-xs mt-2 opacity-50">or create a new one</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Re-use the Add Exercise Modal but change logic based on 'view' */}
            {/* If view === 'custom_setup', adding exercise adds to ROUTINE (db), not session (local state) */}
        </div>
    );

    // Exercise Management State
    const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editName, setEditName] = useState('');
    const [editCategory, setEditCategory] = useState<Exercise['category']>('Upper Body');

    const handleEditExercise = (exercise: Exercise) => {
        setEditingExercise(exercise);
        setEditName(exercise.name);
        setEditCategory(exercise.category || 'Upper Body');
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!editingExercise || !editName.trim()) return;

        const success = await updateExercise(editingExercise.id, {
            name: editName.trim(),
            category: editCategory
        });

        if (success) {
            // Update local state
            setMasterLibrary(masterLibrary.map(ex =>
                ex.id === editingExercise.id
                    ? { ...ex, name: editName.trim(), category: editCategory }
                    : ex
            ));
            setShowEditModal(false);
            setEditingExercise(null);
        }
    };

    // Sorted Library for List View
    const sortedLibrary = [...masterLibrary].sort((a, b) => {
        if (a.category === b.category) {
            return a.name.localeCompare(b.name);
        }
        return (a.category || '').localeCompare(b.category || '');
    });

    // Group by category for list view headers
    const groupedLibrary = sortedLibrary.reduce((acc, ex) => {
        const cat = ex.category || 'Uncategorized';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(ex);
        return acc;
    }, {} as Record<string, Exercise[]>);

    const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(null);

    const handleDeleteClick = (exercise: Exercise) => {
        setExerciseToDelete(exercise);
    };

    const confirmDeleteExercise = async () => {
        if (!exerciseToDelete) return;

        const success = await deleteExercise(exerciseToDelete.id);
        if (success) {
            setMasterLibrary(masterLibrary.filter(ex => ex.id !== exerciseToDelete.id));
            setExerciseToDelete(null);
        }
    };

    // --- Renderers ---

    const renderExerciseLibrary = () => (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Exercise Library</h2>
                <button
                    onClick={() => setShowAddExercise(true)}
                    className="px-4 py-2 bg-accent-blue text-black font-bold rounded-lg hover:bg-accent-blue/90 flex items-center gap-2"
                >
                    <Plus size={18} /> New Exercise
                </button>
            </div>

            <div className="bg-[#1a1a1c] border border-white/5 rounded-xl p-6 space-y-8">
                {Object.entries(groupedLibrary).map(([category, exercises]) => (
                    <div key={category}>
                        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-accent-blue"></span>
                            {category}
                            <span className="text-sm font-normal text-text-secondary">({exercises.length})</span>
                        </h3>
                        <div className="space-y-2">
                            {exercises.map(ex => (
                                <div key={ex.id} className="flex flex-col md:flex-row md:justify-between md:items-center p-3 bg-white/5 rounded-lg border border-transparent hover:border-white/10 transition-all group gap-2 md:gap-0">
                                    <div className="flex items-center gap-4">
                                        <div className="font-medium text-white break-words">{ex.name}</div>
                                    </div>
                                    <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity self-end md:self-auto">
                                        <button
                                            onClick={() => handleEditExercise(ex)}
                                            className="p-2 hover:bg-white/10 rounded-lg text-text-secondary hover:text-white"
                                            title="Edit"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(ex)}
                                            className="p-2 hover:bg-red-500/10 rounded-lg text-text-secondary hover:text-red-500"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {masterLibrary.length === 0 && (
                    <div className="text-center py-10 text-text-secondary">
                        No exercises found. Create one to get started.
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="flex-1 p-4 md:p-8 overflow-y-auto h-screen relative scrollbar-hide">
            {/* Header / Nav */}
            <header className="flex items-center justify-between gap-4 mb-8 py-2">
                <div className="flex items-center gap-2">
                    {view !== 'dashboard' && (
                        <button
                            onClick={handleBack}
                            className="p-2 -ml-2 hover:bg-white/5 rounded-full text-text-secondary hover:text-white transition-colors"
                        >
                            <ArrowLeft size={24} />
                        </button>
                    )}
                    <div className="flex items-center gap-3">
                        <Dumbbell className="text-accent-blue" size={24} />
                        <span className="font-bold text-xl tracking-tight text-white">
                            {view === 'dashboard' ? 'Fitness Hub' : 'Back to Hub'}
                        </span>
                    </div>
                </div>

                {view === 'dashboard' && (
                    // Start button moved to main content
                    null
                )}
            </header>

            <div className="pb-20">
                {view === 'dashboard' && renderDashboard()}
                {view === 'group_select' && renderGroupSelect()}
                {view === 'workout' && renderWorkoutView()}
                {view === 'custom_setup' && renderCustomSetup()}
                {view === 'exercises' && renderExerciseLibrary()}
                {view === 'history' && <WorkoutHistory />}
            </div>

            {/* Add Exercise Modal / Input Area (Shared) */}
            {showAddExercise && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1a1a1c] border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">
                                {view === 'custom_setup' ? 'Add to Routine' : (view === 'exercises' ? 'Add to Library' : 'Add to Session')}
                            </h3>
                            <button onClick={() => setShowAddExercise(false)} className="text-text-secondary hover:text-white"><X size={20} /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-text-secondary uppercase font-bold mb-2 block">Exercise Name</label>
                                <div className="relative">
                                    <input
                                        autoFocus
                                        type="text"
                                        className="w-full bg-[#202022] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-blue"
                                        placeholder="Search or Create..."
                                        value={newExerciseName}
                                        onChange={e => setNewExerciseName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddExercise(newExerciseName)}
                                    />
                                    {/* Autocomplete suggestions */}
                                    {newExerciseName && (
                                        <div className="absolute top-full left-0 right-0 bg-[#252527] border border-white/10 rounded-xl mt-2 max-h-48 overflow-y-auto z-50 shadow-xl">
                                            {masterLibrary
                                                .filter(ex => ex.name.toLowerCase().includes(newExerciseName.toLowerCase()))
                                                .slice(0, 5)
                                                .map(ex => (
                                                    <button
                                                        key={ex.id}
                                                        onClick={() => handleAddExercise(ex.name)}
                                                        className="w-full text-left px-4 py-2 hover:bg-white/10 text-white flex justify-between items-center"
                                                    >
                                                        <span>{ex.name}</span>
                                                        <span className="text-xs text-text-secondary">{ex.category}</span>
                                                    </button>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => handleAddExercise(newExerciseName)}
                                disabled={!newExerciseName.trim()}
                                className="w-full bg-accent-blue text-black font-bold py-3 rounded-xl hover:bg-accent-blue/90 transition-colors disabled:opacity-50"
                            >
                                {view === 'custom_setup' ? 'Add to Routine' : (view === 'exercises' ? 'Add to Library' : 'Add to Session')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Edit Exercise Modal */}
            {showEditModal && editingExercise && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-[#1a1a1c] border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">Edit Exercise</h3>
                            <button onClick={() => setShowEditModal(false)} className="text-text-secondary hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-text-secondary uppercase font-bold mb-2 block">Name</label>
                                <input
                                    autoFocus
                                    type="text"
                                    className="w-full bg-[#202022] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-blue"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-text-secondary uppercase font-bold mb-2 block">Category</label>
                                <select
                                    className="w-full bg-[#202022] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-blue appearance-none"
                                    value={editCategory}
                                    onChange={e => setEditCategory(e.target.value as any)}
                                >
                                    <option value="Upper Body">Upper Body</option>
                                    <option value="Lower Body">Lower Body</option>
                                    <option value="Cardio">Cardio</option>
                                    <option value="Functional">Functional</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 bg-white/5 text-white font-bold py-3 rounded-xl hover:bg-white/10"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={!editName.trim()}
                                    className="flex-1 bg-accent-blue text-black font-bold py-3 rounded-xl hover:bg-accent-blue/90 disabled:opacity-50"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Exercise Modal */}
            {exerciseToDelete && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-[#1a1a1c] border border-white/10 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">Delete Exercise?</h3>
                            <button onClick={() => setExerciseToDelete(null)} className="text-text-secondary hover:text-white"><X size={20} /></button>
                        </div>
                        <p className="text-text-secondary">
                            Are you sure you want to delete <span className="font-bold text-white">{exerciseToDelete.name}</span>? This will remove it from all routines and history.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setExerciseToDelete(null)}
                                className="flex-1 bg-white/5 text-white font-bold py-3 rounded-xl hover:bg-white/10"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteExercise}
                                className="flex-1 bg-red-500/10 text-red-500 font-bold py-3 rounded-xl hover:bg-red-500/20"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Routine Modal */}
            {showCreateRoutine && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1a1a1c] border border-white/10 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">New Routine</h3>
                            <button onClick={() => setShowCreateRoutine(false)} className="text-text-secondary hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <input
                                autoFocus
                                type="text"
                                className="w-full bg-[#202022] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-blue"
                                placeholder="Routine Name"
                                value={newGroupName}
                                onChange={e => setNewGroupName(e.target.value)}
                                onKeyDown={async (e) => {
                                    if (e.key === 'Enter' && newGroupName.trim()) {
                                        const newGroup = await createWorkoutGroup(newGroupName.trim());
                                        if (newGroup) {
                                            setGroups([...groups, newGroup]);
                                            setSelectedGroupId(newGroup.id);
                                            setSelectedGroup(newGroup);
                                            setExercises([]);
                                            setNewGroupName('');
                                            setShowCreateRoutine(false);
                                        }
                                    }
                                }}
                            />
                            <button
                                onClick={async () => {
                                    if (!newGroupName.trim()) return;
                                    const newGroup = await createWorkoutGroup(newGroupName.trim());
                                    if (newGroup) {
                                        setGroups([...groups, newGroup]);
                                        setSelectedGroupId(newGroup.id);
                                        setSelectedGroup(newGroup);
                                        setExercises([]);
                                        setNewGroupName('');
                                        setShowCreateRoutine(false);
                                    }
                                }}
                                disabled={!newGroupName.trim()}
                                className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200"
                            >
                                Create Routine
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirmation && selectedGroup && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1a1a1c] border border-white/10 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">Delete Routine?</h3>
                            <button onClick={() => setShowDeleteConfirmation(false)} className="text-text-secondary hover:text-white"><X size={20} /></button>
                        </div>
                        <p className="text-text-secondary">
                            Are you sure you want to delete <span className="font-bold text-white">{selectedGroup.name}</span>? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirmation(false)}
                                className="flex-1 bg-white/5 text-white font-bold py-3 rounded-xl hover:bg-white/10"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    const success = await deleteWorkoutGroup(selectedGroup.id);
                                    if (success) {
                                        const newGroups = groups.filter(g => g.id !== selectedGroup.id);
                                        setGroups(newGroups);
                                        setSelectedGroupId(null);
                                        setSelectedGroup(null);
                                        setExercises([]);
                                        setShowDeleteConfirmation(false);
                                    }
                                }}
                                className="flex-1 bg-red-500/10 text-red-500 font-bold py-3 rounded-xl hover:bg-red-500/20"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Exercise Modal / Input Area (Shared) */}
        </div>
    );
}
