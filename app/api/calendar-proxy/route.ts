import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const url = searchParams.get('url');

        if (!url) {
            return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
        }

        // Fetch the ICS file directly from the server (no CORS restrictions)
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; CalendarFetcher/1.0)',
            },
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `Failed to fetch calendar: ${response.statusText}` },
                { status: response.status }
            );
        }

        const icsData = await response.text();

        // Return the ICS data with proper content type
        return new NextResponse(icsData, {
            status: 200,
            headers: {
                'Content-Type': 'text/calendar',
                'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
            },
        });
    } catch (error) {
        console.error('Error fetching calendar:', error);
        return NextResponse.json(
            { error: 'Failed to fetch calendar' },
            { status: 500 }
        );
    }
}
