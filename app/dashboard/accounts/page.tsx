"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
    Instagram,
    Plus,
    CheckCircle2,
    Trash2,
    AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AccountsPage() {
    const supabase = createClient();
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();

    // Read URL callback errors or success messages
    const errorParam = searchParams.get("error");
    const successParam = searchParams.get("success");
    const errorMessage = searchParams.get("message");

    const { data: accounts = [], isLoading: loading } = useQuery({
        queryKey: ["instagram_accounts"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("instagram_accounts")
                .select("*")
                .order("connected_at", { ascending: false });
            if (error) throw error;
            return data;
        },
    });

    const disconnectMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("instagram_accounts")
                .delete()
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["instagram_accounts"] });
        },
    });

    const handleDisconnect = async (id: string) => {
        if (!confirm("Are you sure you want to disconnect this account?")) return;
        disconnectMutation.mutate(id);
    };

    return (
        <div className="space-y-8">
            {errorParam && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-sm">Failed to connect Instagram account</p>
                        <p className="text-xs text-red-400/80 mt-1">
                            {errorMessage || errorParam}.
                            If you are testing multiple users, ensure the logged-in Facebook user uses an account that has Admin access to the linked Facebook Page.
                        </p>
                    </div>
                </div>
            )}
            {successParam === "connected" && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <p className="font-semibold text-sm">Successfully connected Instagram account!</p>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
                        Instagram Accounts
                    </h1>
                    <p className="text-sm text-surface-400">
                        Connect your Instagram account via Meta
                    </p>
                </div>
                <a
                    href="/api/auth/instagram"
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl gradient-brand text-sm font-semibold text-white hover:opacity-90 transition-all shadow-lg shadow-brand-500/25 sm:w-auto"
                >
                    <Instagram className="w-4 h-4" />
                    <span>Connect <span className="hidden sm:inline">Account</span></span>
                </a>
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="glass-light rounded-2xl p-12 flex flex-col items-center justify-center">
                        <div className="w-8 h-8 rounded-full border-2 border-brand-500/20 border-t-brand-500 animate-spin mb-4" />
                        <p className="text-sm text-surface-400">Loading accounts...</p>
                    </div>
                ) : accounts.length > 0 ? (
                    accounts.map((account) => (
                        <div key={account.id} className="glass-light rounded-2xl p-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg">
                                    <Instagram className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white">@{account.ig_username}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 uppercase font-bold tracking-wider">
                                            <CheckCircle2 className="w-2.5 h-2.5" />
                                            Active
                                        </span>
                                        <span className="text-xs text-surface-500">
                                            Connected on {new Date(account.connected_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDisconnect(account.id)}
                                className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-surface-400 hover:text-red-400 hover:bg-red-400/10 hover:border-red-400/20 transition-all"
                            >
                                <Trash2 className="w-4.5 h-4.5" />
                            </button>
                        </div>
                    ))
                ) : (
                    <div className="glass-light rounded-2xl p-12 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-surface-800 flex items-center justify-center mx-auto mb-4">
                            <Instagram className="w-7 h-7 text-surface-600" />
                        </div>
                        <h3 className="font-semibold text-white mb-2">
                            No accounts connected
                        </h3>
                        <p className="text-sm text-surface-500 max-w-sm mx-auto mb-5">
                            Connect your Instagram Business or Creator account to start
                            automating DMs.
                        </p>
                        <a
                            href="/api/auth/instagram"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-brand text-sm font-semibold text-white hover:opacity-90 transition-all shadow-lg shadow-brand-500/25"
                        >
                            <Instagram className="w-4 h-4" />
                            Connect Instagram
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
