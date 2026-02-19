'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Trash2, Plus, X, CheckCircle2, Circle } from 'lucide-react';
import { Habit, HabitLog } from './HabitDashboard';

interface Props {
    habits: Habit[];
    allLogs: HabitLog[];
    today: string;
    onRefresh: () => void;
}

type EditField = 'date' | 'qty';

export function HabitHistory({ habits, allLogs, today, onRefresh }: Props) {
    const [deletingLogId, setDeletingLogId] = useState<string | null>(null);
    // Which log + field is being edited
    const [editingLog, setEditingLog] = useState<{ id: string; field: EditField } | null>(null);
    const [editingDate, setEditingDate] = useState('');
    const [editingQty, setEditingQty] = useState<number>(1);
    const [showBackfill, setShowBackfill] = useState(false);
    const [backfill, setBackfill] = useState({ habit_id: '', date: today, value: 1 });

    // Sort logs by date desc, then by habit name
    const sortedLogs = [...allLogs].sort((a, b) => {
        const dateCmp = b.date.localeCompare(a.date);
        if (dateCmp !== 0) return dateCmp;
        const ha = habits.find(h => h.id === a.habit_id)?.title ?? '';
        const hb = habits.find(h => h.id === b.habit_id)?.title ?? '';
        return ha.localeCompare(hb);
    });

    function getHabit(id: string) {
        return habits.find(h => h.id === id);
    }

    function formatDate(dateStr: string): string {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }

    function isLogCompleted(log: HabitLog, habit: Habit | undefined): boolean {
        if (!habit) return false;
        if (habit.habit_type === 'boolean') return log.completed;
        return log.value != null && habit.target_value != null && log.value >= habit.target_value;
    }

    function getStatusLabel(log: HabitLog, habit: Habit | undefined): string {
        if (!habit) return '—';
        if (habit.habit_type === 'boolean') return log.completed ? 'Done' : 'Missed';
        if (log.value != null) return `${log.value} ${habit.unit || ''}`.trim();
        return '—';
    }

    async function deleteLog(logId: string) {
        await supabase.from('habit_logs').delete().eq('id', logId);
        setDeletingLogId(null);
        onRefresh();
    }

    async function saveDate(logId: string) {
        if (!editingDate) { setEditingLog(null); return; }
        await supabase.from('habit_logs').update({ date: editingDate }).eq('id', logId);
        setEditingLog(null);
        onRefresh();
    }

    async function saveQty(log: HabitLog) {
        const habit = getHabit(log.habit_id);
        const completed = habit?.target_value != null && editingQty >= habit.target_value;
        await supabase.from('habit_logs').update({ value: editingQty, completed }).eq('id', log.id);
        setEditingLog(null);
        onRefresh();
    }

    async function toggleStatus(log: HabitLog) {
        const habit = getHabit(log.habit_id);
        if (!habit || habit.habit_type !== 'boolean') return;

        const newCompleted = !log.completed;

        await supabase.from('habit_logs').update({
            completed: newCompleted
        }).eq('id', log.id);

        onRefresh();
    }

    function startEditDate(log: HabitLog) {
        setEditingLog({ id: log.id, field: 'date' });
        setEditingDate(log.date);
    }

    function startEditQty(log: HabitLog) {
        setEditingLog({ id: log.id, field: 'qty' });
        setEditingQty(log.value ?? 1);
    }

    async function submitBackfill() {
        if (!backfill.habit_id || !backfill.date) return;
        const habit = getHabit(backfill.habit_id);
        if (!habit) return;

        if (habit.habit_type === 'boolean') {
            await supabase.from('habit_logs').upsert({
                habit_id: backfill.habit_id,
                date: backfill.date,
                completed: true,
            });
        } else {
            const completed = habit.target_value != null && backfill.value >= habit.target_value;
            await supabase.from('habit_logs').upsert({
                habit_id: backfill.habit_id,
                date: backfill.date,
                value: backfill.value,
                completed,
            });
        }
        setShowBackfill(false);
        setBackfill({ habit_id: '', date: today, value: 1 });
        onRefresh();
    }

    const selectedBackfillHabit = getHabit(backfill.habit_id);

    return (
        <div className="space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Log History</h2>
                <button
                    onClick={() => setShowBackfill(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-all"
                >
                    <Plus size={15} /> Log Past Habit
                </button>
            </div>

            {/* Table */}
            <div className="bg-[#202022] rounded-2xl overflow-hidden">
                {sortedLogs.length === 0 ? (
                    <div className="p-10 text-center text-text-secondary text-sm">No logs yet.</div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[#323234]">
                                <th className="text-left text-xs font-medium text-text-secondary px-5 py-3">Date</th>
                                <th className="text-left text-xs font-medium text-text-secondary px-5 py-3">Habit</th>
                                <th className="text-left text-xs font-medium text-text-secondary px-5 py-3">Status</th>
                                <th className="text-right text-xs font-medium text-text-secondary px-5 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedLogs.map((log, i) => {
                                const habit = getHabit(log.habit_id);
                                const isEditingDate = editingLog?.id === log.id && editingLog.field === 'date';
                                const isEditingQty = editingLog?.id === log.id && editingLog.field === 'qty';
                                const completed = isLogCompleted(log, habit);

                                return (
                                    <tr key={log.id}
                                        className={`border-b border-[#323234]/50 hover:bg-[#2A2A2C] transition-colors ${i === sortedLogs.length - 1 ? 'border-b-0' : ''}`}>

                                        {/* Date cell — click to edit */}
                                        <td className="px-5 py-3">
                                            {isEditingDate ? (
                                                <input
                                                    type="date"
                                                    value={editingDate}
                                                    max={today}
                                                    onChange={e => setEditingDate(e.target.value)}
                                                    onBlur={() => saveDate(log.id)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') saveDate(log.id);
                                                        if (e.key === 'Escape') setEditingLog(null);
                                                    }}
                                                    className="bg-[#2A2A2C] border border-emerald-500 rounded px-2 py-1 text-white text-xs focus:outline-none"
                                                    autoFocus
                                                />
                                            ) : (
                                                <button
                                                    onClick={() => startEditDate(log)}
                                                    className="text-sm text-white hover:text-emerald-400 transition-colors text-left"
                                                    title="Click to change date"
                                                >
                                                    {formatDate(log.date)}
                                                    {log.date === today && (
                                                        <span className="ml-2 text-[10px] bg-emerald-900/50 text-emerald-400 px-1.5 py-0.5 rounded">Today</span>
                                                    )}
                                                </button>
                                            )}
                                        </td>

                                        {/* Habit name */}
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: habit?.color || '#666' }} />
                                                <span className="text-sm text-white">{habit?.title || 'Unknown'}</span>
                                            </div>
                                        </td>

                                        {/* Status — click qty to edit */}
                                        <td className="px-5 py-3">
                                            {isEditingQty ? (
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={editingQty}
                                                    onChange={e => setEditingQty(parseInt(e.target.value) || 0)}
                                                    onBlur={() => saveQty(log)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') saveQty(log);
                                                        if (e.key === 'Escape') setEditingLog(null);
                                                    }}
                                                    className="w-20 bg-[#2A2A2C] border border-emerald-500 rounded px-2 py-1 text-white text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    autoFocus
                                                />
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            if (habit?.habit_type === 'boolean') {
                                                                toggleStatus(log);
                                                            } else if (habit?.habit_type === 'quantity') {
                                                                const isComplete = completed;
                                                                const newValue = isComplete ? 0 : (habit.target_value || 1);
                                                                // Manually update
                                                                supabase.from('habit_logs').update({ value: newValue, completed: !isComplete }).eq('id', log.id).then(() => onRefresh());
                                                            }
                                                        }}
                                                        className="cursor-pointer hover:opacity-80"
                                                        title={habit?.habit_type === 'quantity' ? "Click to quick complete" : "Click to toggle"}
                                                    >
                                                        {completed
                                                            ? <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                                                            : <Circle size={16} className="text-text-secondary flex-shrink-0" />}
                                                    </button>

                                                    {/* Value display / edit trigger */}
                                                    <button
                                                        onClick={() => habit?.habit_type === 'quantity' ? startEditQty(log) : toggleStatus(log)}
                                                        className={`text-sm hover:text-emerald-400 transition-colors ${completed ? 'text-emerald-400' : 'text-text-secondary'}`}
                                                        title={habit?.habit_type === 'quantity' ? "Click to edit exact value" : "Click to toggle"}
                                                    >
                                                        {getStatusLabel(log, habit)}
                                                    </button>
                                                </div>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-5 py-3 text-right">
                                            <button
                                                onClick={() => setDeletingLogId(log.id)}
                                                className="p-1.5 hover:bg-red-500/20 rounded transition-all"
                                                title="Delete log"
                                            >
                                                <Trash2 size={13} className="text-red-400" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )
                }
            </div >

            {/* Backfill modal */}
            {
                showBackfill && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-[#202022] rounded-2xl p-6 max-w-md w-full mx-4 border border-[#323234]">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-lg font-semibold text-white">Log Past Habit</h3>
                                <button onClick={() => setShowBackfill(false)} className="text-text-secondary hover:text-white">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs text-text-secondary mb-1">Habit</label>
                                    <select
                                        value={backfill.habit_id}
                                        onChange={e => setBackfill({ ...backfill, habit_id: e.target.value })}
                                        className="w-full px-3 py-2 bg-surface border border-[#323234] rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                                    >
                                        <option value="">Select a habit…</option>
                                        {habits.map(h => (
                                            <option key={h.id} value={h.id}>{h.title}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-text-secondary mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={backfill.date}
                                        max={today}
                                        onChange={e => setBackfill({ ...backfill, date: e.target.value })}
                                        className="w-full px-3 py-2 bg-surface border border-[#323234] rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                                {selectedBackfillHabit?.habit_type === 'quantity' && (
                                    <div>
                                        <label className="block text-xs text-text-secondary mb-1">
                                            Value ({selectedBackfillHabit.unit || 'units'})
                                        </label>
                                        <input
                                            type="number" min="1" value={backfill.value}
                                            onChange={e => setBackfill({ ...backfill, value: parseInt(e.target.value) || 1 })}
                                            className="w-full px-3 py-2 bg-surface border border-[#323234] rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={submitBackfill}
                                    disabled={!backfill.habit_id || !backfill.date}
                                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-all"
                                >
                                    Save Log
                                </button>
                                <button onClick={() => setShowBackfill(false)}
                                    className="px-4 py-2 bg-[#323234] hover:bg-[#3A3A3C] text-white rounded-lg text-sm transition-all">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Delete log confirmation modal */}
            {
                deletingLogId && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-[#202022] rounded-2xl p-6 max-w-md w-full mx-4 border border-[#323234]">
                            <h3 className="text-lg font-semibold text-white mb-2">Delete Log Entry</h3>
                            <p className="text-text-secondary mb-6">Remove this log entry? The habit itself won't be deleted.</p>
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => setDeletingLogId(null)}
                                    className="px-4 py-2 bg-[#323234] hover:bg-[#3A3A3C] text-white rounded-lg text-sm transition-all">
                                    Cancel
                                </button>
                                <button onClick={() => deleteLog(deletingLogId)}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all">
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
