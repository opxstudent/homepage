import { supabase } from './supabase-client';

export interface Book {
    id: string;
    title: string;
    author: string | null;
    genre: string[] | null;
    status: 'to-read' | 'reading' | 'finished';
    priority: 'low' | 'medium' | 'high';
    rating: number | null;
    cover_url: string | null;
    notes: string | null;
    finished_date: string | null;
    user_id: string | null;
    created_at: string;
}

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

export async function getBooks(): Promise<Book[]> {
    const { data, error } = await supabase
        .from('library')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching books:', error);
        return [];
    }

    // Sort: high priority first, then by title
    return (data as Book[]).sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority] ?? 1;
        const pb = PRIORITY_ORDER[b.priority] ?? 1;
        if (pa !== pb) return pa - pb;
        return a.title.localeCompare(b.title);
    });
}

export async function getBook(id: string): Promise<Book | null> {
    const { data, error } = await supabase
        .from('library')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching book:', error);
        return null;
    }
    return data as Book;
}

export async function addBook(book: Partial<Book>): Promise<Book | null> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        console.error('User not authenticated');
        return null;
    }

    const { data, error } = await supabase
        .from('library')
        .insert({ ...book, user_id: user.id })
        .select()
        .single();

    if (error) {
        console.error('Error adding book:', error);
        return null;
    }
    return data as Book;
}

export async function updateBook(id: string, patch: Partial<Book>): Promise<boolean> {
    // Auto-set finished_date when marking as finished
    if (patch.status === 'finished' && !patch.finished_date) {
        patch.finished_date = new Date().toISOString().split('T')[0];
    }
    // Clear finished_date if moving away from finished
    if (patch.status && patch.status !== 'finished') {
        patch.finished_date = null;
    }

    const { error } = await supabase
        .from('library')
        .update(patch)
        .eq('id', id);

    if (error) {
        console.error('Error updating book:', error);
        return false;
    }
    return true;
}

export async function deleteBook(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('library')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting book:', error);
        return false;
    }
    return true;
}

export async function getReadingGoalProgress(year: number): Promise<number> {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const { count, error } = await supabase
        .from('library')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'finished')
        .gte('finished_date', startDate)
        .lte('finished_date', endDate);

    if (error) {
        console.error('Error fetching reading goal:', error);
        return 0;
    }
    return count ?? 0;
}
