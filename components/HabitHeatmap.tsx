'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';

interface Habit {
    id: string;
    title: string;
    color: string;
}

interface HabitLog {
    date: string;
    habit_id: string;
    completed: boolean;
}

interface DayData {
    date: string;
    count: number;
    habits: string[];
}

export function HabitHeatmap() {
    const [habits, setHabits] = useState<Habit[]>([]);
    const [logs, setLogs] = useState<HabitLog[]>([]);
    const [heatmapData, setHeatmapData] = useState<DayData[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (habits.length && logs.length) {
            generateHeatmapData();
        }
    }, [habits, logs]);

    async function fetchData() {
        // Fetch habits
        const { data: habitsData } = await supabase
            .from('habits')
            .select('*');

        if (habitsData) setHabits(habitsData);

        // Fetch logs for the past 365 days
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 365);
        const startDateStr = startDate.toISOString().split('T')[0];

        const { data: logsData } = await supabase
            .from('habit_logs')
            .select('date, habit_id, completed')
            .gte('date', startDateStr)
            .eq('completed', true);

        if (logsData) setLogs(logsData);
    }

    function generateHeatmapData() {
        const data: Record<string, DayData> = {};
        const today = new Date();

        // Initialize 365 days
        for (let i = 364; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            data[dateStr] = { date: dateStr, count: 0, habits: [] };
        }

        // Fill with log data
        logs.forEach(log => {
            if (data[log.date]) {
                data[log.date].count++;
                const habit = habits.find(h => h.id === log.habit_id);
                if (habit) {
                    data[log.date].habits.push(habit.title);
                }
            }
        });

        setHeatmapData(Object.values(data));
    }

    function getCellColor(count: number): string {
        if (count === 0) return '#262626';
        if (count === 1) return 'rgba(16, 185, 129, 0.3)'; // emerald-500, 30%
        if (count === 2) return 'rgba(16, 185, 129, 0.5)'; // emerald-500, 50%
        if (count === 3) return 'rgba(16, 185, 129, 0.7)'; // emerald-500, 70%
        return 'rgba(16, 185, 129, 1)'; // emerald-500, 100%
    }

    function getMonthLabel(weekIndex: number): string | null {
        const dayIndex = weekIndex * 7;
        if (dayIndex >= heatmapData.length) return null;

        const date = new Date(heatmapData[dayIndex].date);
        const day = date.getDate();

        // Show month label if it's the first week or if the month just changed
        if (day <= 7) {
            return date.toLocaleDateString('en-US', { month: 'short' });
        }
        return null;
    }

    // Group days into weeks
    const weeks: DayData[][] = [];
    for (let i = 0; i < heatmapData.length; i += 7) {
        weeks.push(heatmapData.slice(i, i + 7));
    }

    return (
        <div className="bg-[#202022] rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6">365-Day Habit Activity</h2>

            <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                    {/* Month labels */}
                    <div className="flex gap-[3px] mb-2 ml-6">
                        {weeks.map((_, weekIndex) => {
                            const label = getMonthLabel(weekIndex);
                            return (
                                <div key={weekIndex} className="w-[12px]">
                                    {label && (
                                        <span className="text-xs text-text-secondary">{label}</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Heatmap grid */}
                    <div className="flex gap-[3px]">
                        {/* Day labels */}
                        <div className="flex flex-col gap-[3px] justify-around text-xs text-text-secondary pr-2">
                            <div>Mon</div>
                            <div>Wed</div>
                            <div>Fri</div>
                        </div>

                        {/* Weeks */}
                        {weeks.map((week, weekIndex) => (
                            <div key={weekIndex} className="flex flex-col gap-[3px]">
                                {week.map((day, dayIndex) => {
                                    const date = new Date(day.date);
                                    const dayOfWeek = date.getDay();

                                    return (
                                        <div
                                            key={dayIndex}
                                            className="w-[12px] h-[12px] rounded-sm cursor-pointer hover:ring-2 hover:ring-white/30 transition-all relative group"
                                            style={{ backgroundColor: getCellColor(day.count) }}
                                            title={`${day.date}: ${day.count} habit${day.count !== 1 ? 's' : ''} completed`}
                                        >
                                            {/* Tooltip */}
                                            <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-10">
                                                <div className="bg-[#2A2A2C] border border-[#323234] rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                                                    <div className="text-xs font-medium text-white">
                                                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </div>
                                                    <div className="text-xs text-text-secondary mt-1">
                                                        {day.count === 0 ? 'No habits' : `${day.count} habit${day.count !== 1 ? 's' : ''}`}
                                                    </div>
                                                    {day.habits.length > 0 && (
                                                        <div className="text-xs text-emerald-400 mt-1">
                                                            {day.habits.join(', ')}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-2 mt-4 text-xs text-text-secondary">
                        <span>Less</span>
                        <div className="flex gap-1">
                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#262626' }} />
                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(16, 185, 129, 0.3)' }} />
                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(16, 185, 129, 0.5)' }} />
                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(16, 185, 129, 0.7)' }} />
                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(16, 185, 129, 1)' }} />
                        </div>
                        <span>More</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
