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
