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
    if (typeof window === 'undefined' || !isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    // Singapore is UTC +8
    const sgt = new Date(date.getTime() + (8 * 60 * 60 * 1000));
    return sgt.getUTCHours().toString().padStart(2, '0') + ':' + sgt.getUTCMinutes().toString().padStart(2, '0');
}

/**
 * Converts a UTC ISO string to a local SGT date string (DD/MM/YYYY).
 */
export function formatLocalDate(isoString: string | null): string {
    if (typeof window === 'undefined' || !isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    // SGT +8
    const sgt = new Date(date.getTime() + (8 * 60 * 60 * 1000));
    return `${sgt.getUTCDate().toString().padStart(2, '0')}/${(sgt.getUTCMonth() + 1).toString().padStart(2, '0')}/${sgt.getUTCFullYear()}`;
}

/**
 * Converts a UTC ISO string to a full SGT string (D MMM, HH:mm).
 */
export function formatFullDateTime(isoString: string | null): string {
    if (typeof window === 'undefined' || !isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    const sgt = new Date(date.getTime() + (8 * 60 * 60 * 1000));
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${sgt.getUTCDate()} ${months[sgt.getUTCMonth()]}, ${sgt.getUTCHours().toString().padStart(2, '0')}:${sgt.getUTCMinutes().toString().padStart(2, '0')}`;
}
