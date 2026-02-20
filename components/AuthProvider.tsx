'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { User, Session } from '@supabase/supabase-js';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    isLoading: true,
    signOut: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        let mounted = true;

        async function getSession() {
            const { data: { session }, error } = await supabase.auth.getSession();

            if (mounted) {
                setSession(session);
                setUser(session?.user ?? null);
                setIsLoading(false);

                // Client-side protection fallback (Middleware should handle most)
                if (!session && pathname !== '/login') {
                    router.push('/login');
                } else if (session && pathname === '/login') {
                    router.push('/');
                }
            }
        }

        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (mounted) {
                    setSession(session);
                    setUser(session?.user ?? null);
                    setIsLoading(false);

                    if (event === 'SIGNED_OUT') {
                        router.push('/login');
                    } else if (event === 'SIGNED_IN' && pathname === '/login') {
                        router.push('/');
                    }
                }
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [pathname, router]);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, session, isLoading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    return useContext(AuthContext);
};
