export interface StreakHabit {
    id: string;
    habit_type: 'boolean' | 'quantity';
    target_value?: number;
}

export interface StreakLog {
    habit_id: string;
    date: string;
    completed: boolean;
    value?: number;
}

/**
 * Calculate the current consecutive-day streak for a habit.
 * Walks backwards from `today` (YYYY-MM-DD) through `logs`.
 */
export function calcStreak(habit: StreakHabit, logs: StreakLog[], today: string): number {
    let streak = 0;
    const cur = new Date(today + 'T00:00:00'); // parse as local midnight
    while (true) {
        // Format using local date parts — avoids UTC offset shifting the date
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        const ds = `${y}-${m}-${d}`;
        const log = logs.find(l => l.habit_id === habit.id && l.date === ds);
        const done = habit.habit_type === 'boolean'
            ? !!log?.completed
            : (log?.value != null && habit.target_value != null && log.value >= habit.target_value);
        if (done) { streak++; cur.setDate(cur.getDate() - 1); }
        else break;
    }
    return streak;
}
export const HABIT_COLORS = [
    '#DE3C4B', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'
];

/**
 * Sort habits by color index in HABIT_COLORS array.
 */
export function sortHabitsByColor<T extends { color: string }>(habits: T[]): T[] {
    return [...habits].sort((a, b) => {
        const idxA = HABIT_COLORS.indexOf(a.color);
        const idxB = HABIT_COLORS.indexOf(b.color);
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });
}
