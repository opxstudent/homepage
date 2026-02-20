'use client';

import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Settings, Plus, X, Trash2, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase-client';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { EventInput } from '@fullcalendar/core';
import ICAL from 'ical.js';

interface CalendarSource {
    name: string;
    id: string;
    color: string;
    enabled: boolean;
    type: 'ics' | 'system';
}

export default function UnifiedCalendar() {
    const [events, setEvents] = useState<EventInput[]>([]);
    const [calendars, setCalendars] = useState<CalendarSource[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSettings, setShowSettings] = useState(false);

    // Settings state
    const [newCalendar, setNewCalendar] = useState({ name: '', calendar_id: '', color: '#3B82F6' });
    const [editingCalendar, setEditingCalendar] = useState<{ name: string; calendar_id: string; color: string } | null>(null);

    const calendarRef = useRef<any>(null);

    useEffect(() => {
        loadData();
    }, []);

    const filteredEvents = events.filter(event => {
        const sourceName = event.extendedProps?.source;
        const source = calendars.find(c => c.name === sourceName);
        return source ? source.enabled : true;
    });

    async function loadData() {
        setLoading(true);
        try {
            // 1. Fetch ICS Calendars
            const { data: calData } = await supabase.from('calendars').select('*');
            const icsSources: CalendarSource[] = (calData || []).map(c => ({
                name: c.name,
                id: c.calendar_id,
                color: c.color || '#3B82F6',
                enabled: true,
                type: 'ics'
            }));

            // 2. Add System Sources (Tasks)
            // Check if we already have it in state to preserve enabled status, otherwise default true
            const existingTasksSource = calendars.find(c => c.name === 'Tasks');
            const tasksSource: CalendarSource = {
                name: 'Tasks',
                id: 'tasks-system',
                color: '#F97316', // Orange
                enabled: existingTasksSource ? existingTasksSource.enabled : true,
                type: 'system'
            };

            const allSources = [tasksSource, ...icsSources];
            setCalendars(prev => {
                // Merge enabled states
                return allSources.map(s => {
                    const prevSource = prev.find(p => p.id === s.id);
                    return prevSource ? { ...s, enabled: prevSource.enabled } : s;
                });
            });

            const allEvents: EventInput[] = [];

            // 3. Fetch Tasks
            // Fetch ALL tasks with due dates, not just today, for the calendar view
            const { data: taskData } = await supabase
                .from('tasks')
                .select('id, title, due_date, status')
                .not('due_date', 'is', null)
                .neq('status', 'done');

            if (taskData) {
                taskData.forEach(t => {
                    allEvents.push({
                        id: t.id,
                        title: `[Task] ${t.title}`,
                        start: t.due_date!, // YYYY-MM-DD
                        allDay: true,
                        backgroundColor: '#F97316',
                        borderColor: '#F97316',
                        extendedProps: { source: 'Tasks', type: 'task' }
                    });
                });
            }

            // 4. Fetch ICS Events
            for (const source of icsSources) {
                try {
                    const icsUrl = source.id.includes('@')
                        ? `https://calendar.google.com/calendar/ical/${encodeURIComponent(source.id)}/public/basic.ics`
                        : source.id;

                    const res = await fetch(`/api/calendar-proxy?url=${encodeURIComponent(icsUrl)}`);
                    if (!res.ok) continue;

                    const icsData = await res.text();
                    const jcalData = ICAL.parse(icsData);
                    const comp = new ICAL.Component(jcalData);
                    const vevents = comp.getAllSubcomponents('vevent');

                    vevents.forEach(vevent => {
                        const event = new ICAL.Event(vevent);

                        allEvents.push({
                            id: event.uid || Math.random().toString(),
                            title: event.summary || 'Untitled',
                            start: event.startDate.toJSDate(),
                            end: event.endDate ? event.endDate.toJSDate() : undefined,
                            allDay: event.startDate.isDate, // Check if it's strictly a date (no time)
                            backgroundColor: source.color,
                            borderColor: source.color,
                            extendedProps: { source: source.name, type: 'event' }
                        });
                    });
                } catch (e) {
                    console.error('Error loading calendar', source.name, e);
                }
            }

            setEvents(allEvents);

        } catch (e) {
            console.error('Error loading unified data', e);
        } finally {
            setLoading(false);
        }
    }

    const toggleSource = (id: string) => {
        setCalendars(prev => prev.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
    };

    async function addCalendarSource() {
        if (!newCalendar.name || !newCalendar.calendar_id) return;
        await supabase.from('calendars').insert({
            name: newCalendar.name,
            calendar_id: newCalendar.calendar_id,
            color: newCalendar.color
        });
        setNewCalendar({ name: '', calendar_id: '', color: '#3B82F6' });
        loadData();
    }

    async function deleteCalendar(id: string) {
        if (!confirm('Remove this calendar?')) return;
        await supabase.from('calendars').delete().eq('calendar_id', id);
        loadData();
    }

    return (
        <div className="bg-surface rounded-xl p-4 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 shrink-0">
                <h3 className="text-base font-semibold text-white">Unified Calendar</h3>
                <div className="flex items-center gap-2">
                    <a
                        href="https://calendar.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-[#323234] rounded-lg text-text-secondary hover:text-white transition-all"
                        title="Open Google Calendar"
                    >
                        <ExternalLink size={14} />
                    </a>
                    <button onClick={() => setShowSettings(true)} className="p-1.5 hover:bg-[#323234] rounded-lg text-text-secondary hover:text-white">
                        <Settings size={14} />
                    </button>
                    <button onClick={loadData} className="p-1.5 hover:bg-[#323234] rounded-lg text-text-secondary hover:text-white">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Source Toggles */}
            <div className="flex flex-wrap gap-2 mb-3 shrink-0">
                {calendars.map(cal => (
                    <button
                        key={cal.id}
                        onClick={() => toggleSource(cal.id)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all ${cal.enabled
                            ? 'bg-[#323234] text-white hover:bg-[#3e3e40]'
                            : 'bg-transparent text-text-secondary opacity-50 hover:opacity-75'
                            }`}
                    >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cal.color }} />
                        <span>{cal.name}</span>
                    </button>
                ))}
            </div>

            {/* Calendar View */}
            <div className="flex-1 min-h-0 relative calendar-container">
                <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                    initialView="upcomingWeek"
                    views={{
                        upcomingWeek: {
                            type: 'list',
                            duration: { days: 14 },
                            buttonText: 'Agenda'
                        }
                    }}
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'upcomingWeek,dayGridMonth'
                    }}
                    events={filteredEvents}
                    height="100%"
                    dayMaxEvents={3}
                    nowIndicator={true}
                    editable={false}
                    selectable={false}
                    selectMirror={true}
                    dayMaxEventRows={true}
                    weekends={true}
                    slotMinTime="06:00:00"
                    slotMaxTime="22:00:00"
                    allDaySlot={true}
                    buttonText={{ today: 'Today', month: 'Month', week: 'Week', list: 'Agenda' }}
                    listDayFormat={(info: any) => {
                        const date = info.date.marker || info.date; // Support different internal references
                        const m = date.toLocaleString('en-US', { month: 'short' });
                        const d = date.getDate();
                        const w = date.toLocaleString('en-US', { weekday: 'short' });
                        return `${m} ${d}, ${w}`;
                    }}
                    listDaySideFormat={false}
                />
            </div>

            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowSettings(false)}>
                    <div className="bg-[#202022] rounded-xl p-5 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-base font-semibold text-white">Manage Calendars</h3>
                            <button onClick={() => setShowSettings(false)}><X size={16} className="text-text-secondary" /></button>
                        </div>

                        <div className="space-y-3 mb-6">
                            <h4 className="text-xs font-medium text-text-secondary uppercase">Add ICS Source</h4>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    placeholder="Name"
                                    className="bg-[#1a1a1c] border border-[#323234] rounded px-2 py-1.5 text-xs text-white"
                                    value={newCalendar.name}
                                    onChange={e => setNewCalendar({ ...newCalendar, name: e.target.value })}
                                />
                                <input
                                    placeholder="ICS URL / Email"
                                    className="bg-[#1a1a1c] border border-[#323234] rounded px-2 py-1.5 text-xs text-white"
                                    value={newCalendar.calendar_id}
                                    onChange={e => setNewCalendar({ ...newCalendar, calendar_id: e.target.value })}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={addCalendarSource} className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs text-white font-medium">Add Calendar</button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-xs font-medium text-text-secondary uppercase">Active Sources</h4>
                            {calendars.filter(c => c.type !== 'system').map(cal => (
                                <div key={cal.id} className="flex items-center justify-between p-2 bg-[#1a1a1c] rounded border border-[#323234]">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ background: cal.color }} />
                                        <span className="text-sm text-white">{cal.name}</span>
                                    </div>
                                    <button onClick={() => deleteCalendar(cal.id)} className="text-red-400 hover:text-red-300 text-xs">Remove</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .calendar-container .fc { font-family: inherit; }
                .calendar-container .fc-theme-standard td, .calendar-container .fc-theme-standard th { border-color: #323234; }
                .calendar-container .fc-toolbar-title { color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 600; }
                .calendar-container .fc-button { background: #2A2A2C !important; border-color: #323234 !important; color: rgba(255,255,255,0.7) !important; font-size: 11px; padding: 2px 8px; }
                .calendar-container .fc-button:hover { background: #323234 !important; color: white !important; }
                .calendar-container .fc-button-active { background: #3B82F6 !important; color: white !important; }
                .calendar-container .fc-col-header-cell { background: #2A2A2C; color: rgba(255,255,255,0.5); font-size: 10px; border-color: #323234; padding: 4px 0; }
                .calendar-container .fc-daygrid-day-number { color: rgba(255,255,255,0.7); font-size: 11px; padding: 2px 4px; }
                .calendar-container .fc-day-today { background: rgba(59, 130, 246, 0.05) !important; }
                .calendar-container .fc-day-today .fc-daygrid-day-number { color: #3B82F6; font-weight: 600; }
                .calendar-container .fc-event { border: none; font-size: 10px; margin-bottom: 1px; }
                .calendar-container .fc-list-day-cushion { background: #2A2A2C; color: rgba(255,255,255,0.7); }
                .calendar-container .fc-list-event:hover { background: rgba(255,255,255,0.02) !important; }
                .calendar-container .fc-timegrid-slot { height: 2.5em; }
                .calendar-container .fc-timegrid-slot-label { font-size: 10px; color: rgba(255,255,255,0.4); }
            `}</style>
        </div>
    );
}
