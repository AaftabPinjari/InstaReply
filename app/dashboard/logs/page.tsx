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
            const { data, error } = await supabase
                .from("dm_logs")
                .select("*")
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
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">DM Logs</h1>
                    <p className="text-sm text-surface-400">Track every automated DM sent</p>
                </div>
                <button onClick={() => refetch()} className="p-2.5 rounded-xl glass-light text-surface-400 hover:text-white transition-all"><RefreshCw className="w-4 h-4" /></button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by username or message..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-surface-500 outline-none focus:border-brand-500/50 text-sm" />
                </div>
                <div className="flex gap-2">
                    {(["all", "sent", "failed", "skipped"] as const).map(f => (
                        <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${filter === f ? "bg-brand-500/15 text-brand-400 border border-brand-500/30" : "glass-light text-surface-400 hover:text-white"}`}>
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20"><div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mx-auto" /></div>
            ) : filtered.length === 0 ? (
                <div className="glass-light rounded-2xl p-6 text-center py-12">
                    <ScrollText className="w-8 h-8 text-surface-600 mx-auto mb-3" />
                    <p className="text-sm text-surface-500">No logs found</p>
                </div>
            ) : (
                <div className="glass-light rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/[0.06]">
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Status</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">User</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Message</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Error</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((l, i) => (
                                    <motion.tr key={l.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                        <td className="px-5 py-3.5">{statusIcon(l.status)}</td>
                                        <td className="px-5 py-3.5 font-medium text-white">@{l.commenter_username || "unknown"}</td>
                                        <td className="px-5 py-3.5 text-surface-400 max-w-[200px] truncate">{l.message_sent}</td>
                                        <td className="px-5 py-3.5 text-danger-400 text-xs max-w-[150px] truncate">{l.error_message || "—"}</td>
                                        <td className="px-5 py-3.5 text-surface-500 text-xs whitespace-nowrap">{new Date(l.sent_at).toLocaleString()}</td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
