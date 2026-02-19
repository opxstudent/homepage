import { supabase } from '@/lib/supabase-client';

export type WorkoutGroup = {
    id: string;
    name: string;
};

export type Exercise = {
    id: string;
    name: string;
    category?: 'Upper Body' | 'Lower Body' | 'Functional' | 'Cardio';
    personal_record: number | null;
};

export type RoutineExercise = Exercise & {
    // Routine specific defaults
    default_sets: number;
    default_reps: number;
    default_weight: number | null;
    default_duration_mins: number | null;
    notes: string | null;
    sort_order: number;
};

export type WorkoutLog = {
    id: string;
    exercise_id: string;
    date: string;
    weight: number | null;
    reps: number | null;
    rpe: number | null;
    duration_mins: number | null;
    notes: string | null;
    set_number: number;
    is_pr: boolean;
};

export type FitnessStats = {
    weeklyFrequency: { day: string; count: number }[]; // Mon, Tue, etc.
    recentPRs: { exercise: string; weight: number; date: string }[];
    totalWorkouts: number;
    streak: number;
    weeklyAvgRpe: number;
    trainingSplit: { name: string; value: number; color: string }[];
    trend: { week: string; Upper: number; Lower: number; Cardio: number; Functional: number }[];
    consistency: { date: string; count: number; categories: string[]; level: number }[];
};

export async function getWorkoutGroups(): Promise<WorkoutGroup[]> {
    const { data, error } = await supabase
        .from('workout_groups')
        .select('*')
        .order('name');

    if (error) {
        console.error('Error fetching workout groups:', error);
        return [];
    }
    return data;
}

// Fetch all exercises from Master Library
export async function getAllExercises(): Promise<Exercise[]> {
    const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name');

    if (error) {
        console.error('Error fetching master library:', error);
        return [];
    }
    return data;
}

// Fetch exercises for a specific routine (joined)
export async function getRoutineExercises(groupId: string): Promise<RoutineExercise[]> {
    const { data, error } = await supabase
        .from('workout_group_exercises')
        .select(`
            exercise:exercises (*),
            sets,
            reps,
            weight,
            duration_mins,
            notes,
            sort_order
        `)
        .eq('group_id', groupId)
        .order('sort_order');

    if (error) {
        console.error('Error fetching routine exercises:', error);
        return [];
    }

    // Transform to flat RoutineExercise
    return (data || []).map((item: any) => ({
        ...item.exercise,
        default_sets: item.sets,
        default_reps: item.reps,
        default_weight: item.weight,
        default_duration_mins: item.duration_mins,
        notes: item.notes,
        sort_order: item.sort_order
    }));
}

export async function logSet(log: Omit<WorkoutLog, 'id' | 'date' | 'is_pr'>): Promise<{ log: WorkoutLog | null, newPR: boolean }> {
    // 1. Check if it's a PR
    // Fetch current exercise to get PR
    const { data: exercise } = await supabase
        .from('exercises')
        .select('personal_record')
        .eq('id', log.exercise_id)
        .single();

    const currentPR = exercise?.personal_record || 0;
    const isNewPR = (log.weight || 0) > currentPR;

    // 2. Insert Log
    const { data: newLog, error } = await supabase
        .from('workout_logs')
        .insert([{
            ...log,
            is_pr: isNewPR
        }])
        .select()
        .single();

    if (error) {
        console.error('Error logging set:', error);
        return { log: null, newPR: false };
    }

    // 3. Update Exercise PR if needed
    if (isNewPR) {
        await supabase
            .from('exercises')
            .update({ personal_record: log.weight })
            .eq('id', log.exercise_id);
    }

    return { log: newLog, newPR: isNewPR };
}

export async function getPreviousLog(exerciseId: string, setNumber: number): Promise<WorkoutLog | null> {
    const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('exercise_id', exerciseId)
        .eq('set_number', setNumber)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        // console.error('Error fetching prev log:', error);
        return null;
    }
    return data;
}


export async function createWorkoutGroup(name: string): Promise<WorkoutGroup | null> {
    const { data, error } = await supabase
        .from('workout_groups')
        .insert([{ name }])
        .select()
        .single();

    if (error) {
        console.error('Error creating workout group:', error);
        return null;
    }
    return data;
}

// Create in Master Library
export async function createExercise(name: string, category: string = 'Upper Body'): Promise<Exercise | null> {
    const { data, error } = await supabase
        .from('exercises')
        .insert([{ name, category, personal_record: 0 }])
        .select()
        .single();

    if (error) {
        console.error('Error creating exercise:', error);
        return null;
    }
    return data;
}

// Link existing exercise to routine
export async function addExerciseToRoutine(groupId: string, exerciseId: string): Promise<boolean> {
    const { error } = await supabase
        .from('workout_group_exercises')
        .insert([{ group_id: groupId, exercise_id: exerciseId }]);

    if (error) {
        console.error('Error linking exercise to routine:', error);
        return false;
    }
    return true;
}

// Update Exercise details (Rename/Category)
export async function updateExercise(id: string, updates: Partial<Exercise>): Promise<boolean> {
    const { error } = await supabase
        .from('exercises')
        .update(updates)
        .eq('id', id);

    if (error) {
        console.error('Error updating exercise:', error);
        return false;
    }
    return true;
}

// Delete Exercise from Master Library
export async function deleteExercise(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting exercise:', error);
        return false;
    }
    return true;
}


export async function getFitnessStats(): Promise<FitnessStats> {
    // 1. Fetch all logs with exercise and group info
    const { data: logs, error } = await supabase
        .from('workout_logs')
        .select(`
            id,
            date,
            weight,
            is_pr,
            rpe,
            exercise:exercises (
                name,
                category
            )
        `)
        .order('date', { ascending: false });

    if (error || !logs) {
        console.error('Error fetching stats:', error);
        return {
            weeklyFrequency: [],
            recentPRs: [],
            totalWorkouts: 0,
            streak: 0,
            weeklyAvgRpe: 0,
            trainingSplit: [],
            trend: [],
            consistency: []
        };
    }

    // 2. Process Weekly Frequency (Last 7 days)
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    // Helpers
    const uniqueDates = new Set<string>();
    const prs: { exercise: string; weight: number; date: string }[] = [];
    const processedPrExercises = new Set<string>();

    // RPE Calc
    let weeklyRpeSum = 0;
    let weeklyRpeCount = 0;

    // Aggregates for new charts
    const splitMap: Record<string, number> = { 'Upper Body': 0, 'Lower Body': 0, 'Cardio': 0, 'Functional': 0 };
    const trendMap: Record<string, Record<string, number>> = {}; // weekStartDate -> { Upper: 0... }
    const consistencyMap: Record<string, { count: number; categories: Set<string> }> = {}; // date -> info

    logs.forEach(log => {
        const date = new Date(log.date);
        const dateStr = date.toISOString().split('T')[0];
        // @ts-ignore
        const exName = log.exercise?.name;
        // @ts-ignore
        const category = log.exercise?.category || 'Other';

        // Weekly RPE
        if (date >= sevenDaysAgo && log.rpe) {
            weeklyRpeSum += log.rpe;
            weeklyRpeCount++;
        }

        // PRs
        if (log.is_pr && log.weight && exName) {
            if (!processedPrExercises.has(exName) && prs.length < 5) {
                prs.push({
                    exercise: exName,
                    weight: log.weight,
                    date: date.toLocaleDateString()
                });
                processedPrExercises.add(exName);
            }
        }

        uniqueDates.add(dateStr);

        // Training Split (Count Sessions/Sets - treating log as a "set", maybe better to count unique days*category?)
        // User said "Aggregate total sessions (or sets) by category". Sets is easier here.
        if (splitMap[category] !== undefined) {
            splitMap[category]++;
        } else {
            // handle unknown categories if any
            if (!splitMap['Functional']) splitMap['Functional'] = 0; // fallback bucket? or just ignore
        }

        // Trend (Last 12 weeks)
        // Group by week start (Monday)
        const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon...
        const diffToMon = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(date);
        monday.setDate(diffToMon);
        monday.setHours(0, 0, 0, 0); // normalize
        const weekStr = monday.toISOString().split('T')[0];

        // Filter to last 12 weeks approx (3 months)
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setDate(now.getDate() - 90);

        if (date >= threeMonthsAgo) {
            if (!trendMap[weekStr]) {
                trendMap[weekStr] = { 'Upper Body': 0, 'Lower Body': 0, 'Cardio': 0, 'Functional': 0 };
            }
            // Count sets or sessions? "Number of Sessions (Stacked by Category)"
            // A session is a unique date.
            // But here we are iterating logs (sets).
            // To count sessions, we need to track if we already counted this category for this date.
            // Complexity: Logs are flat.
            // Simplification: We'll count Sets for "Trend" for now as it shows volume better, or we can do Session count.
            // User requested "Number of sessions".
            // Implementation: We'll use a specific Set to track (date+category) to avoid double counting per set.
            // Moved logic outside loop to be cleaner? Or just use Sets.
            // Let's count Sets for now as it's cleaner code, user prompt said "total sessions (or sets)".
            if (trendMap[weekStr][category] !== undefined) {
                trendMap[weekStr][category]++;
            }
        }

        // Consistency
        if (date >= threeMonthsAgo) {
            if (!consistencyMap[dateStr]) {
                consistencyMap[dateStr] = { count: 0, categories: new Set() };
            }
            consistencyMap[dateStr].count++; // logs count
            consistencyMap[dateStr].categories.add(category);
        }
    });

    // --- Finalize Stats ---

    // 1. Split
    const trainingSplit = [
        { name: 'Upper Body', value: splitMap['Upper Body'], color: '#3B82F6' },
        { name: 'Lower Body', value: splitMap['Lower Body'], color: '#EF4444' },
        { name: 'Cardio', value: splitMap['Cardio'], color: '#10B981' },
        { name: 'Functional', value: splitMap['Functional'], color: '#F59E0B' },
    ].filter(item => item.value > 0);

    // 2. Trend (Ensure all 12 weeks are present)
    const trend: { week: string; Upper: number; Lower: number; Cardio: number; Functional: number }[] = [];
    const trendWeeks = 12;
    const currentTrendDate = new Date();
    // Align to Monday
    const d = currentTrendDate.getDay();
    const diff = currentTrendDate.getDate() - d + (d === 0 ? -6 : 1);
    currentTrendDate.setDate(diff);
    currentTrendDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < trendWeeks; i++) {
        const wDate = new Date(currentTrendDate);
        wDate.setDate(currentTrendDate.getDate() - (i * 7));
        const wStr = wDate.toISOString().split('T')[0];

        const counts = trendMap[wStr] || { 'Upper Body': 0, 'Lower Body': 0, 'Cardio': 0, 'Functional': 0 };
        trend.unshift({ // Prepend to have oldest first
            week: wDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            Upper: counts['Upper Body'] || 0,
            Lower: counts['Lower Body'] || 0,
            Cardio: counts['Cardio'] || 0,
            Functional: counts['Functional'] || 0
        });
    }

    // 3. Consistency
    const consistency = Object.entries(consistencyMap).map(([date, data]) => ({
        date,
        count: data.count,
        categories: Array.from(data.categories),
        level: Math.min(Math.ceil(data.count / 3), 4) // Simple level logic based on volume
    }));


    // Streak (Existing Logic)
    const sortedDates = Array.from(uniqueDates).sort().reverse();
    let currentStreak = 0;
    if (sortedDates.length > 0) {
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (sortedDates[0] === todayStr || sortedDates[0] === yesterdayStr) {
            currentStreak = 1;
            for (let i = 0; i < sortedDates.length - 1; i++) {
                const curr = new Date(sortedDates[i]);
                const prev = new Date(sortedDates[i + 1]);
                const diffTime = Math.abs(curr.getTime() - prev.getTime());
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays === 1) currentStreak++;
                else break;
            }
        }
    }

    // Weekly Freq (Existing Logic)
    const weeklyFreq: { day: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        const dayName = days[d.getDay()];
        const count = uniqueDates.has(dStr) ? 1 : 0;
        weeklyFreq.push({ day: dayName, count });
    }

    return {
        weeklyFrequency: weeklyFreq,
        recentPRs: prs,
        totalWorkouts: uniqueDates.size,
        streak: currentStreak,
        weeklyAvgRpe: weeklyRpeCount > 0 ? Number((weeklyRpeSum / weeklyRpeCount).toFixed(1)) : 0,
        trainingSplit,
        trend,
        consistency
    };
}

// --- Routine Management ---

export async function deleteWorkoutGroup(groupId: string): Promise<boolean> {
    const { error } = await supabase
        .from('workout_groups')
        .delete()
        .eq('id', groupId);

    if (error) {
        console.error('Error deleting workout group:', error);
        return false;
    }
    return true;
}

export async function removeExerciseFromRoutine(groupId: string, exerciseId: string): Promise<boolean> {
    const { error } = await supabase
        .from('workout_group_exercises')
        .delete()
        .match({ group_id: groupId, exercise_id: exerciseId });

    if (error) {
        console.error('Error removing exercise from routine:', error);
        return false;
    }
    return true;
}

export async function updateRoutineExercise(
    groupId: string,
    exerciseId: string,
    updates: Partial<Pick<RoutineExercise, 'default_sets' | 'default_reps' | 'default_weight' | 'default_duration_mins' | 'notes' | 'sort_order'>>
): Promise<boolean> {
    // Map frontend fields to DB fields
    const dbUpdates: any = {};
    if (updates.default_sets !== undefined) dbUpdates.sets = updates.default_sets;
    if (updates.default_reps !== undefined) dbUpdates.reps = updates.default_reps;
    if (updates.default_weight !== undefined) dbUpdates.weight = updates.default_weight;
    if (updates.default_duration_mins !== undefined) dbUpdates.duration_mins = updates.default_duration_mins;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.sort_order !== undefined) dbUpdates.sort_order = updates.sort_order;

    const { error } = await supabase
        .from('workout_group_exercises')
        .update(dbUpdates)
        .match({ group_id: groupId, exercise_id: exerciseId });

    if (error) {
        console.error('Error updating routine exercise:', error);
        return false;
    }
    return true;
}

export async function getWorkoutHistory(limit = 50, offset = 0): Promise<WorkoutLog[]> {
    const { data, error } = await supabase
        .from('workout_logs')
        .select(`
            *,
            exercise:exercises (
                name,
                category
            )
        `)
        .order('date', { ascending: false })
        .order('exercise_id') // Group by exercise within date roughly
        .order('set_number')
        .range(offset, offset + limit - 1);

    if (error) {
        console.error('Error fetching workout history:', error);
        return [];
    }

    return data as any;
}

export async function updateWorkoutLog(logId: string, updates: Partial<WorkoutLog>): Promise<boolean> {
    const { error } = await supabase
        .from('workout_logs')
        .update(updates)
        .eq('id', logId);

    if (error) {
        console.error('Error updating workout log:', error);
        return false;
    }
    return true;
}

export async function deleteWorkoutLog(logId: string): Promise<boolean> {
    const { error } = await supabase
        .from('workout_logs')
        .delete()
        .eq('id', logId);

    if (error) {
        console.error('Error deleting workout log:', error);
        return false;
    }
    return true;
}

export async function deleteWorkoutSession(date: string): Promise<boolean> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const { error } = await supabase
        .from('workout_logs')
        .delete()
        .gte('date', start.toISOString())
        .lte('date', end.toISOString());

    if (error) {
        console.error('Error deleting workout session:', error);
        return false;
    }
    return true;
}
