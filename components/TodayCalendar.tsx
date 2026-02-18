'use client';

import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Settings, Plus, Trash2, X } from 'lucide-react';
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
}

export default function TodayCalendar() {
    const [events, setEvents] = useState<EventInput[]>([]);
    const [calendars, setCalendars] = useState<CalendarSource[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [editingCalendar, setEditingCalendar] = useState<{ name: string; calendar_id: string; color: string } | null>(null);
    const [newCalendar, setNewCalendar] = useState({ name: '', calendar_id: '', color: '#3B82F6' });
    const calendarRef = useRef<any>(null);

    useEffect(() => {
        loadCalendarEvents();
    }, []);

    const filteredEvents = events.filter(event => {
        const enabledCalendars = new Set(
            calendars.filter(c => c.enabled).map(c => c.name)
        );
        return event.extendedProps?.calendarName && enabledCalendars.has(event.extendedProps.calendarName);
    });

    const toggleCalendar = (calendarName: string) => {
        setCalendars(prev =>
            prev.map(cal =>
                cal.name === calendarName ? { ...cal, enabled: !cal.enabled } : cal
            )
        );
    };

    const addCalendar = async () => {
        if (!newCalendar.name || !newCalendar.calendar_id) return;

        try {
            const { error } = await supabase
                .from('calendars')
                .insert([{
                    name: newCalendar.name,
                    calendar_id: newCalendar.calendar_id,
                    color: newCalendar.color
                }]);

            if (error) throw error;

            setNewCalendar({ name: '', calendar_id: '', color: '#3B82F6' });
            await loadCalendarEvents();
        } catch (err) {
            console.error('Error adding calendar:', err);
            alert('Failed to add calendar');
        }
    };

    const deleteCalendar = async (calendarId: string) => {
        if (!confirm('Are you sure you want to delete this calendar?')) return;

        try {
            const { error } = await supabase
                .from('calendars')
                .delete()
                .eq('calendar_id', calendarId);

            if (error) throw error;

            await loadCalendarEvents();
        } catch (err) {
            console.error('Error deleting calendar:', err);
            alert('Failed to delete calendar');
        }
    };

    const updateCalendar = async (oldId: string, updates: { name: string; calendar_id: string; color: string }) => {
        try {
            const { error } = await supabase
                .from('calendars')
                .update(updates)
                .eq('calendar_id', oldId);

            if (error) throw error;

            setEditingCalendar(null);
            await loadCalendarEvents();
        } catch (err) {
            console.error('Error updating calendar:', err);
            alert('Failed to update calendar');
        }
    };

    async function loadCalendarEvents() {
        setLoading(true);
        setError(null);

        try {
            const { data: calendarData, error: dbError } = await supabase
                .from('calendars')
                .select('name, calendar_id, color');

            if (dbError) throw dbError;
            if (!calendarData || calendarData.length === 0) {
                setLoading(false);
                return;
            }

            const sources: CalendarSource[] = calendarData.map(cal => ({
                name: String(cal.name),
                id: String(cal.calendar_id),
                color: String(cal.color || '#3B82F6'),
                enabled: true
            }));
            setCalendars(sources);

            const allEvents: EventInput[] = [];

            for (const calendar of calendarData) {
                try {
                    const calendarId = String(calendar.calendar_id);
                    const calendarColor = String(calendar.color || '#3B82F6');
                    const calendarName = String(calendar.name);

                    const icsUrl = calendarId.includes('@')
                        ? `https://calendar.google.com/calendar/ical/${encodeURIComponent(calendarId)}/public/basic.ics`
                        : calendarId;

                    // Try direct fetch first (works for public calendars)
                    let icsData: string;
                    try {
                        const response = await fetch(icsUrl);
                        if (response.ok) {
                            icsData = await response.text();
                        } else {
                            // Fallback to API route if direct fetch fails
                            const proxyResponse = await fetch(`/api/calendar-proxy?url=${encodeURIComponent(icsUrl)}`);
                            if (!proxyResponse.ok) continue;
                            icsData = await proxyResponse.text();
                        }
                    } catch {
                        // If direct fetch fails, try API route
                        const proxyResponse = await fetch(`/api/calendar-proxy?url=${encodeURIComponent(icsUrl)}`);
                        if (!proxyResponse.ok) continue;
                        icsData = await proxyResponse.text();
                    }

                    const jcalData = ICAL.parse(icsData);
                    const comp = new ICAL.Component(jcalData);
                    const vevents = comp.getAllSubcomponents('vevent');

                    vevents.forEach((vevent) => {
                        const event = new ICAL.Event(vevent);
                        const eventStart = event.startDate.toJSDate();
                        const eventEnd = event.endDate ? event.endDate.toJSDate() : eventStart;

                        allEvents.push({
                            title: event.summary || 'Untitled Event',
                            start: eventStart.toISOString(),
                            end: eventEnd.toISOString(),
                            backgroundColor: calendarColor,
                            borderColor: calendarColor,
                            textColor: '#ffffff',
                            extendedProps: {
                                location: event.location || '',
                                calendarName: calendarName,
                            }
                        });
                    });

                    console.log(`Loaded ${vevents.length} events from ${calendarName}`);
                } catch (err) {
                    console.error(`Error loading calendar ${calendar.name}:`, err);
                }
            }

            setEvents(allEvents);
        } catch (err) {
            console.error('Error loading calendar events:', err);
            setError('Failed to load calendar events');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="bg-surface rounded-xl p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-white">Calendar</h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowSettings(true)}
                        className="p-1 hover:bg-active rounded transition-all"
                        title="Calendar settings"
                    >
                        <Settings size={14} className="text-text-secondary" />
                    </button>
                    <button
                        onClick={loadCalendarEvents}
                        disabled={loading}
                        className="p-1 hover:bg-active rounded transition-all disabled:opacity-50"
                        title="Refresh calendar"
                    >
                        <RefreshCw size={14} className={`text-text-secondary ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Calendar Legend */}
            <div className="mb-3 pb-3 border-b border-[#323234]">
                <div className="text-xs text-text-secondary mb-2">Calendars</div>
                <div className="flex flex-wrap gap-2">
                    {calendars.map((cal) => (
                        <button
                            key={cal.name}
                            onClick={() => toggleCalendar(cal.name)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all ${cal.enabled
                                ? 'bg-active hover:bg-[#323234]'
                                : 'bg-transparent opacity-40 hover:opacity-60'
                                }`}
                        >
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: cal.color }}
                            />
                            <span className="text-text-primary">{cal.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Calendar View */}
            {loading ? (
                <div className="text-text-secondary text-xs py-4">Loading events...</div>
            ) : error ? (
                <div className="text-red-400 text-xs py-4">{error}</div>
            ) : (
                <div className="calendar-container">
                    <FullCalendar
                        ref={calendarRef}
                        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'dayGridMonth,timeGridWeek,listWeek'
                        }}
                        events={filteredEvents}
                        height="auto"
                        eventDisplay="block"
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
                        buttonText={{
                            today: 'Today',
                            month: 'Month',
                            week: 'Week',
                            list: 'Agenda'
                        }}
                    />
                </div>
            )}

            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowSettings(false)}>
                    <div className="bg-surface rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-white">Manage Calendars</h2>
                            <button
                                onClick={() => setShowSettings(false)}
                                className="p-1 hover:bg-active rounded transition-all"
                            >
                                <X size={18} className="text-text-secondary" />
                            </button>
                        </div>

                        {/* Add New Calendar */}
                        <div className="mb-6 p-4 bg-active rounded-lg">
                            <h3 className="text-sm font-medium text-white mb-3">Add New Calendar</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs text-text-secondary mb-1">Calendar Name</label>
                                    <input
                                        type="text"
                                        value={newCalendar.name}
                                        onChange={(e) => setNewCalendar({ ...newCalendar, name: e.target.value })}
                                        placeholder="e.g., Work, Personal"
                                        className="w-full px-3 py-2 bg-surface border border-[#323234] rounded-lg text-white text-sm focus:outline-none focus:border-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-text-secondary mb-1">Calendar ID or ICS URL</label>
                                    <input
                                        type="text"
                                        value={newCalendar.calendar_id}
                                        onChange={(e) => setNewCalendar({ ...newCalendar, calendar_id: e.target.value })}
                                        placeholder="your.email@gmail.com or full ICS URL"
                                        className="w-full px-3 py-2 bg-surface border border-[#323234] rounded-lg text-white text-sm focus:outline-none focus:border-primary"
                                    />
                                    <p className="text-xs text-text-secondary mt-1">
                                        For Google Calendar: Use your calendar email (e.g., abc@group.calendar.google.com)
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-xs text-text-secondary mb-1">Color</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={newCalendar.color}
                                            onChange={(e) => setNewCalendar({ ...newCalendar, color: e.target.value })}
                                            className="w-12 h-10 rounded cursor-pointer"
                                        />
                                        <span className="text-sm text-text-secondary">{newCalendar.color}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={addCalendar}
                                    disabled={!newCalendar.name || !newCalendar.calendar_id}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium transition-all"
                                >
                                    <Plus size={16} />
                                    Add Calendar
                                </button>
                            </div>
                        </div>

                        {/* Existing Calendars */}
                        <div>
                            <h3 className="text-sm font-medium text-white mb-3">Your Calendars</h3>
                            <div className="space-y-2">
                                {calendars.map((cal) => (
                                    <div key={cal.id} className="p-3 bg-active rounded-lg">
                                        {editingCalendar?.calendar_id === cal.id ? (
                                            <div className="space-y-2">
                                                <input
                                                    type="text"
                                                    value={editingCalendar.name}
                                                    onChange={(e) => setEditingCalendar({ ...editingCalendar, name: e.target.value })}
                                                    className="w-full px-2 py-1 bg-surface border border-[#323234] rounded text-white text-sm"
                                                />
                                                <input
                                                    type="text"
                                                    value={editingCalendar.calendar_id}
                                                    onChange={(e) => setEditingCalendar({ ...editingCalendar, calendar_id: e.target.value })}
                                                    className="w-full px-2 py-1 bg-surface border border-[#323234] rounded text-white text-sm"
                                                />
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="color"
                                                        value={editingCalendar.color}
                                                        onChange={(e) => setEditingCalendar({ ...editingCalendar, color: e.target.value })}
                                                        className="w-10 h-8 rounded cursor-pointer"
                                                    />
                                                    <button
                                                        onClick={() => updateCalendar(cal.id, editingCalendar)}
                                                        className="px-3 py-1 bg-primary hover:bg-primary-hover rounded text-white text-xs"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingCalendar(null)}
                                                        className="px-3 py-1 bg-surface hover:bg-[#323234] rounded text-white text-xs"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-4 h-4 rounded"
                                                        style={{ backgroundColor: cal.color }}
                                                    />
                                                    <div>
                                                        <div className="text-sm text-white font-medium">{cal.name}</div>
                                                        <div className="text-xs text-text-secondary truncate max-w-[300px]">{cal.id}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setEditingCalendar({ name: cal.name, calendar_id: cal.id, color: cal.color })}
                                                        className="px-3 py-1 bg-surface hover:bg-[#323234] rounded text-white text-xs"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => deleteCalendar(cal.id)}
                                                        className="p-1 hover:bg-red-500/20 rounded transition-all"
                                                        title="Delete calendar"
                                                    >
                                                        <Trash2 size={14} className="text-red-400" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
        .calendar-container .fc {
          font-family: inherit;
        }
        
        .calendar-container .fc-theme-standard td,
        .calendar-container .fc-theme-standard th {
          border-color: #323234;
        }
        
        .calendar-container .fc-toolbar-title {
          color: rgba(255,255,255,0.9);
          font-size: 16px;
          font-weight: 600;
        }
        
        .calendar-container .fc-button {
          background: #2A2A2C !important;
          border-color: #323234 !important;
          color: rgba(255,255,255,0.7) !important;
          text-transform: capitalize;
          font-size: 12px;
          padding: 4px 12px;
        }
        
        .calendar-container .fc-button:hover {
          background: #323234 !important;
          color: rgba(255,255,255,0.9) !important;
        }
        
        .calendar-container .fc-button-active {
          background: #3B82F6 !important;
          color: white !important;
        }
        
        .calendar-container .fc-button:disabled {
          opacity: 0.3;
        }
        
        .calendar-container .fc-col-header-cell {
          background: #2A2A2C;
          color: rgba(255,255,255,0.5);
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
          border-color: #323234;
        }
        
        .calendar-container .fc-daygrid-day {
          background: transparent;
        }
        
        .calendar-container .fc-daygrid-day-number {
          color: rgba(255,255,255,0.7);
          font-size: 12px;
          padding: 4px;
        }
        
        .calendar-container .fc-day-today {
          background: rgba(59, 130, 246, 0.1) !important;
        }
        
        .calendar-container .fc-day-today .fc-daygrid-day-number {
          color: #3B82F6;
          font-weight: 600;
        }
        
        .calendar-container .fc-daygrid-day-events {
          margin-top: 2px;
        }
        
        .calendar-container .fc-event {
          font-size: 11px;
          padding: 2px 4px;
          margin-bottom: 2px;
          border-radius: 3px;
          border: none;
        }
        
        .calendar-container .fc-event-title {
          font-weight: 500;
        }
        
        .calendar-container .fc-daygrid-more-link {
          color: #3B82F6;
          font-size: 10px;
        }
        
        .calendar-container .fc-timegrid-slot {
          height: 3em;
        }
        
        .calendar-container .fc-timegrid-slot-label {
          color: rgba(255,255,255,0.4);
          font-size: 11px;
        }
        
        .calendar-container .fc-list {
          border-color: #323234;
        }
        
        .calendar-container .fc-list-day-cushion {
          background: #2A2A2C;
          color: rgba(255,255,255,0.7);
        }
        
        .calendar-container .fc-list-event {
          background: transparent !important;
          cursor: pointer;
        }
        
        .calendar-container .fc-list-event:hover {
          background: rgba(255,255,255,0.02) !important;
        }
        
        .calendar-container .fc-list-event-title {
          color: rgba(255,255,255,0.9);
          font-size: 12px;
          font-weight: 500;
        }
        
        .calendar-container .fc-list-event-time {
          color: rgba(255,255,255,0.4);
          font-size: 11px;
        }
        
        .calendar-container .fc-list-event-dot {
          border: 2px solid currentColor !important;
        }
        
        .calendar-container .fc-list-empty {
          background: transparent !important;
          color: rgba(255,255,255,0.2);
          font-size: 12px;
          padding: 40px !important;
          text-align: center;
        }
      `}</style>
        </div>
    );
}
