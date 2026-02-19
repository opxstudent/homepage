'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase-client';
import { CheckCircle2, Circle, Plus, Minus, Edit2, Trash2, X } from 'lucide-react';
import { getLocalISOString } from '@/lib/dateUtils';

interface Habit {
    id: string;
    title: string;
    color: string;
    created_at: string;
    habit_type: 'boolean' | 'quantity';
    target_value?: number;
    unit?: string;
}

interface HabitLog {
    date: string;
    habit_id: string;
    completed: boolean;
    value?: number;
}

const COMMON_UNITS = ['cups', 'mins', 'times'];

export function HabitList() {
    const [habits, setHabits] = useState<Habit[]>([]);
    const [logs, setLogs] = useState<Record<string, boolean>>({});
    const [logValues, setLogValues] = useState<Record<string, number>>({});
    const [streaks, setStreaks] = useState<Record<string, number>>({});
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ title: '', color: '', habit_type: 'boolean' as 'boolean' | 'quantity', target_value: 1, unit: 'times' });
    const [newHabit, setNewHabit] = useState({ title: '', color: '#10B981', habit_type: 'boolean' as 'boolean' | 'quantity', target_value: 1, unit: 'times' });
    const [showAddForm, setShowAddForm] = useState(false);

    // Use local device date — never UTC — so habits reset at the user's local midnight
    const [today, setToday] = useState(getLocalISOString);
    const todayRef = useRef(today);
    todayRef.current = today;

    useEffect(() => {
        fetchHabits();
        fetchTodayLogs();

        // When the tab/window becomes visible again (e.g. user opens app next morning),
        // check if the local date has changed and refresh if so.
        function handleVisibilityChange() {
            if (document.visibilityState === 'visible') {
                const newDate = getLocalISOString();
                if (newDate !== todayRef.current) {
                    setToday(newDate);
                    todayRef.current = newDate;
                    fetchHabits();
                    fetchTodayLogs();
                }
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    useEffect(() => {
        if (habits.length) {
            calculateStreaks();
        }
    }, [habits]);

    async function fetchHabits() {
        const { data } = await supabase
            .from('habits')
            .select('*')
            .order('created_at', { ascending: true });

        if (data) setHabits(data);
    }

    async function fetchTodayLogs() {
        const { data } = await supabase
            .from('habit_logs')
            .select('habit_id, completed, value')
            .eq('date', today);

        if (data) {
            const logsMap: Record<string, boolean> = {};
            const valuesMap: Record<string, number> = {};
            data.forEach((log: any) => {
                logsMap[log.habit_id] = log.completed;
                if (log.value !== null && log.value !== undefined) {
                    valuesMap[log.habit_id] = log.value;
                }
            });
            setLogs(logsMap);
            setLogValues(valuesMap);
        }
    }

    async function calculateStreaks() {
        const streaksMap: Record<string, number> = {};

        for (const habit of habits) {
            let streak = 0;
            // Start from local today, step backwards day by day
            const offset = new Date().getTimezoneOffset() * 60000;
            let currentDate = new Date(Date.now() - offset);

            while (true) {
                const dateStr = currentDate.toISOString().slice(0, 10);

                const { data } = await supabase
                    .from('habit_logs')
                    .select('completed, value')
                    .eq('habit_id', habit.id)
                    .eq('date', dateStr)
                    .single();

                const isComplete = habit.habit_type === 'boolean'
                    ? (data && data.completed)
                    : (data && data.value && habit.target_value && data.value >= habit.target_value);

                if (isComplete) {
                    streak++;
                    currentDate.setDate(currentDate.getDate() - 1);
                } else {
                    break;
                }
            }

            streaksMap[habit.id] = streak;
        }

        setStreaks(streaksMap);
    }

    async function toggleHabit(habitId: string) {
        const currentStatus = logs[habitId] || false;
        const newStatus = !currentStatus;

        setLogs({ ...logs, [habitId]: newStatus });

        const { error } = await supabase
            .from('habit_logs')
            .upsert({
                habit_id: habitId,
                date: today,
                completed: newStatus,
            });

        if (error) {
            console.error('Error toggling habit:', error);
            setLogs({ ...logs, [habitId]: currentStatus });
        } else {
            calculateStreaks();
        }
    }

    async function updateQuantityValue(habitId: string, value: number, habit: Habit) {
        setLogValues({ ...logValues, [habitId]: value });

        const isComplete = habit.target_value ? value >= habit.target_value : false;

        const { error } = await supabase
            .from('habit_logs')
            .upsert({
                habit_id: habitId,
                date: today,
                value: value,
                completed: isComplete,
            });

        if (error) {
            console.error('Error updating quantity:', error);
        } else {
            setLogs({ ...logs, [habitId]: isComplete });
            calculateStreaks();
        }
    }

    async function addHabit() {
        if (!newHabit.title.trim()) return;

        const habitData: any = {
            title: newHabit.title,
            color: newHabit.color,
            habit_type: newHabit.habit_type,
        };

        if (newHabit.habit_type === 'quantity') {
            habitData.target_value = newHabit.target_value;
            habitData.unit = newHabit.unit;
        }

        const { error } = await supabase
            .from('habits')
            .insert(habitData);

        if (!error) {
            setNewHabit({ title: '', color: '#10B981', habit_type: 'boolean', target_value: 1, unit: 'times' });
            setShowAddForm(false);
            fetchHabits();
        }
    }

    async function updateHabit(habitId: string) {
        if (!editForm.title.trim()) return;

        const habitData: any = {
            title: editForm.title,
            color: editForm.color,
            habit_type: editForm.habit_type,
        };

        if (editForm.habit_type === 'quantity') {
            habitData.target_value = editForm.target_value;
            habitData.unit = editForm.unit;
        }

        const { error } = await supabase
            .from('habits')
            .update(habitData)
            .eq('id', habitId);

        if (!error) {
            setEditingId(null);
            fetchHabits();
        }
    }

    async function deleteHabit(habitId: string) {
        const { error } = await supabase
            .from('habits')
            .delete()
            .eq('id', habitId);

        if (!error) {
            setDeletingId(null);
            fetchHabits();
        }
    }

    function confirmDelete(habitId: string) {
        setDeletingId(habitId);
    }

    function startEditing(habit: Habit) {
        setEditingId(habit.id);
        setEditForm({
            title: habit.title,
            color: habit.color,
            habit_type: habit.habit_type,
            target_value: habit.target_value || 1,
            unit: habit.unit || 'times'
        });
    }

    const habitColors = [
        '#DE3C4B', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6',
        '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#A855F7'
    ];

    return (
        <div className="bg-[#202022] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">My Habits</h2>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all"
                >
                    <Plus size={16} />
                    <span className="text-sm font-medium">Add Habit</span>
                </button>
            </div>

            {/* Add Habit Form */}
            {showAddForm && (
                <div className="mb-6 p-4 bg-active rounded-lg border border-[#323234]">
                    <h3 className="text-sm font-medium text-white mb-3">New Habit</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-text-secondary mb-1">Habit Name</label>
                            <input
                                type="text"
                                value={newHabit.title}
                                onChange={(e) => setNewHabit({ ...newHabit, title: e.target.value })}
                                placeholder="e.g., Exercise, Drink Water, Read"
                                className="w-full px-3 py-2 bg-surface border border-[#323234] rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                                onKeyDown={(e) => e.key === 'Enter' && newHabit.habit_type === 'boolean' && addHabit()}
                            />
                        </div>

                        {/* Habit Type */}
                        <div>
                            <label className="block text-xs text-text-secondary mb-2">Habit Type</label>
                            <div className="flex gap-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={newHabit.habit_type === 'boolean'}
                                        onChange={() => setNewHabit({ ...newHabit, habit_type: 'boolean' })}
                                        className="text-emerald-500"
                                    />
                                    <span className="text-sm text-white">Yes/No</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={newHabit.habit_type === 'quantity'}
                                        onChange={() => setNewHabit({ ...newHabit, habit_type: 'quantity' })}
                                        className="text-emerald-500"
                                    />
                                    <span className="text-sm text-white">Quantity</span>
                                </label>
                            </div>
                        </div>

                        {/* Quantity Fields */}
                        {newHabit.habit_type === 'quantity' && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-text-secondary mb-1">Target</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={newHabit.target_value}
                                        onChange={(e) => setNewHabit({ ...newHabit, target_value: parseInt(e.target.value) || 1 })}
                                        className="w-full px-3 py-2 bg-surface border border-[#323234] rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-text-secondary mb-1">Unit</label>
                                    <select
                                        value={newHabit.unit}
                                        onChange={(e) => setNewHabit({ ...newHabit, unit: e.target.value })}
                                        className="w-full px-3 py-2 bg-surface border border-[#323234] rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                                    >
                                        {COMMON_UNITS.map(unit => (
                                            <option key={unit} value={unit}>{unit}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs text-text-secondary mb-2">Color</label>
                            <div className="flex gap-2 flex-wrap">
                                {habitColors.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => setNewHabit({ ...newHabit, color })}
                                        className={`w-8 h-8 rounded-lg transition-all ${newHabit.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-active' : ''
                                            }`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={addHabit}
                                disabled={!newHabit.title.trim()}
                                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all"
                            >
                                Create Habit
                            </button>
                            <button
                                onClick={() => {
                                    setShowAddForm(false);
                                    setNewHabit({ title: '', color: '#10B981', habit_type: 'boolean', target_value: 1, unit: 'times' });
                                }}
                                className="px-4 py-2 bg-[#323234] hover:bg-[#3A3A3C] text-white rounded-lg text-sm transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Habits List */}
            <div className="space-y-2">
                {habits.length === 0 ? (
                    <div className="text-center py-12 text-text-secondary">
                        <p>No habits yet. Click "Add Habit" to get started!</p>
                    </div>
                ) : (
                    habits.map((habit) => {
                        const isCompleted = logs[habit.id] || false;
                        const streak = streaks[habit.id] || 0;
                        const isEditing = editingId === habit.id;
                        const currentValue = logValues[habit.id] || 0;

                        if (isEditing) {
                            return (
                                <div key={habit.id} className="p-4 bg-active rounded-lg border border-[#323234]">
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs text-text-secondary mb-1">Habit Name</label>
                                            <input
                                                type="text"
                                                value={editForm.title}
                                                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                                className="w-full px-3 py-2 bg-surface border border-[#323234] rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                                                onKeyDown={(e) => e.key === 'Enter' && updateHabit(habit.id)}
                                            />
                                        </div>

                                        {/* Habit Type */}
                                        <div>
                                            <label className="block text-xs text-text-secondary mb-2">Habit Type</label>
                                            <div className="flex gap-3">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        checked={editForm.habit_type === 'boolean'}
                                                        onChange={() => setEditForm({ ...editForm, habit_type: 'boolean' })}
                                                    />
                                                    <span className="text-sm text-white">Yes/No</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        checked={editForm.habit_type === 'quantity'}
                                                        onChange={() => setEditForm({ ...editForm, habit_type: 'quantity' })}
                                                    />
                                                    <span className="text-sm text-white">Quantity</span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Quantity Fields */}
                                        {editForm.habit_type === 'quantity' && (
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs text-text-secondary mb-1">Target</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={editForm.target_value}
                                                        onChange={(e) => setEditForm({ ...editForm, target_value: parseInt(e.target.value) || 1 })}
                                                        className="w-full px-3 py-2 bg-surface border border-[#323234] rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-text-secondary mb-1">Unit</label>
                                                    <select
                                                        value={editForm.unit}
                                                        onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                                                        className="w-full px-3 py-2 bg-surface border border-[#323234] rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                                                    >
                                                        {COMMON_UNITS.map(unit => (
                                                            <option key={unit} value={unit}>{unit}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-xs text-text-secondary mb-2">Color</label>
                                            <div className="flex gap-2 flex-wrap">
                                                {habitColors.map(color => (
                                                    <button
                                                        key={color}
                                                        onClick={() => setEditForm({ ...editForm, color })}
                                                        className={`w-8 h-8 rounded-lg transition-all ${editForm.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-active' : ''
                                                            }`}
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => updateHabit(habit.id)}
                                                className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-all"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={() => setEditingId(null)}
                                                className="px-3 py-2 bg-[#323234] hover:bg-[#3A3A3C] text-white rounded-lg text-sm transition-all"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div
                                key={habit.id}
                                className="flex items-center gap-3 p-4 bg-active hover:bg-[#323234] rounded-lg transition-all group"
                            >
                                {/* Boolean Habit - Checkbox */}
                                {habit.habit_type === 'boolean' && (
                                    <button
                                        onClick={() => toggleHabit(habit.id)}
                                        className="flex-shrink-0"
                                    >
                                        {isCompleted ? (
                                            <CheckCircle2
                                                size={24}
                                                style={{ color: habit.color }}
                                            />
                                        ) : (
                                            <Circle
                                                size={24}
                                                className="text-text-secondary group-hover:text-text-primary"
                                            />
                                        )}
                                    </button>
                                )}

                                {/* Quantity Habit - +/- Buttons */}
                                {habit.habit_type === 'quantity' && (
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => updateQuantityValue(habit.id, Math.max(0, currentValue - 1), habit)}
                                            className="w-7 h-7 flex items-center justify-center bg-surface hover:bg-[#323234] border border-[#323234] rounded text-white transition-all"
                                        >
                                            <Minus size={14} />
                                        </button>
                                        <div className="flex items-center gap-1">
                                            <span className="text-white font-medium text-sm min-w-[2ch] text-center">{currentValue}</span>
                                            <span className="text-text-secondary text-xs">/ {habit.target_value}</span>
                                        </div>
                                        <button
                                            onClick={() => updateQuantityValue(habit.id, currentValue + 1, habit)}
                                            className="w-7 h-7 flex items-center justify-center bg-surface hover:bg-[#323234] border border-[#323234] rounded text-white transition-all"
                                            style={{ borderColor: isCompleted ? habit.color : undefined }}
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                )}

                                {/* Habit info */}
                                <div className="flex-1 min-w-0">
                                    <div className={`text-sm font-medium flex items-center gap-2 ${isCompleted ? 'text-text-secondary line-through' : 'text-white'}`}>
                                        <span>{habit.title}</span>
                                        {habit.habit_type === 'quantity' && (
                                            <span className="text-xs text-text-secondary">({habit.unit})</span>
                                        )}
                                    </div>
                                    {streak > 0 && (
                                        <div className="text-xs text-text-secondary mt-1 flex items-center gap-1">
                                            <span>🔥</span>
                                            <span>{streak} day streak</span>
                                        </div>
                                    )}
                                </div>

                                {/* Color indicator */}
                                <div
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: habit.color }}
                                />

                                {/* Actions */}
                                <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => startEditing(habit)}
                                        className="p-1 hover:bg-[#3A3A3C] rounded transition-all"
                                        title="Edit habit"
                                    >
                                        <Edit2 size={14} className="text-text-secondary hover:text-white" />
                                    </button>
                                    <button
                                        onClick={() => confirmDelete(habit.id)}
                                        className="p-1 hover:bg-red-500/20 rounded transition-all"
                                        title="Delete habit"
                                    >
                                        <Trash2 size={14} className="text-red-400" />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {deletingId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-[#202022] rounded-2xl p-6 max-w-md w-full mx-4 border border-[#323234]">
                        <h3 className="text-lg font-semibold text-white mb-2">Delete Habit</h3>
                        <p className="text-text-secondary mb-6">
                            Are you sure you want to delete this habit? All associated logs will be permanently deleted.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeletingId(null)}
                                className="px-4 py-2 bg-[#323234] hover:bg-[#3A3A3C] text-white rounded-lg text-sm transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => deleteHabit(deletingId)}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
