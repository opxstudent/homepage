'use client';

import { Exercise } from '@/lib/fitnessUtils';
import { ChevronRight, Trophy } from 'lucide-react';

interface ExerciseSelectorProps {
    exercises: Exercise[];
    onSelect: (exercise: Exercise) => void;
}

export default function ExerciseSelector({ exercises, onSelect }: ExerciseSelectorProps) {
    if (exercises.length === 0) {
        return (
            <div className="text-center text-text-secondary py-8">
                No exercises found for this group.
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            {exercises.map((exercise) => (
                <button
                    key={exercise.id}
                    onClick={() => onSelect(exercise)}
                    className="flex items-center justify-between p-4 bg-[#1a1a1c] border border-white/5 rounded-xl hover:bg-[#202022] transition-colors group text-left"
                >
                    <div>
                        <span className="text-white font-medium block">{exercise.name}</span>
                        {exercise.personal_record && (
                            <span className="text-xs text-accent-date flex items-center gap-1 mt-1">
                                <Trophy size={12} />
                                PR: {exercise.personal_record}kg
                            </span>
                        )}
                    </div>
                    <ChevronRight size={18} className="text-text-secondary group-hover:text-white transition-colors" />
                </button>
            ))}
        </div>
    );
}
