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
    const [nowEvent, setNowEvent] = useState<EventInput | null>(null);
    const [nextEvent, setNextEvent] = useState<EventInput | null>(null);
    const [pastEvent, setPastEvent] = useState<EventInput | null>(null);

    // Settings state
    const [newCalendar, setNewCalendar] = useState({ name: '', calendar_id: '', color: '#3B82F6' });
    const [editingCalendar, setEditingCalendar] = useState<{ name: string; calendar_id: string; color: string } | null>(null);

    const calendarRef = useRef<any>(null);

    useEffect(() => {
        loadData();
    }, []);

    // Now & Next logic
    useEffect(() => {
        const updateFocus = () => {
            const now = new Date();

            // Filter out all-day events for precision timing
            const timedEvents = events
                .filter(e => !e.allDay && e.start)
                .map(e => ({
                    ...e,
                    start: new Date(e.start as Date),
                    end: e.end ? new Date(e.end as Date) : new Date(new Date(e.start as Date).getTime() + 3600000)
                }))
                .sort((a, b) => a.start.getTime() - b.start.getTime());

            const current = timedEvents.find(e => now >= e.start && now < e.end);
            const future = timedEvents.filter(e => e.start > now);
            const past = timedEvents.filter(e => e.end <= now).sort((a, b) => b.end.getTime() - a.end.getTime());

            // Fallback for all-day events if no timed event is active
            const allDayNow = current ? null : events.find(e => {
                if (!e.allDay || !e.start) return false;
                const d = new Date(e.start as Date);
                return d.getFullYear() === now.getFullYear() &&
                    d.getMonth() === now.getMonth() &&
                    d.getDate() === now.getDate();
            });

            setNowEvent(current || allDayNow || null);
            setNextEvent(future[0] || null);
            setPastEvent(past[0] || null);
        };

        updateFocus();
        const interval = setInterval(updateFocus, 30000); // Update every 30s
        return () => clearInterval(interval);
    }, [events]);

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
            // Fetch ALL tasks with due dates or start dates, not just today, for the calendar view
            const { data: taskData } = await supabase
                .from('tasks')
                .select('id, title, due_date, start_date, end_date, status')
                .or('due_date.not.is.null,start_date.not.is.null')
                .neq('status', 'done');

            if (taskData) {
                taskData.forEach(t => {
                    const start = t.start_date || t.due_date;
                    const end = t.end_date || (t.start_date ? new Date(new Date(t.start_date).getTime() + 3600000).toISOString() : null);
                    const isAllDay = !t.start_date;

                    allEvents.push({
                        id: t.id,
                        title: `[Task] ${t.title}`,
                        start: start!,
                        end: end || undefined,
                        allDay: isAllDay,
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
                        const url = vevent.getFirstPropertyValue('url') || (vevent.getFirstPropertyValue('description')?.toString().match(/https?:\/\/[^\s<>"]+/g)?.[0] || null);

                        if (event.isRecurring()) {
                            const iter = event.iterator();
                            let nextDate;

                            // Prevent infinite loops by capping recurrence expansion to 6 months ahead
                            const cutoff = new Date();
                            cutoff.setMonth(cutoff.getMonth() + 6);

                            while ((nextDate = iter.next()) && nextDate.toJSDate() < cutoff) {
                                const startJS = nextDate.toJSDate();
                                // Calculate duration to apply to the new instance's end date
                                const durationSeconds = event.endDate.toUnixTime() - event.startDate.toUnixTime();
                                const endJS = new Date(startJS.getTime() + (durationSeconds * 1000));

                                allEvents.push({
                                    id: `${event.uid}-${nextDate.toUnixTime()}`, // Make ID unique per instance
                                    title: event.summary || 'Untitled',
                                    start: startJS,
                                    end: endJS,
                                    allDay: event.startDate.isDate,
                                    backgroundColor: source.color,
                                    borderColor: source.color,
                                    extendedProps: { source: source.name, type: 'event', url }
                                });
                            }
                        } else {
                            // Standard single event
                            allEvents.push({
                                id: event.uid || Math.random().toString(),
                                title: event.summary || 'Untitled',
                                start: event.startDate.toJSDate(),
                                end: event.endDate ? event.endDate.toJSDate() : undefined,
                                allDay: event.startDate.isDate,
                                backgroundColor: source.color,
                                borderColor: source.color,
                                extendedProps: { source: source.name, type: 'event', url }
                            });
                        }
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
            {/* Focus Bridge */}
            {(pastEvent || nowEvent || nextEvent) && (
                <div className="mb-4 bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden flex items-stretch h-12 shrink-0">
                    {pastEvent && (
                        <div className="flex-1 px-4 flex items-center gap-3 bg-white/[0.02] border-r border-white/5 relative overflow-hidden opacity-60">
                            <div className="w-1.5 h-1.5 rounded-full bg-text-secondary/40 shrink-0" />
                            <div className="flex flex-col min-w-0">
                                <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest leading-none mb-0.5">Last</span>
                                <span className="text-[11px] font-semibold text-text-secondary truncate leading-tight">{pastEvent.title}</span>
                            </div>
                        </div>
                    )}

                    {nowEvent ? (
                        <div className="flex-[1.2] px-4 flex items-center gap-3 bg-blue-500/15 border-r border-white/10 relative overflow-hidden shadow-[inset_0_0_20px_rgba(59,130,246,0.1)]">
                            <div className="absolute inset-0 bg-blue-400/10 animate-pulse-slow" />
                            <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)] animate-pulse shrink-0" />
                            <div className="flex flex-col min-w-0 z-10">
                                <span className="text-[9px] font-bold text-blue-300 uppercase tracking-widest leading-none mb-0.5">Now</span>
                                <span className="text-[12px] font-bold text-white truncate leading-tight drop-shadow-sm">{nowEvent.title}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 px-4 flex items-center gap-3 border-r border-white/5 bg-white/[0.01]">
                            <div className="w-1.5 h-1.5 rounded-full bg-white/5 shrink-0" />
                            <div className="flex flex-col min-w-0">
                                <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest leading-none mb-0.5">Now</span>
                                <span className="text-[11px] font-medium text-text-secondary/30 italic truncate leading-tight">Refresh your mind</span>
                            </div>
                        </div>
                    )}

                    {nextEvent && (
                        <div className="flex-1 px-4 flex items-center gap-3 bg-white/[0.02] relative overflow-hidden opacity-40 grayscale-[0.3] hover:opacity-60 transition-opacity">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500/40 shrink-0" />
                            <div className="flex flex-col min-w-0">
                                <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest leading-none mb-0.5">Next</span>
                                <span className="text-[11px] font-medium text-white/70 truncate leading-tight">{nextEvent.title}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-3 shrink-0">
                <div className="flex items-center gap-3">
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-[0.2em]">Live Context: Calendar</h3>
                </div>
                <div className="flex items-center gap-1.5">
                    <a
                        href="https://calendar.google.com/calendar/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-[#323234] rounded-lg text-text-secondary hover:text-white transition-colors"
                        title="Open Google Calendar"
                    >
                        <ExternalLink size={14} />
                    </a>
                    <div className="flex bg-active p-0.5 rounded-lg border border-white/5 mr-1">
                        <button
                            onClick={() => calendarRef.current?.getApi().changeView('upcomingWeek')}
                            className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${calendarRef.current?.getApi().view.type === 'upcomingWeek' ? 'bg-[#323234] text-white shadow-lg' : 'text-text-secondary hover:text-white'}`}
                        >
                            AGENDA
                        </button>
                        <button
                            onClick={() => calendarRef.current?.getApi().changeView('dayGridMonth')}
                            className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${calendarRef.current?.getApi().view.type === 'dayGridMonth' ? 'bg-[#323234] text-white shadow-lg' : 'text-text-secondary hover:text-white'}`}
                        >
                            MONTH
                        </button>
                    </div>
                    <button onClick={() => setShowSettings(true)} className="p-1.5 hover:bg-[#323234] rounded-lg text-text-secondary hover:text-white transition-colors">
                        <Settings size={14} />
                    </button>
                    <button onClick={loadData} className="p-1.5 hover:bg-[#323234] rounded-lg text-text-secondary hover:text-white transition-colors">
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
                    initialDate={new Date().toISOString().split('T')[0]} // Start at today's midnight
                    slotLabelFormat={{
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                        meridiem: false
                    }}
                    eventTimeFormat={{
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                        meridiem: false
                    }}
                    displayEventTime={true}
                    views={{
                        upcomingWeek: {
                            type: 'list',
                            duration: { days: 7 },
                            buttonText: 'Agenda',
                            listDayFormat: { month: 'short', day: 'numeric', weekday: 'short' },
                            listDaySideFormat: false // Keep it clean
                        }
                    }}
                    eventContent={(arg) => {
                        return (
                            <div className="flex items-center gap-1.5 w-full min-w-0 pr-1">
                                {/* This adds the colored dot back into your custom UI */}
                                <div
                                    className="w-1.5 h-1.5 rounded-full shrink-0"
                                    style={{ backgroundColor: arg.event.backgroundColor || '#3B82F6' }}
                                />
                                <span className="truncate flex-1 text-[11px] leading-tight text-white/90">
                                    {arg.event.title}
                                </span>
                            </div>
                        );
                    }}
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'upcomingWeek,dayGridMonth'
                    }}
                    events={filteredEvents}
                    eventClassNames={(arg) => {
                        const now = new Date();
                        const end = arg.event.end ? new Date(arg.event.end) : null;
                        const start = new Date(arg.event.start!);

                        const classes = [];

                        // 1. Past Events: Fade out
                        if (end && end < now) {
                            classes.push('opacity-40 grayscale-[0.5]');
                        }
                        // 2. NOW Event: Strong blue highlight
                        else if (now >= start && (end ? now < end : true)) {
                            classes.push('font-bold border-l-2 border-blue-500 bg-blue-500/15 text-white');
                        }
                        // 3. NEXT Event: Remove background, just standard text or slightly dimmed
                        else if (nextEvent && arg.event.id === nextEvent.id) {
                            classes.push('text-white/80');
                        }

                        return classes;
                    }}
                    height="auto"
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
                .calendar-container .fc-list-event:hover td,
                .calendar-container .fc-list-day:hover td,
                .calendar-container .fc-list-event:hover {
                    background: transparent !important;
                    background-color: transparent !important;
                }
                .calendar-container .fc-daygrid-event:hover,
                .calendar-container .fc-timegrid-event:hover,
                .calendar-container .fc-daygrid-more-link:hover {
                    background: transparent !important;
                    background-color: transparent !important;
                }
                .calendar-container .fc-timegrid-slot { height: 2.5em; }
                .calendar-container .fc-timegrid-slot-label { font-size: 10px; color: rgba(255,255,255,0.4); }

                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.05; }
                    50% { opacity: 0.15; }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                .fc-list-event-title, .fc-list-event-time {
                    font-size: 11px !important;
                }
                .fc-list-day-text, .fc-list-day-side-text {
                    font-size: 11px !important;
                    font-weight: 700 !important;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
            `}</style>
        </div>
    );
}
