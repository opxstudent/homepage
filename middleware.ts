import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
    // 1. Check if we should exclude this route
    const { pathname } = req.nextUrl;

    // Allow public access to /api/cron and /_next (and static files usually handled by Next.js automatically, but explicit check is good)
    if (
        pathname.startsWith('/api/cron') ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/static') || // Optional: if you have a public static folder
        pathname === '/favicon.ico' // Common static file
    ) {
        return NextResponse.next();
    }

    // 2. define the credentials
    const adminUser = process.env.ADMIN_USER;
    const adminPassword = process.env.ADMIN_PASSWORD;

    // If env vars are not set, you might want to block everything or allow everything.
    // Safest is to block or log an error. Here we'll block to enforce security.
    if (!adminUser || !adminPassword) {
        return new NextResponse(
            JSON.stringify({ success: false, message: 'Authentication not configured' }),
            { status: 401, headers: { 'content-type': 'application/json' } }
        );
    }

    // 3. Check Authorization Header
    const authHeader = req.headers.get('authorization');

    if (authHeader) {
        // Basic <base64>
        const authValue = authHeader.split(' ')[1];
        if (authValue) {
            const [user, pwd] = atob(authValue).split(':');

            if (user === adminUser && pwd === adminPassword) {
                return NextResponse.next();
            }
        }
    }

    // 4. Request Basic Auth if missing or invalid
    return new NextResponse('Authentication Required', {
        status: 401,
        headers: {
            'WWW-Authenticate': 'Basic realm="Secure Area"',
        },
    });
}

// Configure paths to match (everything)
export const config = {
    matcher: '/:path*',
};
