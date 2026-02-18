'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Square, Save, Clock } from 'lucide-react';
import { Exercise, logSet } from '@/lib/fitnessUtils';

interface WorkoutLoggerProps {
    exercise: Exercise | null;
    onLogSuccess: (newPR: boolean) => void;
}

export default function WorkoutLogger({ exercise, onLogSuccess }: WorkoutLoggerProps) {
    const [weight, setWeight] = useState('');
    const [reps, setReps] = useState('');
    const [rpe, setRpe] = useState('');
    const [notes, setNotes] = useState('');
    const [duration, setDuration] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);

    const handleLog = async () => {
        if (!exercise) return;

        const { newPR } = await logSet({
            exercise_id: exercise.id,
            weight: parseFloat(weight) || null,
            reps: parseInt(reps) || null,
            rpe: parseInt(rpe) || null,
            duration_mins: parseInt(duration) || null,
            notes: notes.trim() || null,
            set_number: 1 // Default to 1 for quick logs
        });

        // Reset form
        setWeight('');
        setReps('');
        setRpe('');
        setNotes('');
        setDuration('');

        onLogSuccess(newPR);
    };

    if (!exercise) {
        return (
            <div className="flex items-center justify-center p-8 border border-dashed border-white/10 rounded-xl text-text-secondary">
                Select an exercise to start logging
            </div>
        );
    }

    return (
        <div className="bg-[#1a1a1c] border border-white/5 rounded-xl p-6 flex flex-col gap-6">
            <div
                className="flex items-center justify-between cursor-pointer hover:bg-white/5 p-4 -m-6 mb-0 rounded-t-xl transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-white">{exercise.name}</h2>
                    {exercise.personal_record && (
                        <span className="text-xs text-accent-date bg-accent-date/10 px-2 py-0.5 rounded flex items-center gap-1">
                            <span className="opacity-50">PR</span>
                            {exercise.personal_record}kg
                        </span>
                    )}
                </div>
                <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                        <path d="m6 9 6 6 6-6" />
                    </svg>
                </div>
            </div>

            {isExpanded && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-6 pt-2">

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-text-secondary uppercase font-bold">Weight (kg)</label>
                            <input
                                type="number"
                                value={weight}
                                onChange={(e) => setWeight(e.target.value)}
                                className="w-full bg-[#202022] border border-white/10 rounded-lg px-3 h-11 text-white focus:outline-none focus:border-accent-blue"
                                placeholder="0"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-text-secondary uppercase font-bold">Reps</label>
                            <input
                                type="number"
                                value={reps}
                                onChange={(e) => setReps(e.target.value)}
                                className="w-full bg-[#202022] border border-white/10 rounded-lg px-3 h-11 text-white focus:outline-none focus:border-accent-blue"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-text-secondary uppercase font-bold">RPE (1-10)</label>
                            <input
                                type="number"
                                max="10"
                                value={rpe}
                                onChange={(e) => setRpe(e.target.value)}
                                className="w-full bg-[#202022] border border-white/10 rounded-lg px-3 h-11 text-white focus:outline-none focus:border-accent-blue"
                                placeholder="-"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-text-secondary uppercase font-bold">Duration (Mins)</label>
                            <input
                                type="number"
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                className="w-full bg-[#202022] border border-white/10 rounded-lg px-3 h-11 text-white focus:outline-none focus:border-accent-blue"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    {/* Notes Section */}
                    <div className="space-y-1">
                        <label className="text-xs text-text-secondary uppercase font-bold">Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full bg-[#202022] border border-white/10 rounded-lg px-3 py-3 text-white focus:outline-none focus:border-accent-blue min-h-[80px] text-sm resize-none"
                            placeholder="How did it feel? Any form cues?"
                        />
                    </div>

                    {/* Mobile: Sticky Bottom Action Bar. Desktop: Normal flow */}
                    <div className="fixed bottom-16 left-0 w-full p-4 bg-[#1a1a1c] border-t border-white/10 z-30 md:static md:w-auto md:p-0 md:bg-transparent md:border-none md:z-auto md:mt-2">
                        <button
                            onClick={handleLog}
                            className="w-full bg-white text-black font-bold h-11 md:h-auto md:py-3 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                        >
                            <Save size={18} />
                            Log Set
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
