'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Minus, Plus, Circle } from 'lucide-react';
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

    const pendingHabits = habits.filter(h => !todayCompleted[h.id]);

    return (
        <div className="bg-surface rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Today's Habits</h3>
            <div className="space-y-2">
                {pendingHabits.length === 0 && (
                    <p className="text-text-secondary text-sm text-center py-4">All done for today! ✨</p>
                )}
                {pendingHabits.map((habit) => {
                    const currentValue = todayValues[habit.id] || 0;

                    return (
                        <div
                            key={habit.id}
                            className="w-full flex items-center gap-3 p-3 bg-active hover:bg-[#323234] rounded-xl transition-all group"
                        >
                            <button
                                onClick={() => habit.habit_type === 'boolean' ? toggleBoolean(habit.id) : updateQuantity(habit, habit.target_value || 0)}
                                className="flex-shrink-0"
                            >
                                <Circle size={20} className="text-text-secondary group-hover:text-text-primary flex-shrink-0" />
                            </button>

                            <div className="flex items-center gap-3 flex-1">
                                <span className="text-sm text-left text-text-primary">
                                    {habit.title}
                                </span>

                                {habit.habit_type === 'quantity' && (
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button onClick={(e) => { e.stopPropagation(); updateQuantity(habit, Math.max(0, currentValue - 1)); }}
                                            className="w-5 h-5 flex items-center justify-center bg-surface hover:bg-[#323234] border border-[#323234] rounded text-white transition-all">
                                            <Minus size={10} />
                                        </button>
                                        <div className="flex items-center justify-center gap-0.5 min-w-[3ch]">
                                            <span className="text-white text-xs font-medium">{currentValue}</span>
                                            <span className="text-text-secondary text-xs">/{habit.target_value}</span>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); updateQuantity(habit, currentValue + 1); }}
                                            className="w-5 h-5 flex items-center justify-center bg-surface hover:bg-[#323234] border border-[#323234] rounded text-white transition-all">
                                            <Plus size={10} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
