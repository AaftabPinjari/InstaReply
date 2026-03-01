"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Send, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const supabase = createClient();
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }

        router.push("/dashboard");
    };

    return (
        <div className="min-h-screen bg-surface-950 flex items-center justify-center relative overflow-hidden">
            {/* Ambient */}
            <div className="absolute top-[-30%] left-[-20%] w-[500px] h-[500px] rounded-full bg-brand-600/8 blur-[120px]" />
            <div className="absolute bottom-[-30%] right-[-20%] w-[400px] h-[400px] rounded-full bg-accent-500/6 blur-[120px]" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-md mx-4"
            >
                {/* Logo */}
                <Link href="/" className="flex items-center justify-center gap-2.5 mb-10">
                    <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center shadow-lg shadow-brand-500/20">
                        <Send className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-2xl font-bold tracking-tight text-white">InstaReply</span>
                </Link>

                <div className="glass rounded-2xl p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-white mb-2">Welcome back</h1>
                        <p className="text-sm text-surface-400">Log in to manage your automations</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-surface-300 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-surface-500 outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/25 transition-all text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-surface-300 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-surface-500 outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/25 transition-all text-sm pr-11"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="px-4 py-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm"
                            >
                                {error}
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 rounded-xl gradient-brand font-semibold text-sm text-white hover:opacity-90 transition-all shadow-lg shadow-brand-500/25 disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <Loader2 className="w-4.5 h-4.5 animate-spin" />
                            ) : (
                                <>
                                    Log In
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="text-center text-sm text-surface-400 mt-6">
                        Don&apos;t have an account?{" "}
                        <Link href="/signup" className="text-brand-400 font-medium hover:text-brand-300 transition-colors">
                            Sign up free
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
