'use server';

import ical from 'node-ical';

const CORS_PROXY = 'https://corsproxy.io/?';

export async function fetchCalendarEvents(icsUrl: string) {
    try {
        console.log(`[Server] Fetching calendar from: ${icsUrl}`);

        // Use CORS proxy to fetch ICS files
        const proxiedUrl = CORS_PROXY + encodeURIComponent(icsUrl);
        console.log(`[Server] Using proxied URL: ${proxiedUrl}`);

        const events = await ical.async.fromURL(proxiedUrl);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todaysEvents = Object.values(events)
            .filter((event: any) => {
                if (event.type !== 'VEVENT') return false;

                const eventDate = new Date(event.start);
                eventDate.setHours(0, 0, 0, 0);

                return eventDate.getTime() === today.getTime();
            })
            .map((event: any) => {
                // Explicitly convert to plain objects with only serializable data
                return {
                    summary: String(event.summary || 'Untitled Event'),
                    start: event.start instanceof Date ? event.start.toISOString() : String(event.start),
                    end: event.end ? (event.end instanceof Date ? event.end.toISOString() : String(event.end)) : undefined,
                    location: event.location ? String(event.location) : '',
                    description: event.description ? String(event.description) : '',
                };
            })
            .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

        console.log(`[Server] Found ${todaysEvents.length} events for today`);
        return { success: true as const, events: todaysEvents };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch calendar';
        console.error('[Server] Error fetching calendar:', errorMessage, error);
        return { success: false as const, events: [], error: errorMessage };
    }
}
