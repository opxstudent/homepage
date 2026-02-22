/**
 * Returns today's date as 'YYYY-MM-DD' based on the USER'S LOCAL device time.
 * This is critical for correct daily habit resets — never use UTC (new Date().toISOString())
 * because that can be a different calendar day for users in non-UTC timezones.
 */
export function getLocalISOString(): string {
    const date = new Date();
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

/**
 * Converts a date and time string (from inputs) to a UTC ISO string for storage.
 * Assumes the input is in SGT (Singapore Time, UTC+8).
 */
export function toUTCISO(dateStr: string, timeStr: string | null): string | null {
    if (!dateStr) return null;
    // Append +08:00 to force SGT interpretation
    const combined = timeStr ? `${dateStr}T${timeStr}:00+08:00` : `${dateStr}T00:00:00+08:00`;
    const date = new Date(combined);
    return isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Converts a UTC ISO string to a local SGT time string (HH:mm) for input display.
 * Always returns SGT (UTC+8) regardless of browser settings.
 */
export function formatLocalTime(isoString: string | null): string {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Singapore',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}
