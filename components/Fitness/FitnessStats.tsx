'use client';

import { FitnessStats } from '@/lib/fitnessUtils';
import { Flame, TrendingUp, Timer, Calendar, Activity, Trophy, Info } from 'lucide-react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
    BarChart, Bar, XAxis, YAxis, Legend
} from 'recharts';

interface FitnessStatsProps {
    stats: FitnessStats;

}

export default function FitnessStatsDashboard({ stats }: FitnessStatsProps) {
    const { weeklyFrequency, recentPRs, totalWorkouts, streak, trainingSplit, trend, consistency, weeklyAvgRpe } = stats;

    return (
        <div className="space-y-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Quick Stats Grid Removed as per user request */}

            {/* Row 1: Split & Trend */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Training Split (Donut) */}
                <div className="bg-[#1a1a1c] p-6 rounded-xl flex flex-col">
                    <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Activity size={14} /> Training Split (30 Days)
                    </h3>
                    <div className="flex-1 w-full min-h-[200px] relative">
                        {trainingSplit.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={trainingSplit}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {trainingSplit.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: '#1a1a1c', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-text-secondary text-xs">No data yet</div>
                        )}
                        {/* Center Text */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <span className="text-2xl font-bold text-white">{trainingSplit.reduce((acc, curr) => acc + curr.value, 0)}</span>
                                <div className="text-[10px] text-text-secondary">SETS</div>
                            </div>
                        </div>
                    </div>
                    {/* Legend */}
                    <div className="flex flex-wrap gap-2 justify-center mt-4">
                        {trainingSplit.map((item, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                                <span className="text-[10px] text-text-secondary">{item.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Trend (Stacked Bar) */}
                <div className="md:col-span-2 bg-[#1a1a1c] p-6 rounded-xl flex flex-col">
                    <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
                        <TrendingUp size={14} /> 12-Week Trend
                    </h3>
                    <div className="flex-1 w-full min-h-[200px]">
                        {trend.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={trend}>
                                    <XAxis
                                        dataKey="week"
                                        stroke="#444"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    {/* <YAxis stroke="#444" fontSize={10} tickLine={false} axisLine={false} /> */}
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: '#1a1a1c', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                                    <Bar dataKey="Upper" name="Upper Body" stackId="a" fill="#3B82F6" radius={[0, 0, 4, 4]} />
                                    <Bar dataKey="Lower" name="Lower Body" stackId="a" fill="#EF4444" />
                                    <Bar dataKey="Cardio" name="Cardio" stackId="a" fill="#10B981" />
                                    <Bar dataKey="Functional" name="Functional" stackId="a" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-text-secondary text-xs">No trend data yet</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Row 2: Consistency & Recent PRs */}
            <div className="flex flex-col md:flex-row gap-6">
                {/* Consistency (Heatmap) */}
                <div className="bg-[#1a1a1c] p-6 rounded-xl w-fit h-fit">
                    <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Calendar size={14} /> Consistency (Last 3 Months)
                    </h3>
                    {/* GitHub Style Grid with Labels */}
                    <div className="flex gap-2 pb-2">
                        {/* Grid - Labels are internal now */}
                        <div className="flex-1 overflow-x-auto scrollbar-hide">
                            <ConsistencyHeatmap data={consistency} />
                        </div>
                    </div>
                </div>

                {/* Recent PRs */}
                <div className="bg-[#1a1a1c] p-6 rounded-xl flex-1">
                    <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-6 flex items-center gap-2">
                        <Trophy size={14} className="text-accent-date" />
                        Recent Achievements
                    </h3>
                    <div className="space-y-4">
                        {recentPRs.length === 0 ? (
                            <div className="text-center text-text-secondary text-xs py-8">No PRs yet. Go crush some weights!</div>
                        ) : (
                            recentPRs.map((pr, i) => (
                                <div key={i} className="flex items-center justify-between group">
                                    <div className="flex flex-col">
                                        <span className="text-white font-medium text-sm">{pr.exercise}</span>
                                        <span className="text-text-secondary text-[10px]">{pr.date}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-accent-date font-bold text-lg">{pr.weight}<span className="text-xs ml-0.5">kg</span></span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper for Heatmap
function ConsistencyHeatmap({ data }: { data: FitnessStats['consistency'] }) {
    // Generate last ~90 days grid
    // We need 13-14 columns (weeks) x 7 rows (days)
    const weeks = 13; // approx 3 months (90 days)
    const grid: { date: string; level: number; categories: string[] }[][] = [];

    // Create map for O(1) lookup
    const dataMap = new Map(data.map(d => [d.date, d]));

    const today = new Date();

    // Generate columns
    const cells = [];
    const weekColumns: { cells: any[], monthLabel?: string }[] = [];

    for (let w = 0; w < weeks; w++) {
        const weekCells = [];
        let monthLabel = '';

        for (let d = 0; d < 7; d++) {
            // Calculate date: Start from weeks ago
            // W=0 is the oldest week, W=weeks-1 is current week?
            // Actually, let's keep the previous logic: w=0 is oldest.
            // i goes from 0 to (weeks*7)-1
            const dayOffset = (w * 7) + d;
            const dateCalc = new Date();
            // We want to end today.
            // So TotalDays = weeks * 7.
            // StartDate = Today - TotalDays + 1
            // CurrentDate = StartDate + dayOffset
            const totalDays = weeks * 7;
            dateCalc.setDate(today.getDate() - totalDays + 1 + dayOffset);

            const dStr = dateCalc.toISOString().split('T')[0];
            const info = dataMap.get(dStr);

            weekCells.push({
                date: dStr,
                level: info?.level || 0,
                categories: info?.categories || [],
                dayOfWeek: dateCalc.getDay()
            });

            // Check for month label (first day of week or first week of month)
            // Simple logic: if date is 1st-7th of month? OR if it's the first column?
            // Better: If the Monday of this week is in a different month than the Monday of the previous week.
            // Or just check the first day of the week.
            if (d === 0) { // Monday (or whatever start day)
                const month = dateCalc.toLocaleString('default', { month: 'short' });
                // We store it to check uniqueness later or just blindly assign?
                // Visual consistency: Show label if it's the first appear of month?
                if (dateCalc.getDate() <= 7) {
                    monthLabel = month;
                }
            }
        }
        weekColumns.push({ cells: weekCells, monthLabel });
    }

    // Fix: Show label for the very first column regardless?
    if (weekColumns.length > 0 && !weekColumns[0].monthLabel) {
        // Get month of first cell
        const firstDate = new Date(weekColumns[0].cells[0].date);
        weekColumns[0].monthLabel = firstDate.toLocaleString('default', { month: 'short' });
    }

    return (
        <div className="flex flex-col w-full items-start">
            {/* Month Labels Row */}
            <div className="flex justify-start gap-1 mb-1 text-[10px] text-text-secondary h-4 w-fit pl-10">
                {weekColumns.map((col, i) => (
                    <div key={i} className="w-2.5 text-center overflow-visible relative">
                        {col.monthLabel && (
                            <span className="absolute left-0 bottom-0 whitespace-nowrap">{col.monthLabel}</span>
                        )}
                    </div>
                ))}
            </div>

            {/* Main Content: Row Labels + Grid (Aligned to Start) */}
            <div className="flex justify-start gap-2">
                {/* Row Labels */}
                <div className="flex flex-col gap-1 text-[10px] text-text-secondary leading-none text-right pt-0.5">
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                    <span>Sun</span>
                </div>

                {/* Heatmap Grid */}
                <div className="flex gap-1 justify-start scrollbar-hide">
                    {weekColumns.map((col, w) => (
                        <div key={w} className="grid grid-rows-7 gap-1">
                            {col.cells.map((cell, d) => {
                                // Color logic
                                let bgClass = 'bg-[#2a2a2c]';
                                if (cell.level === 1) bgClass = 'bg-[#10B981]/30';
                                if (cell.level === 2) bgClass = 'bg-[#10B981]/50';
                                if (cell.level === 3) bgClass = 'bg-[#10B981]/80';
                                if (cell.level >= 4) bgClass = 'bg-[#10B981]';

                                let style = {};
                                if (cell.categories.length > 0) {
                                    const hasUpper = cell.categories.includes('Upper Body');
                                    const hasLower = cell.categories.includes('Lower Body');
                                    const hasCardio = cell.categories.includes('Cardio');
                                    const hasFunctional = cell.categories.includes('Functional');

                                    if (cell.categories.length > 1) {
                                        // Gradient
                                        style = { background: `linear-gradient(135deg, ${hasUpper ? '#3B82F6' : (hasLower ? '#EF4444' : '#10B981')} 50%, ${hasLower ? '#EF4444' : (hasCardio ? '#10B981' : '#F59E0B')} 50%)` };
                                    } else {
                                        if (hasUpper) style = { backgroundColor: '#3B82F6' };
                                        else if (hasLower) style = { backgroundColor: '#EF4444' };
                                        else if (hasCardio) style = { backgroundColor: '#10B981' };
                                        else if (hasFunctional) style = { backgroundColor: '#F59E0B' };
                                        else style = { backgroundColor: '#10B981' };
                                    }
                                }

                                return (
                                    <div
                                        key={d}
                                        className={`w-2.5 h-2.5 rounded-[2px] ${cell.categories.length === 0 ? bgClass : ''} hover:ring-1 ring-white/50 transition-all cursor-pointer relative group`}
                                        style={style}
                                    >
                                        <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-black/90 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none border border-white/10">
                                            {cell.date}: {cell.categories.join(' & ') || 'No workout'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
