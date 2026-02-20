import { supabase } from '@/lib/supabase-client';

export type UserSettings = {
    id: number;
    user_name: string;
    banner_url: string | null;
    sidebar_top_url: string | null;
    sidebar_url: string | null;
    sidebar_bottom_url: string | null;
    updated_at: string;
};

// User Settings now rely on Supabase RLS and the authenticated user structure

export async function getUserSettings(): Promise<UserSettings | null> {
    const { data, error } = await supabase
        .from('user_settings')
        .select('key, value');

    if (error) {
        console.error('Error fetching settings:', error);
        return null;
    }

    // Transform key-value rows into UserSettings object
    // Default values
    const settings: any = {
        user_name: 'User',
        banner_url: null,
        sidebar_top_url: null,
        sidebar_url: null,
        sidebar_bottom_url: null,
        updated_at: new Date().toISOString()
    };

    if (data) {
        data.forEach((row: { key: string; value: string }) => {
            if (row.key === 'user_name') settings.user_name = row.value;
            if (row.key === 'banner_url') settings.banner_url = row.value;
            if (row.key === 'sidebar_top_url') settings.sidebar_top_url = row.value;
            if (row.key === 'sidebar_url') settings.sidebar_url = row.value;
            if (row.key === 'sidebar_bottom_url') settings.sidebar_bottom_url = row.value;
        });
    }

    return settings as UserSettings;
}

export async function updateUserSettings(updates: Partial<UserSettings>): Promise<UserSettings | null> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        console.error('User not authenticated');
        return null;
    }

    // Convert updates object to array of key-value rows
    const updatesToUpsert = Object.entries(updates)
        .filter(([key]) => ['user_name', 'banner_url', 'sidebar_top_url', 'sidebar_url', 'sidebar_bottom_url'].includes(key))
        .map(([key, value]) => ({
            user_id: user.id,
            key,
            value: value as string | null,
            updated_at: new Date().toISOString()
        }));

    if (updatesToUpsert.length === 0) return getUserSettings();

    const { error } = await supabase
        .from('user_settings')
        .upsert(updatesToUpsert);

    if (error) {
        console.error('Error updating settings:', error);
        return null;
    }

    return getUserSettings();
}

export async function initUserSettings(): Promise<void> {
    // No-op for key-value store as defaults are inserted via SQL or handled in getUserSettings
    return;
}
