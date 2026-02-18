'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase-client';
import { getLocalISOString } from '@/lib/dateUtils';
import { HabitOverview } from './HabitOverview';
import { HabitHistory } from './HabitHistory';
import { sortHabitsByColor } from '@/lib/habitUtils';

export interface Habit {
    id: string;
    title: string;
    color: string;
    created_at: string;
    habit_type: 'boolean' | 'quantity';
    target_value?: number;
    unit?: string;
}

export interface HabitLog {
    id: string;
    habit_id: string;
    date: string;
    completed: boolean;
    value?: number;
}

export default function HabitDashboard() {
    const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
    const [habits, setHabits] = useState<Habit[]>([]);
    const [allLogs, setAllLogs] = useState<HabitLog[]>([]);
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
        const [habitsRes, logsRes] = await Promise.all([
            supabase.from('habits').select('*'),
            supabase.from('habit_logs').select('id, habit_id, date, completed, value')
                .gte('date', (() => {
                    const now = new Date();
                    return `${now.getFullYear()}-01-01`;
                })())
                .order('date', { ascending: false }),
        ]);
        if (habitsRes.data) {
            setHabits(sortHabitsByColor(habitsRes.data));
        }
        if (logsRes.data) setAllLogs(logsRes.data);
    }

    return (
        <div className="min-h-screen p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-1">Habits</h1>
                        <p className="text-text-secondary">Track your daily habits and build streaks</p>
                    </div>
                    {/* Tab switcher */}
                    <div className="flex bg-[#202022] rounded-xl p-1 gap-1">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'overview'
                                ? 'bg-emerald-600 text-white'
                                : 'text-text-secondary hover:text-white'
                                }`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'history'
                                ? 'bg-emerald-600 text-white'
                                : 'text-text-secondary hover:text-white'
                                }`}
                        >
                            History
                        </button>
                    </div>
                </div>

                {/* Tab content */}
                {activeTab === 'overview' ? (
                    <HabitOverview
                        habits={habits}
                        allLogs={allLogs}
                        today={today}
                        onRefresh={fetchAll}
                    />
                ) : (
                    <HabitHistory
                        habits={habits}
                        allLogs={allLogs}
                        today={today}
                        onRefresh={fetchAll}
                    />
                )}
            </div>
        </div>
    );
}
