'use client';

import { useState, useEffect } from 'react';
import { getWorkoutHistory, updateWorkoutLog, deleteWorkoutLog, deleteWorkoutSession, WorkoutLog } from '@/lib/fitnessUtils';
import { Calendar, ChevronDown, ChevronRight, Dumbbell, Clock, Flame, Edit2, Check, X, Trash2, AlertTriangle } from 'lucide-react';

interface GroupedSession {
    date: string; // Display string "Mon, Jan 1"
    rawDate: string; // ISO string for sorting/logic if needed, taking first log's date
    exercises: Record<string, WorkoutLog[]>;
    totalSets: number;
    categories: Set<string>;
}

export default function WorkoutHistory() {
    const [history, setHistory] = useState<GroupedSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

    // Editing State
    const [editingLogId, setEditingLogId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<WorkoutLog>>({});

    // Delete Modal State
    const [deleteModal, setDeleteModal] = useState<{
        isOpen: boolean;
        type: 'log' | 'session';
        targetId?: string; // logId or date string for session
        targetName?: string; // For display
    }>({ isOpen: false, type: 'log' });

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        setLoading(true);
        const logs = await getWorkoutHistory(100); // Fetch last 100 sets for now
        processLogs(logs);
        setLoading(false);
    };

    const processLogs = (logs: WorkoutLog[]) => {
        // Group by Date -> Exercise
        const grouped: Record<string, any> = {};

        logs.forEach(log => {
            const dateObj = new Date(log.date);
            const dateDisplay = dateObj.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });

            if (!grouped[dateDisplay]) {
                grouped[dateDisplay] = {
                    date: dateDisplay,
                    rawDate: log.date, // Store one raw date from the session
                    exercises: {},
                    totalSets: 0,
                    categories: new Set()
                };
            }

            // @ts-ignore
            const exName = log.exercise?.name || 'Unknown Exercise';
            // @ts-ignore
            const cat = log.exercise?.category;
            if (cat) grouped[dateDisplay].categories.add(cat);

            if (!grouped[dateDisplay].exercises[exName]) {
                grouped[dateDisplay].exercises[exName] = [];
            }
            grouped[dateDisplay].exercises[exName].push(log);
            grouped[dateDisplay].totalSets++;
        });

        // Convert to array
        const sessionList = Object.values(grouped).sort((a: any, b: any) =>
            new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime()
        );

        setHistory(sessionList as GroupedSession[]);
    };

    const toggleDate = (date: string) => {
        const newExpanded = new Set(expandedDates);
        if (newExpanded.has(date)) {
            newExpanded.delete(date);
        } else {
            newExpanded.add(date);
        }
        setExpandedDates(newExpanded);
    };

    // --- Edit Handlers ---

    const handleEditClick = (log: WorkoutLog) => {
        setEditingLogId(log.id);
        setEditForm({
            weight: log.weight,
            reps: log.reps,
            rpe: log.rpe,
            duration_mins: log.duration_mins,
            notes: log.notes,
            set_number: log.set_number
        });
    };

    const handleCancelEdit = () => {
        setEditingLogId(null);
        setEditForm({});
    };

    const handleSaveEdit = async () => {
        if (!editingLogId) return;

        const success = await updateWorkoutLog(editingLogId, editForm);
        if (success) {
            await loadHistory();
            setEditingLogId(null);
            setEditForm({});
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSaveEdit();
        if (e.key === 'Escape') handleCancelEdit();
    };

    // --- Delete Handlers ---

    const promptDeleteLog = (logId: string) => {
        setDeleteModal({
            isOpen: true,
            type: 'log',
            targetId: logId,
            targetName: 'this set'
        });
    };

    const promptDeleteSession = (sessionRawDate: string, displayDate: string) => {
        // Prevent event propagation if clicking on header
        setDeleteModal({
            isOpen: true,
            type: 'session',
            targetId: sessionRawDate,
            targetName: `the entire session from ${displayDate}`
        });
    };

    const confirmDelete = async () => {
        if (!deleteModal.targetId) return;

        let success = false;
        if (deleteModal.type === 'log') {
            success = await deleteWorkoutLog(deleteModal.targetId);
        } else {
            success = await deleteWorkoutSession(deleteModal.targetId);
        }

        if (success) {
            await loadHistory();
            if (editingLogId === deleteModal.targetId) {
                setEditingLogId(null);
                setEditForm({});
            }
        }
        setDeleteModal({ ...deleteModal, isOpen: false });
    };

    if (loading) {
        return <div className="p-8 text-center text-text-secondary animate-pulse">Loading history...</div>;
    }

    if (history.length === 0) {
        return (
            <div className="p-12 text-center text-text-secondary border border-dashed border-white/10 rounded-xl">
                <Calendar className="mx-auto mb-4 opacity-50" size={48} />
                <p>No workout history found yet.</p>
                <p className="text-xs mt-2">Complete a workout to see it here.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-8 duration-300 relative">
            <h2 className="text-2xl font-bold text-white mb-6">Workout History</h2>

            <div className="grid gap-4">
                {history.map(session => (
                    <div key={session.date} className="bg-[#1a1a1c] border border-white/5 rounded-xl overflow-hidden transition-all group/card">
                        {/* Header Card */}
                        <div
                            onClick={() => toggleDate(session.date)}
                            className="p-4 cursor-pointer hover:bg-white/5 flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-lg transition-colors ${expandedDates.has(session.date) ? 'bg-accent-blue/20 text-accent-blue' : 'bg-white/5 text-text-secondary group-hover:text-white'}`}>
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white mb-0.5">{session.date}</h3>
                                    <div className="text-xs text-text-secondary flex gap-2">
                                        <span>{Object.keys(session.exercises).length} Exercises</span>
                                        <span>•</span>
                                        <span>{session.totalSets} Sets</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex gap-1 hidden sm:flex">
                                    {Array.from(session.categories).slice(0, 3).map((cat: string) => (
                                        <span key={cat} className="text-[10px] px-2 py-0.5 bg-white/5 rounded-full text-text-secondary border border-white/5">
                                            {cat}
                                        </span>
                                    ))}
                                    {session.categories.size > 3 && (
                                        <span className="text-[10px] px-2 py-0.5 bg-white/5 rounded-full text-text-secondary border border-white/5">
                                            +{session.categories.size - 3}
                                        </span>
                                    )}
                                </div>

                                {/* Delete Session Button (Visible on Hover/Expand) */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); promptDeleteSession(session.rawDate, session.date); }}
                                    className={`text-text-secondary hover:text-red-500 p-2 hover:bg-white/10 rounded-full transition-all ${expandedDates.has(session.date) || 'opacity-0 group-hover/card:opacity-100'}`}
                                    title="Delete Entire Session"
                                >
                                    <Trash2 size={16} />
                                </button>

                                {expandedDates.has(session.date) ? <ChevronDown size={20} className="text-text-secondary" /> : <ChevronRight size={20} className="text-text-secondary" />}
                            </div>
                        </div>

                        {/* Expanded Details */}
                        {expandedDates.has(session.date) && (
                            <div className="border-t border-white/5 bg-[#151516] p-4 space-y-6 animate-in slide-in-from-top-2 duration-200">
                                {Object.entries(session.exercises).map(([exName, exLogs]) => (
                                    <div key={exName} className="space-y-2">
                                        <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                                            <Dumbbell size={14} className="text-accent-blue" />
                                            {exName}
                                        </h4>

                                        {/* Table Header (Desktop Only) */}
                                        <div className="hidden md:grid grid-cols-12 gap-2 text-[10px] uppercase font-bold text-text-secondary px-2 mb-1">
                                            <div className="col-span-1 text-center">#</div>
                                            <div className="col-span-2">Weight</div>
                                            <div className="col-span-2">Reps</div>
                                            <div className="col-span-1">RPE</div>
                                            <div className="col-span-2">Duration</div>
                                            <div className="col-span-4">Notes</div>
                                        </div>

                                        <div className="space-y-1">
                                            {exLogs.map((log: WorkoutLog) => (
                                                <div key={log.id} className="flex flex-col md:grid md:grid-cols-12 gap-2 text-xs py-2 border-b border-white/5 last:border-0 hover:bg-white/5 px-2 rounded -mx-2 bg-[#1a1a1c]/50 items-start md:items-center group">
                                                    {editingLogId === log.id ? (
                                                        // Editing Mode
                                                        <div className="w-full grid grid-cols-12 gap-2">
                                                            <div className="col-span-2 md:col-span-1 text-center">
                                                                <label className="text-[9px] text-text-secondary uppercase md:hidden block mb-1">Set</label>
                                                                <input
                                                                    type="number"
                                                                    className="w-full bg-black/40 text-white text-center rounded focus:outline-accent-blue py-1"
                                                                    value={editForm.set_number}
                                                                    onChange={e => setEditForm({ ...editForm, set_number: parseInt(e.target.value) || 0 })}
                                                                />
                                                            </div>
                                                            <div className="col-span-3 md:col-span-2">
                                                                <label className="text-[9px] text-text-secondary uppercase md:hidden block mb-1">Kg</label>
                                                                <input
                                                                    type="number"
                                                                    className="w-full bg-black/40 text-white rounded focus:outline-accent-blue py-1 px-1"
                                                                    placeholder="kg"
                                                                    value={editForm.weight || ''}
                                                                    onChange={e => setEditForm({ ...editForm, weight: parseFloat(e.target.value) || null })}
                                                                />
                                                            </div>
                                                            <div className="col-span-3 md:col-span-2">
                                                                <label className="text-[9px] text-text-secondary uppercase md:hidden block mb-1">Reps</label>
                                                                <input
                                                                    type="number"
                                                                    className="w-full bg-black/40 text-white rounded focus:outline-accent-blue py-1 px-1"
                                                                    placeholder="reps"
                                                                    value={editForm.reps || ''}
                                                                    onChange={e => setEditForm({ ...editForm, reps: parseFloat(e.target.value) || null })}
                                                                />
                                                            </div>
                                                            <div className="col-span-2 md:col-span-1">
                                                                <label className="text-[9px] text-text-secondary uppercase md:hidden block mb-1">RPE</label>
                                                                <input
                                                                    type="number"
                                                                    max="10"
                                                                    className="w-full bg-black/40 text-white rounded focus:outline-accent-blue py-1 px-1"
                                                                    placeholder="-"
                                                                    value={editForm.rpe || ''}
                                                                    onChange={e => setEditForm({ ...editForm, rpe: parseFloat(e.target.value) || null })}
                                                                />
                                                            </div>
                                                            <div className="col-span-2 md:col-span-2">
                                                                <label className="text-[9px] text-text-secondary uppercase md:hidden block mb-1">Time</label>
                                                                <input
                                                                    type="number"
                                                                    className="w-full bg-black/40 text-white rounded focus:outline-accent-blue py-1 px-1"
                                                                    placeholder="mins"
                                                                    value={editForm.duration_mins || ''}
                                                                    onChange={e => setEditForm({ ...editForm, duration_mins: parseFloat(e.target.value) || null })}
                                                                />
                                                            </div>
                                                            <div className="col-span-12 md:col-span-3">
                                                                <label className="text-[9px] text-text-secondary uppercase md:hidden block mb-1">Notes</label>
                                                                <input
                                                                    type="text"
                                                                    className="w-full bg-black/40 text-white rounded focus:outline-accent-blue py-1 px-1"
                                                                    placeholder="Notes..."
                                                                    value={editForm.notes || ''}
                                                                    onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                                                                    onKeyDown={handleKeyDown}
                                                                    autoFocus
                                                                />
                                                            </div>
                                                            <div className="col-span-12 md:col-span-1 flex justify-end gap-1 items-center mt-2 md:mt-0">
                                                                <button onClick={handleSaveEdit} className="text-green-500 hover:bg-green-500/10 p-1 rounded" title="Save"><Check size={14} /></button>
                                                                <button onClick={handleCancelEdit} className="text-text-secondary hover:bg-white/10 p-1 rounded" title="Cancel"><X size={14} /></button>
                                                                <button onClick={() => promptDeleteLog(log.id)} className="text-red-500 hover:bg-red-500/10 p-1 rounded ml-1" title="Delete"><Trash2 size={14} /></button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        // View Mode
                                                        <div className="w-full grid grid-cols-12 md:grid-cols-12 gap-2 items-center">
                                                            <div className="col-span-2 md:col-span-1 text-text-secondary font-mono flex items-center justify-start md:justify-center">
                                                                <span className="md:hidden text-[9px] uppercase mr-1">Set</span> {log.set_number}
                                                            </div>
                                                            <div className="col-span-3 md:col-span-2 text-white font-medium flex items-center gap-1">
                                                                {log.weight ? `${log.weight}kg` : '-'}
                                                                {log.is_pr && <span className="text-[9px] bg-accent-date/20 text-accent-date px-1 rounded flex items-center gap-0.5"><Flame size={8} />PR</span>}
                                                            </div>
                                                            <div className="col-span-3 md:col-span-2 text-text-secondary flex items-center">
                                                                {log.reps ? `${log.reps} reps` : '-'}
                                                            </div>
                                                            <div className="col-span-2 md:col-span-1 text-text-secondary flex items-center">
                                                                <span className="md:hidden text-[9px] uppercase mr-1">RPE</span> {log.rpe ?? '-'}
                                                            </div>
                                                            <div className="col-span-2 md:col-span-2 text-text-secondary flex items-center">
                                                                <span className="md:hidden text-[9px] uppercase mr-1">Time</span> {log.duration_mins ? `${log.duration_mins}m` : '-'}
                                                            </div>

                                                            {/* Notes & Edit Button */}
                                                            <div className="col-span-12 md:col-span-4 flex justify-between items-center mt-1 md:mt-0">
                                                                <div className="text-text-secondary truncate italic flex items-center text-[10px] flex-1">
                                                                    {log.notes || ''}
                                                                </div>
                                                                <div className="flex justify-end opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                                                    <button
                                                                        onClick={() => handleEditClick(log)}
                                                                        className="text-text-secondary hover:text-white p-1 hover:bg-white/10 rounded"
                                                                    >
                                                                        <Edit2 size={12} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Custom Delete Modal */}
            {deleteModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#1a1a1c] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-red-500/10 text-red-500 rounded-full">
                                <AlertTriangle size={24} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-white">Confirm Deletion</h3>
                                <p className="text-text-secondary text-sm">
                                    Are you sure you want to delete <span className="text-white font-medium">{deleteModal.targetName}</span>?
                                    {deleteModal.type === 'session' && " This action cannot be undone and will remove all logs for this date."}
                                    {deleteModal.type === 'log' && " This action cannot be undone."}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end mt-4">
                            <button
                                onClick={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                                className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 text-sm font-medium bg-red-500/20 text-red-500 hover:bg-red-500/30 rounded-lg transition-colors"
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
