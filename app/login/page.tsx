'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import { Activity, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            router.push('/');
        } catch (err: any) {
            setError(err.message || 'Error signing in');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0b] flex flex-col items-center justify-center p-4">
            {/* Ambient Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.03)_0%,transparent_50%)]" />
                <div className="absolute top-1/4 -right-1/4 w-[100%] h-[100%] bg-[radial-gradient(circle_at_center,rgba(52,211,153,0.03)_0%,transparent_50%)]" />
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo / Branding */}
                <div className="flex flex-col items-center mb-10 opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-emerald-400 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                        <Activity className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome back</h1>
                    <p className="text-text-secondary text-center">Sign in to your productivity dashboard</p>
                </div>

                {/* Main Card */}
                <div className="bg-[#141415]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl opacity-0 animate-[slideUp_0.5s_ease-out_0.1s_forwards]">
                    <form onSubmit={handleLogin} className="space-y-5">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-text-secondary mb-2 ml-1 uppercase tracking-wider">
                                    Email
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-secondary group-focus-within:text-blue-400 transition-colors">
                                        <Mail className="h-5 w-5" />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-[#1a1a1c] border border-white/5 focus:border-blue-500/50 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
                                        placeholder="you@example.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-text-secondary mb-2 ml-1 uppercase tracking-wider">
                                    Password
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-secondary group-focus-within:text-blue-400 transition-colors">
                                        <Lock className="h-5 w-5" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-[#1a1a1c] border border-white/5 focus:border-blue-500/50 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 text-white font-semibold flex items-center justify-center gap-2 rounded-xl py-3.5 mt-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                        >
                            <span className="relative z-10">{loading ? 'Signing in...' : 'Sign In'}</span>
                            {!loading && <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />}
                        </button>
                    </form>
                </div>

                {/* Footer text */}
                <div className="mt-8 text-center opacity-0 animate-[fadeIn_0.5s_ease-out_0.3s_forwards]">
                    <p className="text-text-secondary text-sm">
                        Secured by Supabase Authentication
                    </p>
                </div>
            </div>

            <style jsx global>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
}
