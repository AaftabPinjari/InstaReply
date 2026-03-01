"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
    Instagram,
    ExternalLink,
    Plus,
    CheckCircle2,
    AlertTriangle,
    Copy,
    Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AccountsPage() {
    const [showInstructions, setShowInstructions] = useState(true);
    const supabase = createClient();
    const queryClient = useQueryClient();

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
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">
                        Instagram Accounts
                    </h1>
                    <p className="text-sm text-surface-400">
                        Connect your Instagram Business / Creator account
                    </p>
                </div>
                <a
                    href="/api/auth/instagram"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-brand text-sm font-semibold text-white hover:opacity-90 transition-all shadow-lg shadow-brand-500/25"
                >
                    <Plus className="w-4 h-4" />
                    Connect Account
                </a>
            </div>

            {/* Setup Instructions */}
            {showInstructions && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 glass-light rounded-2xl p-6"
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-brand-500/15 flex items-center justify-center">
                                <Instagram className="w-5 h-5 text-brand-400" />
                            </div>
                            <h2 className="font-semibold text-white">
                                Meta App Setup (Required)
                            </h2>
                        </div>
                        <button
                            onClick={() => setShowInstructions(false)}
                            className="text-xs text-surface-500 hover:text-surface-300 transition-colors"
                        >
                            Hide
                        </button>
                    </div>

                    <div className="space-y-4">
                        {[
                            {
                                step: 1,
                                title: "Create a Meta App",
                                desc: (
                                    <>
                                        Go to{" "}
                                        <a
                                            href="https://developers.facebook.com/apps/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-brand-400 hover:underline"
                                        >
                                            developers.facebook.com/apps
                                        </a>{" "}
                                        → Create App → Select &quot;Business&quot; type → Choose &quot;Other&quot; use case.
                                    </>
                                ),
                            },
                            {
                                step: 2,
                                title: "Add Instagram Messaging Product",
                                desc: "In your app dashboard, click \"Add Product\" → find \"Instagram\" → click \"Set Up\". Then also add the \"Webhooks\" product.",
                            },
                            {
                                step: 3,
                                title: "Configure Instagram API Settings",
                                desc: (
                                    <>
                                        Go to Instagram {'>'} API Setup with Instagram Login. Add these
                                        permissions:{" "}
                                        <code className="px-1.5 py-0.5 rounded bg-white/[0.06] text-xs text-brand-300">
                                            instagram_basic
                                        </code>{" "}
                                        <code className="px-1.5 py-0.5 rounded bg-white/[0.06] text-xs text-brand-300">
                                            instagram_manage_messages
                                        </code>{" "}
                                        <code className="px-1.5 py-0.5 rounded bg-white/[0.06] text-xs text-brand-300">
                                            instagram_manage_comments
                                        </code>
                                    </>
                                ),
                            },
                            {
                                step: 4,
                                title: "Set Redirect URI",
                                desc: (
                                    <div className="space-y-2">
                                        <p>
                                            In Instagram {'>'} API Setup, add this as your OAuth Redirect
                                            URI:
                                        </p>
                                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                                            <code suppressHydrationWarning className="text-xs text-surface-300 flex-1 truncate">
                                                {typeof window !== "undefined"
                                                    ? `${window.location.origin}/api/auth/instagram/callback`
                                                    : "https://your-domain.com/api/auth/instagram/callback"}
                                            </code>
                                            <button
                                                onClick={() =>
                                                    navigator.clipboard.writeText(
                                                        typeof window !== "undefined"
                                                            ? `${window.location.origin}/api/auth/instagram/callback`
                                                            : ""
                                                    )
                                                }
                                                className="text-surface-500 hover:text-surface-300 transition-colors shrink-0"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ),
                            },
                            {
                                step: 5,
                                title: "Configure Webhook",
                                desc: (
                                    <div className="space-y-2">
                                        <p>
                                            In Webhooks {'>'} Instagram, subscribe to the{" "}
                                            <code className="px-1.5 py-0.5 rounded bg-white/[0.06] text-xs text-brand-300">
                                                comments
                                            </code>{" "}
                                            field. Set the callback URL to:
                                        </p>
                                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                                            <code suppressHydrationWarning className="text-xs text-surface-300 flex-1 truncate">
                                                {typeof window !== "undefined"
                                                    ? `${window.location.origin}/api/webhook/instagram`
                                                    : "https://your-domain.com/api/webhook/instagram"}
                                            </code>
                                            <button
                                                onClick={() =>
                                                    navigator.clipboard.writeText(
                                                        `${window.location.origin}/api/webhook/instagram`
                                                    )
                                                }
                                                className="text-surface-500 hover:text-surface-300 transition-colors shrink-0"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ),
                            },
                            {
                                step: 6,
                                title: "Add Environment Variables",
                                desc: (
                                    <div className="space-y-2">
                                        <p>
                                            Add these to your{" "}
                                            <code className="px-1.5 py-0.5 rounded bg-white/[0.06] text-xs text-brand-300">
                                                .env.local
                                            </code>
                                            :
                                        </p>
                                        <div className="p-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-surface-300 font-mono leading-6">
                                            META_APP_ID=your_app_id
                                            <br />
                                            META_APP_SECRET=your_app_secret
                                            <br />
                                            META_WEBHOOK_VERIFY_TOKEN=a_random_string_you_choose
                                            <br />
                                            NEXT_PUBLIC_META_APP_ID=your_app_id
                                        </div>
                                    </div>
                                ),
                            },
                        ].map((item) => (
                            <div key={item.step} className="flex gap-4">
                                <div className="w-7 h-7 rounded-lg bg-brand-500/15 text-brand-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                    {item.step}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-semibold text-white mb-1">
                                        {item.title}
                                    </h3>
                                    <div className="text-sm text-surface-400 leading-relaxed">
                                        {item.desc}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 p-4 rounded-xl bg-warning-400/8 border border-warning-400/20">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-4 h-4 text-warning-400 mt-0.5 shrink-0" />
                            <p className="text-xs text-surface-300 leading-relaxed">
                                <strong className="text-warning-400">Note:</strong> Your Meta App
                                must be in &quot;Live&quot; mode with Advanced Access for the
                                <code className="mx-1 px-1 py-0.5 rounded bg-white/[0.06] text-warning-300">
                                    comments
                                </code>
                                webhook to work on accounts other than the app admin&apos;s. During
                                development, you can test with the admin account.
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Connected Accounts List */}
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
                                className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-surface-400 hover:text-error-400 hover:bg-error-400/10 hover:border-error-400/20 transition-all"
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
