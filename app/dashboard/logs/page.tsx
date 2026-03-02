"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ScrollText, Search, CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Log {
    id: string;
    commenter_username: string;
    commenter_ig_id: string;
    comment_id: string;
    message_sent: string;
    status: string;
    error_message: string | null;
    sent_at: string;
}

export default function LogsPage() {
    const supabase = createClient();
    const queryClient = useQueryClient();

    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"all" | "sent" | "failed" | "skipped">("all");

    const { data: logs = [], isLoading: loading, refetch } = useQuery({
        queryKey: ["dm_logs"],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // Get this user's automation IDs to scope the logs
            const { data: userAutomations } = await supabase
                .from("automations")
                .select("id")
                .eq("user_id", user.id);

            const automationIds = (userAutomations || []).map(a => a.id);
            if (automationIds.length === 0) return [];

            const { data, error } = await supabase
                .from("dm_logs")
                .select("*")
                .in("automation_id", automationIds)
                .order("sent_at", { ascending: false })
                .limit(100);
            if (error) throw error;
            return data;
        },
    });

    const filtered = logs.filter(l => {
        if (filter !== "all" && l.status !== filter) return false;
        if (search && !l.commenter_username?.toLowerCase().includes(search.toLowerCase()) && !l.message_sent?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const statusIcon = (s: string) => {
        if (s === "sent") return <CheckCircle2 className="w-4 h-4 text-success-400" />;
        if (s === "failed") return <XCircle className="w-4 h-4 text-danger-400" />;
        return <Clock className="w-4 h-4 text-surface-500" />;
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">DM Logs</h1>
                    <p className="text-sm text-surface-400">Track every automated DM sent</p>
                </div>
                <button onClick={() => refetch()} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl glass-light text-surface-400 hover:text-white transition-all sm:w-auto self-end">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    <span className="text-sm font-medium">Refresh</span>
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by username or message..." className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-surface-500 outline-none focus:border-brand-500/50 text-sm transition-all" />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
                    {(["all", "sent", "failed", "skipped"] as const).map(f => (
                        <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${filter === f ? "bg-brand-500/15 text-brand-400 border border-brand-500/30" : "glass-light text-surface-400 hover:text-white"}`}>
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center">
                    <div className="w-10 h-10 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin mb-4" />
                    <p className="text-sm text-surface-500">Loading logs...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="glass-light rounded-2xl p-12 text-center">
                    <ScrollText className="w-12 h-12 text-surface-700 mx-auto mb-4" />
                    <h3 className="text-white font-semibold mb-1">No logs found</h3>
                    <p className="text-sm text-surface-500">Try adjusting your search or filters</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Desktop Table */}
                    <div className="hidden md:block glass-light rounded-2xl overflow-hidden border border-white/[0.04]">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                                        <th className="text-left px-6 py-4 text-xs font-bold text-surface-500 uppercase tracking-widest">Status</th>
                                        <th className="text-left px-6 py-4 text-xs font-bold text-surface-500 uppercase tracking-widest">User</th>
                                        <th className="text-left px-6 py-4 text-xs font-bold text-surface-500 uppercase tracking-widest">Message</th>
                                        <th className="text-left px-6 py-4 text-xs font-bold text-surface-500 uppercase tracking-widest">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.03]">
                                    {filtered.map((l, i) => (
                                        <motion.tr key={l.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-6 py-4 font-medium">{statusIcon(l.status)}</td>
                                            <td className="px-6 py-4 font-semibold text-white">@{l.commenter_username || "unknown"}</td>
                                            <td className="px-6 py-4 text-surface-400">
                                                <div className="max-w-[300px] truncate">{l.message_sent}</div>
                                                {l.error_message && <div className="text-[10px] text-danger-400 mt-1">{l.error_message}</div>}
                                            </td>
                                            <td className="px-6 py-4 text-surface-500 text-xs whitespace-nowrap">{new Date(l.sent_at).toLocaleString()}</td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                        {filtered.map((l, i) => (
                            <motion.div
                                key={l.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.02 }}
                                className="glass-light rounded-2xl p-5 border border-white/[0.04]"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-surface-800 flex items-center justify-center text-sm font-bold text-white">
                                            {l.commenter_username?.[0]?.toUpperCase() || "?"}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white">@{l.commenter_username}</p>
                                            <p className="text-[10px] text-surface-500 uppercase tracking-wider font-semibold">
                                                {new Date(l.sent_at).toLocaleDateString()} at {new Date(l.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${l.status === 'sent' ? 'bg-success-500/10 text-success-400' : 'bg-danger-500/10 text-danger-400'}`}>
                                        {l.status}
                                    </span>
                                </div>
                                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.04]">
                                    <p className="text-sm text-surface-300 leading-relaxed italic">"{l.message_sent}"</p>
                                    {l.error_message && (
                                        <div className="mt-3 pt-3 border-t border-white/[0.04] text-xs text-danger-400 flex items-start gap-2">
                                            <span className="shrink-0">⚠️</span>
                                            <span>{l.error_message}</span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
