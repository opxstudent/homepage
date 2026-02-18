'use client';

import { WorkoutGroup } from '@/lib/fitnessUtils';

interface GroupSelectorProps {
    groups: WorkoutGroup[];
    selectedGroupId: string | null;
    onSelect: (groupId: string) => void;
}

export default function GroupSelector({ groups, selectedGroupId, onSelect }: GroupSelectorProps) {
    return (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {groups.map((group) => {
                const isActive = selectedGroupId === group.id;
                return (
                    <button
                        key={group.id}
                        onClick={() => onSelect(group.id)}
                        className={`
                            px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                            ${isActive
                                ? 'bg-white text-black'
                                : 'bg-[#202022] text-text-secondary hover:bg-[#2a2a2c] hover:text-white'
                            }
                        `}
                    >
                        {group.name}
                    </button>
                );
            })}
        </div>
    );
}
