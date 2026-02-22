'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Minus, Plus, Circle, CheckCircle2 } from 'lucide-react';
import { getLocalISOString } from '@/lib/dateUtils';
import { sortHabitsByColor } from '@/lib/habitUtils';

interface Habit {
    id: string;
    title: string;
    color: string;
    habit_type: 'boolean' | 'quantity';
    target_value?: number;
}

interface HabitLog {
    habit_id: string;
    date: string;
    completed: boolean;
    value?: number;
}

export default function HabitsWidget() {
    const [habits, setHabits] = useState<Habit[]>([]);
    const [todayValues, setTodayValues] = useState<Record<string, number>>({});
    const [todayCompleted, setTodayCompleted] = useState<Record<string, boolean>>({});
    const [today, setToday] = useState(getLocalISOString);
    const todayRef = useRef(today);
    todayRef.current = today;

    useEffect(() => {
        fetchAll();

        function handleVisibilityChange() {
            if (document.visibilityState === 'visible') {
                const newDate = getLocalISOString();
                if (newDate !== todayRef.current) {
                    setToday(newDate);
                    todayRef.current = newDate;
                }
                fetchAll();
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    async function fetchAll() {
        const t = todayRef.current;
        const [habitsRes, logsRes] = await Promise.all([
            supabase.from('habits').select('*'),
            supabase.from('habit_logs')
                .select('habit_id, date, completed, value')
                .eq('date', t),
        ]);

        if (habitsRes.data) {
            setHabits(sortHabitsByColor(habitsRes.data));
        }
        if (logsRes.data) {
            const valMap: Record<string, number> = {};
            const compMap: Record<string, boolean> = {};
            logsRes.data.forEach((l: any) => {
                valMap[l.habit_id] = l.value || 0;
                compMap[l.habit_id] = l.completed;
            });
            setTodayValues(valMap);
            setTodayCompleted(compMap);
        }
    }

    async function toggleBoolean(habitId: string) {
        const next = true;
        setTodayCompleted(prev => ({ ...prev, [habitId]: next }));
        await supabase.from('habit_logs').upsert(
            { habit_id: habitId, date: todayRef.current, completed: next },
            { onConflict: 'habit_id,date' }
        );
        fetchAll();
    }

    async function updateQuantity(habit: Habit, value: number) {
        const completed = habit.target_value != null && value >= habit.target_value;
        setTodayValues(prev => ({ ...prev, [habit.id]: value }));
        setTodayCompleted(prev => ({ ...prev, [habit.id]: completed }));
        await supabase.from('habit_logs').upsert(
            { habit_id: habit.id, date: todayRef.current, value, completed },
            { onConflict: 'habit_id,date' }
        );
        fetchAll();
    }

    const allDone = habits.length > 0 && habits.every(h => todayCompleted[h.id]);

    return (
        <div className="bg-[#1E1E1E] rounded-xl p-4 border border-white/5 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-[10px] font-bold text-text-secondary/60 uppercase tracking-[0.2em]">Action Deck: Habits</h3>
                {allDone && <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">All Done ✨</span>}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                {habits.filter(h => !todayCompleted[h.id]).map((habit) => {
                    const currentValue = todayValues[habit.id] || 0;
                    const isDone = todayCompleted[habit.id];
                    const isStarted = currentValue > 0;

                    let statusIcon = <Circle size={14} className="text-text-secondary/30" />;
                    let bgColor = 'hover:bg-white/[0.02]';
                    let textColor = 'text-text-secondary';
                    let accentColor = 'bg-white/10';

                    if (isDone) {
                        statusIcon = <CheckCircle2 size={14} className="text-emerald-500" />;
                        bgColor = 'bg-emerald-500/5 hover:bg-emerald-500/10';
                        textColor = 'text-white';
                        accentColor = 'bg-emerald-500/20';
                    } else if (isStarted) {
                        statusIcon = <Circle size={14} className="text-blue-400" fill="currentColor" fillOpacity={0.2} />;
                        bgColor = 'bg-blue-500/5 hover:bg-blue-500/10';
                        textColor = 'text-white';
                        accentColor = 'bg-blue-500/20';
                    }

                    return (
                        <div
                            key={habit.id}
                            onClick={() => habit.habit_type === 'boolean' ? toggleBoolean(habit.id) : updateQuantity(habit, habit.target_value || currentValue + 1)}
                            className={`group flex items-center gap-3 p-2 rounded-lg transition-all cursor-pointer border border-white/5 hover:border-white/10 ${bgColor}`}
                        >
                            <div
                                className="w-1.5 self-stretch rounded-full"
                                style={{ backgroundColor: habit.color || '#3B82F6' }}
                            />
                            <div className="shrink-0 transition-transform group-active:scale-90">
                                {statusIcon}
                            </div>

                            <div className="flex-1 min-w-0">
                                <span className={`text-[12px] font-medium truncate block ${textColor}`}>
                                    {habit.title}
                                </span>
                            </div>

                            {habit.habit_type === 'quantity' && (
                                <div className="flex items-center gap-2">
                                    <div className="flex bg-black/20 rounded-md overflow-hidden border border-white/5">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                updateQuantity(habit, Math.max(0, currentValue - 1));
                                            }}
                                            className="px-2 py-1.5 hover:bg-white/5 text-text-secondary hover:text-white transition-colors border-r border-white/10"
                                        >
                                            <Minus size={10} />
                                        </button>
                                        <div className="px-2.5 py-1.5 min-w-[32px] text-center flex items-center justify-center">
                                            <span className={`text-[10px] font-mono font-bold ${isDone ? 'text-emerald-400' : isStarted ? 'text-blue-400' : 'text-text-secondary/60'}`}>
                                                {currentValue}
                                            </span>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                updateQuantity(habit, currentValue + 1);
                                            }}
                                            className="px-2 py-1.5 hover:bg-white/5 text-text-secondary hover:text-white transition-colors border-l border-white/10"
                                        >
                                            <Plus size={10} />
                                        </button>
                                    </div>
                                    <span className="text-[9px] font-mono text-text-secondary/30 w-8">/ {habit.target_value}</span>
                                </div>
                            )}

                            {habit.habit_type === 'boolean' && !isDone && (
                                <div className="px-2 py-1 rounded bg-white/5 text-[9px] font-bold text-text-secondary/40 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                                    LOG
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
