'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { CheckCircle2, Circle, Plus, Minus, Edit2, Trash2, X } from 'lucide-react';
import { Habit, HabitLog } from './HabitDashboard';
import { calcStreak, HABIT_COLORS } from '@/lib/habitUtils';

const COMMON_UNITS = ['cups', 'mins', 'times'];

// Global heatmap color tiers per spec
function getHeatmapColor(count: number): string {
    if (count === 0) return '#262626';
    if (count <= 2) return '#064e3b'; // emerald-900
    if (count <= 4) return '#059669'; // emerald-600
    return '#34d399';                  // emerald-400
}

interface Props {
    habits: Habit[];
    allLogs: HabitLog[];
    today: string;
    onRefresh: () => void;
}

export function HabitOverview({ habits, allLogs, today, onRefresh }: Props) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ title: '', color: '', habit_type: 'boolean' as 'boolean' | 'quantity', target_value: 1, unit: 'times' });
    const [newHabit, setNewHabit] = useState({ title: '', color: '#10B981', habit_type: 'boolean' as 'boolean' | 'quantity', target_value: 1, unit: 'times' });
    const [showAddForm, setShowAddForm] = useState(false);

    // ── Derived: today's logs ──────────────────────────────────────────────
    const todayLogs = allLogs.filter(l => l.date === today);
    const todayCompleted: Record<string, boolean> = {};
    const todayValues: Record<string, number> = {};
    todayLogs.forEach(l => {
        todayCompleted[l.habit_id] = l.completed;
        if (l.value != null) todayValues[l.habit_id] = l.value;
    });

    // ── Derived: streaks (shared util) ────────────────────────────────────

    // ── Derived: global heatmap ────────────────────────────────────────────
    // Builds Mon-aligned columns for the full calendar year (Jan 1 → Dec 31)
    // Future dates are included as empty cells so the full year is always visible.
    function buildGlobalHeatmapWeeks() {
        const year = new Date().getFullYear();
        const start = new Date(year, 0, 1);   // Jan 1
        const end = new Date(year, 11, 31); // Dec 31
        const todayDate = new Date(today + 'T00:00:00');

        // Build ordered day list Jan 1 → Dec 31
        const days: { date: string; count: number; future: boolean }[] = [];
        const cur = new Date(start);
        while (cur <= end) {
            const ds = cur.toISOString().slice(0, 10);
            days.push({ date: ds, count: 0, future: cur > todayDate });
            cur.setDate(cur.getDate() + 1);
        }
        allLogs.forEach(l => {
            const e = days.find(d => d.date === l.date);
            if (e && l.completed) e.count++;
        });
        // Pad first column so row-0 = Monday
        const firstJsDay = start.getDay();
        const monOffset = (firstJsDay + 6) % 7;
        type Cell = { date: string; count: number; future: boolean } | null;
        const weeks: Cell[][] = [];
        let col: Cell[] = Array(monOffset).fill(null);
        for (const day of days) {
            col.push(day);
            if (col.length === 7) { weeks.push(col); col = []; }
        }
        if (col.length > 0) {
            while (col.length < 7) col.push(null);
            weeks.push(col);
        }
        return weeks;
    }

    // ── Derived: mini heatmap (last 30 days) per habit ────────────────────
    function getMiniHeatmap(habit: Habit): { date: string; done: boolean }[] {
        const days: { date: string; done: boolean }[] = [];
        const offset = new Date().getTimezoneOffset() * 60000;
        for (let i = 29; i >= 0; i--) {
            const d = new Date(Date.now() - offset);
            d.setDate(d.getDate() - i);
            const ds = d.toISOString().slice(0, 10);
            const log = allLogs.find(l => l.habit_id === habit.id && l.date === ds);
            const done = habit.habit_type === 'boolean'
                ? !!log?.completed
                : (log?.value != null && habit.target_value != null && log.value >= habit.target_value);
            days.push({ date: ds, done });
        }
        return days;
    }

    // ── Actions ────────────────────────────────────────────────────────────
    async function toggleBoolean(habit: Habit) {
        const current = todayCompleted[habit.id] || false;
        const next = !current;
        await supabase.from('habit_logs').upsert(
            { habit_id: habit.id, date: today, completed: next },
            { onConflict: 'habit_id,date' }
        );
        onRefresh();
    }

    async function updateQuantity(habit: Habit, value: number) {
        const completed = habit.target_value != null && value >= habit.target_value;
        await supabase.from('habit_logs').upsert(
            { habit_id: habit.id, date: today, value, completed },
            { onConflict: 'habit_id,date' }
        );
        onRefresh();
    }

    async function addHabit() {
        if (!newHabit.title.trim()) return;
        await supabase.from('habits').insert({
            title: newHabit.title.trim(),
            color: newHabit.color,
            habit_type: newHabit.habit_type,
            target_value: newHabit.habit_type === 'quantity' ? newHabit.target_value : null,
            unit: newHabit.habit_type === 'quantity' ? newHabit.unit : null,
        });
        setNewHabit({ title: '', color: '#10B981', habit_type: 'boolean', target_value: 1, unit: 'times' });
        setShowAddForm(false);
        onRefresh();
    }

    async function saveEdit(habitId: string) {
        await supabase.from('habits').update({
            title: editForm.title,
            color: editForm.color,
            habit_type: editForm.habit_type,
            target_value: editForm.habit_type === 'quantity' ? editForm.target_value : null,
            unit: editForm.habit_type === 'quantity' ? editForm.unit : null,
        }).eq('id', habitId);
        setEditingId(null);
        onRefresh();
    }

    async function deleteHabit(habitId: string) {
        await supabase.from('habits').delete().eq('id', habitId);
        setDeletingId(null);
        onRefresh();
    }

    function startEditing(habit: Habit) {
        setEditingId(habit.id);
        setEditForm({ title: habit.title, color: habit.color, habit_type: habit.habit_type, target_value: habit.target_value || 1, unit: habit.unit || 'times' });
    }

    // ── Render global heatmap ──────────────────────────────────────────────
    const weeks = buildGlobalHeatmapWeeks();

    // Show month label on the first column whose first real cell is day 1-7 of that month
    function getMonthLabel(wi: number): string | null {
        const firstReal = weeks[wi].find(c => c !== null);
        if (!firstReal) return null;
        const d = new Date(firstReal.date + 'T00:00:00');
        if (d.getDate() <= 7) return d.toLocaleDateString('en-US', { month: 'short' });
        return null;
    }

    return (
        <div className="space-y-6">
            {/* ── Global Heatmap ── */}
            <div className="bg-[#202022] rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-5">{new Date().getFullYear()} Activity</h2>
                <div className="overflow-x-auto">
                    <div className="inline-block min-w-full">
                        {/* Month labels */}
                        <div className="flex gap-[3px] mb-1 ml-7">
                            {weeks.map((_, wi) => {
                                const label = getMonthLabel(wi);
                                return (
                                    <div key={wi} className="w-[12px]">
                                        {label && <span className="text-[10px] text-text-secondary">{label}</span>}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex gap-[3px]">
                            {/* Day labels — fixed height rows matching grid cells */}
                            <div className="flex flex-col gap-[3px] text-[10px] text-text-secondary pr-2 w-5">
                                {['Mon', '', 'Wed', '', 'Fri', '', ''].map((lbl, i) => (
                                    <div key={i} className="h-[12px] flex items-center leading-none">{lbl}</div>
                                ))}
                            </div>
                            {/* Grid — each column = Mon(row 0) … Sun(row 6) */}
                            {weeks.map((col, wi) => (
                                <div key={wi} className="flex flex-col gap-[3px]">
                                    {col.map((cell, di) =>
                                        cell === null
                                            ? <div key={di} className="w-[12px] h-[12px]" />
                                            : <div
                                                key={di}
                                                className="w-[12px] h-[12px] rounded-sm cursor-default relative group"
                                                style={{
                                                    backgroundColor: cell.future
                                                        ? '#1c1c1e'
                                                        : getHeatmapColor(cell.count)
                                                }}
                                                title={cell.future ? cell.date : `${cell.date}: ${cell.count} habit${cell.count !== 1 ? 's' : ''}`}
                                            >
                                                {!cell.future && (
                                                    <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-20 pointer-events-none">
                                                        <div className="bg-[#2A2A2C] border border-[#323234] rounded-lg px-2 py-1 shadow-lg whitespace-nowrap text-[10px] text-white">
                                                            {cell.date} · {cell.count} habit{cell.count !== 1 ? 's' : ''}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        {/* Legend */}
                        <div className="flex items-center gap-2 mt-3 text-[10px] text-text-secondary">
                            <span>Less</span>
                            {['#262626', '#064e3b', '#059669', '#34d399'].map(c => (
                                <div key={c} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
                            ))}
                            <span>More</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Habit Rows ── */}
            <div className="bg-[#202022] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold text-white">My Habits</h2>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-all"
                    >
                        <Plus size={16} /> Add Habit
                    </button>
                </div>

                {/* Add form */}
                {showAddForm && (
                    <div className="bg-surface rounded-xl p-4 mb-4 border border-[#323234]">
                        <h3 className="text-sm font-medium text-white mb-3">New Habit</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-text-secondary mb-1">Habit Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Drink Water"
                                    value={newHabit.title}
                                    onChange={e => setNewHabit({ ...newHabit, title: e.target.value })}
                                    className="w-full px-3 py-2 bg-[#202022] border border-[#323234] rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                                    onKeyDown={e => e.key === 'Enter' && addHabit()}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-text-secondary mb-1">Habit Type</label>
                                <div className="flex gap-4">
                                    {(['boolean', 'quantity'] as const).map(t => (
                                        <label key={t} className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" checked={newHabit.habit_type === t} onChange={() => setNewHabit({ ...newHabit, habit_type: t })} />
                                            <span className="text-sm text-white">{t === 'boolean' ? 'Yes/No' : 'Quantity'}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            {newHabit.habit_type === 'quantity' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-text-secondary mb-1">Target</label>
                                        <input
                                            type="number" min="1" value={newHabit.target_value}
                                            onChange={e => setNewHabit({ ...newHabit, target_value: parseInt(e.target.value) || 1 })}
                                            className="w-full px-3 py-2 bg-[#202022] border border-[#323234] rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-text-secondary mb-1">Unit</label>
                                        <select value={newHabit.unit} onChange={e => setNewHabit({ ...newHabit, unit: e.target.value })}
                                            className="w-full px-3 py-2 bg-[#202022] border border-[#323234] rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500">
                                            {COMMON_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs text-text-secondary mb-2">Color</label>
                                <div className="flex gap-2 flex-wrap">
                                    {HABIT_COLORS.map(c => (
                                        <button key={c} onClick={() => setNewHabit({ ...newHabit, color: c })}
                                            className={`w-7 h-7 rounded-lg transition-all ${newHabit.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#202022]' : ''}`}
                                            style={{ backgroundColor: c }} />
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={addHabit} disabled={!newHabit.title.trim()}
                                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-all">
                                    Create Habit
                                </button>
                                <button onClick={() => setShowAddForm(false)}
                                    className="px-4 py-2 text-text-secondary hover:text-white text-sm transition-all">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Habit list */}
                <div className="space-y-2">
                    {habits.length === 0 && (
                        <p className="text-text-secondary text-sm text-center py-8">No habits yet. Add one above!</p>
                    )}
                    {habits.map(habit => {
                        const streak = calcStreak(habit, allLogs, today);
                        const mini = getMiniHeatmap(habit);
                        const currentValue = todayValues[habit.id] || 0;
                        const isCompleted = habit.habit_type === 'boolean'
                            ? todayCompleted[habit.id]
                            : (habit.target_value != null && currentValue >= habit.target_value);

                        if (editingId === habit.id) {
                            return (
                                <div key={habit.id} className="bg-surface rounded-xl p-4 border border-[#323234]">
                                    <div className="space-y-3">
                                        <input type="text" value={editForm.title}
                                            onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                            className="w-full px-3 py-2 bg-[#202022] border border-[#323234] rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500" />
                                        <div className="flex gap-4">
                                            {(['boolean', 'quantity'] as const).map(t => (
                                                <label key={t} className="flex items-center gap-2 cursor-pointer">
                                                    <input type="radio" checked={editForm.habit_type === t} onChange={() => setEditForm({ ...editForm, habit_type: t })} />
                                                    <span className="text-sm text-white">{t === 'boolean' ? 'Yes/No' : 'Quantity'}</span>
                                                </label>
                                            ))}
                                        </div>
                                        {editForm.habit_type === 'quantity' && (
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs text-text-secondary mb-1">Target</label>
                                                    <input type="number" min="1" value={editForm.target_value}
                                                        onChange={e => setEditForm({ ...editForm, target_value: parseInt(e.target.value) || 1 })}
                                                        className="w-full px-3 py-2 bg-[#202022] border border-[#323234] rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-text-secondary mb-1">Unit</label>
                                                    <select value={editForm.unit} onChange={e => setEditForm({ ...editForm, unit: e.target.value })}
                                                        className="w-full px-3 py-2 bg-[#202022] border border-[#323234] rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500">
                                                        {COMMON_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex gap-2 flex-wrap">
                                            {HABIT_COLORS.map(c => (
                                                <button key={c} onClick={() => setEditForm({ ...editForm, color: c })}
                                                    className={`w-7 h-7 rounded-lg transition-all ${editForm.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#202022]' : ''}`}
                                                    style={{ backgroundColor: c }} />
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => saveEdit(habit.id)}
                                                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-all">
                                                Save
                                            </button>
                                            <button onClick={() => setEditingId(null)}
                                                className="px-4 py-2 text-text-secondary hover:text-white text-sm transition-all">
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={habit.id} className="group bg-active rounded-xl px-4 py-3 flex items-center gap-4">
                                {/* Today toggle */}
                                {/* Toggle Interaction */}
                                <button
                                    onClick={() => {
                                        if (habit.habit_type === 'boolean') {
                                            toggleBoolean(habit);
                                        } else {
                                            const newValue = currentValue >= (habit.target_value || 0) ? 0 : (habit.target_value || 0);
                                            updateQuantity(habit, newValue);
                                        }
                                    }}
                                    className="flex-shrink-0"
                                >
                                    {isCompleted ? (
                                        <CheckCircle2 size={22} style={{ color: habit.color }} />
                                    ) : (
                                        <Circle size={22} className="text-text-secondary hover:text-white transition-colors" />
                                    )}
                                </button>

                                {/* Title + streak + Counter */}
                                <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                    <div className="flex items-center gap-2 shrink-0">
                                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: habit.color }} />
                                        <span className={`text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis ${isCompleted ? 'line-through text-text-secondary' : 'text-white'}`}>
                                            {habit.title}
                                        </span>
                                        {habit.unit && <span className="text-xs text-text-secondary">({habit.unit})</span>}
                                        {streak > 0 && (
                                            <span className="text-xs text-orange-400 flex items-center gap-0.5 shrink-0">
                                                🔥 {streak}
                                            </span>
                                        )}
                                    </div>

                                    {/* Counter (Directly after text) */}
                                    {habit.habit_type === 'quantity' && (
                                        <div className="flex items-center gap-1.5 shrink-0 ml-1">
                                            <button onClick={() => updateQuantity(habit, Math.max(0, currentValue - 1))}
                                                className="w-5 h-5 flex items-center justify-center bg-surface hover:bg-[#323234] border border-[#323234] rounded text-white transition-all">
                                                <Minus size={10} />
                                            </button>
                                            <div className="flex items-center gap-1 min-w-[3.5ch] justify-center">
                                                <span className="text-white text-[11px] font-bold">{currentValue}</span>
                                                <span className="text-text-secondary text-[10px]">/{habit.target_value}</span>
                                            </div>
                                            <button onClick={() => updateQuantity(habit, currentValue + 1)}
                                                className="w-5 h-5 flex items-center justify-center bg-surface hover:bg-[#323234] border border-[#323234] rounded text-white transition-all"
                                                style={{ borderColor: isCompleted ? habit.color : undefined }}>
                                                <Plus size={10} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Mini heatmap — last 30 days */}
                                <div className="flex items-center gap-3 justify-end shrink-0 ml-auto mr-4">
                                    {streak > 0 && (
                                        <div className="text-xs text-text-secondary font-medium">
                                            {streak}
                                        </div>
                                    )}
                                    <div className="hidden md:flex gap-[3px]">
                                        {mini.map((day, i) => (
                                            <div
                                                key={i}
                                                className="w-[10px] h-[10px] rounded-sm flex-shrink-0"
                                                style={{ backgroundColor: day.done ? habit.color : '#202022' }}
                                                title={day.date}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                    <button onClick={() => startEditing(habit)}
                                        className="p-1 hover:bg-[#3A3A3C] rounded transition-all">
                                        <Edit2 size={13} className="text-text-secondary" />
                                    </button>
                                    <button onClick={() => setDeletingId(habit.id)}
                                        className="p-1 hover:bg-red-500/20 rounded transition-all">
                                        <Trash2 size={13} className="text-red-400" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Delete confirmation modal */}
            {deletingId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-[#202022] rounded-2xl p-6 max-w-md w-full mx-4 border border-[#323234]">
                        <h3 className="text-lg font-semibold text-white mb-2">Delete Habit</h3>
                        <p className="text-text-secondary mb-6">Are you sure? All logs for this habit will be permanently deleted.</p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setDeletingId(null)}
                                className="px-4 py-2 bg-[#323234] hover:bg-[#3A3A3C] text-white rounded-lg text-sm transition-all">
                                Cancel
                            </button>
                            <button onClick={() => deleteHabit(deletingId)}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
