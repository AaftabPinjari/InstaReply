"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
    Send,
    MessageCircle,
    Zap,
    ArrowUpRight,
    Instagram,
    AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Stats {
    dmsSentToday: number;
    dmsSentTotal: number;
    activeAutomations: number;
    connectedAccounts: number;
}

interface RecentLog {
    id: string;
    commenter_username: string;
    message_sent: string;
    status: string;
    sent_at: string;
}

const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.08, duration: 0.5 },
    }),
};

export default function DashboardPage() {
    const supabase = createClient();

    const { data: dashboardData, isLoading } = useQuery({
        queryKey: ["dashboard_stats"],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // Execute all queries in parallel for maximum speed
            const [
                { data: accounts },
                { count: activeAutomations },
                { count: totalCount },
                { data: logs }
            ] = await Promise.all([
                supabase.from("instagram_accounts").select("id").eq("user_id", user.id),
                supabase.from("automations").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("is_active", true),
                supabase.from("dm_logs").select("*", { count: "exact", head: true }).eq("status", "sent"),
                supabase.from("dm_logs")
                    .select("id, commenter_username, message_sent, status, sent_at")
                    .order("sent_at", { ascending: false })
                    .limit(5)
            ]);

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const { count: todayCount } = await supabase
                .from("dm_logs")
                .select("*", { count: "exact", head: true })
                .eq("status", "sent")
                .gte("sent_at", today.toISOString());

            return {
                stats: {
                    connectedAccounts: accounts?.length || 0,
                    activeAutomations: activeAutomations || 0,
                    dmsSentToday: todayCount || 0,
                    dmsSentTotal: totalCount || 0,
                },
                recentLogs: logs || [],
                hasAccount: accounts && accounts.length > 0,
            };
        }
    });

    const stats = dashboardData?.stats || { dmsSentToday: 0, dmsSentTotal: 0, activeAutomations: 0, connectedAccounts: 0 };
    const recentLogs = dashboardData?.recentLogs || [];
    const hasAccount = dashboardData?.hasAccount ?? null;

    const statCards = [
        {
            label: "DMs Sent Today",
            value: stats.dmsSentToday,
            icon: Send,
            color: "brand",
        },
        {
            label: "Total DMs Sent",
            value: stats.dmsSentTotal,
            icon: MessageCircle,
            color: "accent",
        },
        {
            label: "Active Automations",
            value: stats.activeAutomations,
            icon: Zap,
            color: "warning",
        },
        {
            label: "Connected Accounts",
            value: stats.connectedAccounts,
            icon: Instagram,
            color: "success",
        },
    ];

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Dashboard</h1>
                    <p className="text-sm text-surface-400">
                        Overview of your Instagram DM automations
                    </p>
                </div>
            </div>

            {/* Connect Account Banner */}
            {hasAccount === false && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 sm:p-6 rounded-2xl gradient-card border border-brand-500/20 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-6"
                >
                    <div className="w-12 h-12 rounded-xl bg-brand-500/15 flex items-center justify-center shrink-0 shadow-lg shadow-brand-500/10">
                        <Instagram className="w-6 h-6 text-brand-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-1.5">
                            Connect your Instagram account
                        </h3>
                        <p className="text-sm text-surface-400 mb-4 leading-relaxed">
                            To start automating DMs, you need to connect your Instagram
                            Business or Creator account via the Meta API.
                        </p>
                        <Link
                            href="/dashboard/accounts"
                            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl gradient-brand text-sm font-semibold text-white hover:opacity-90 transition-all shadow-lg shadow-brand-500/25"
                        >
                            Connect Account
                            <ArrowUpRight className="w-4 h-4" />
                        </Link>
                    </div>
                </motion.div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
                {statCards.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        variants={fadeUp}
                        initial="hidden"
                        animate="visible"
                        custom={i}
                        className="glass-light rounded-xl sm:rounded-2xl p-4 sm:p-5 hover:bg-white/[0.05] transition-all flex flex-col justify-between"
                    >
                        <div className="flex items-start justify-between mb-2 sm:mb-3">
                            <div
                                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 ${stat.color === "brand"
                                    ? "bg-brand-500/15 text-brand-400"
                                    : stat.color === "accent"
                                        ? "bg-accent-500/15 text-accent-400"
                                        : stat.color === "warning"
                                            ? "bg-warning-400/15 text-warning-400"
                                            : "bg-success-500/15 text-success-400"
                                    }`}
                            >
                                <stat.icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                            </div>
                        </div>
                        <div>
                            <p className="text-xl sm:text-2xl font-bold text-white mb-0.5">
                                {stat.value.toLocaleString()}
                            </p>
                            <p className="text-[10px] sm:text-xs text-surface-400 leading-tight">
                                {stat.label}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Quick Actions + Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="glass-light rounded-2xl p-6"
                >
                    <h2 className="font-semibold text-white mb-4">Quick Actions</h2>
                    <div className="space-y-3">
                        {[
                            {
                                href: "/dashboard/templates",
                                label: "Create a DM Template",
                                desc: "Build a personalized message template",
                                icon: FileText,
                            },
                            {
                                href: "/dashboard/automations",
                                label: "Set Up Automation",
                                desc: "Assign templates to your posts",
                                icon: Zap,
                            },
                        ].map((action) => (
                            <Link
                                key={action.href}
                                href={action.href}
                                className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.04] transition-all group"
                            >
                                <div className="w-9 h-9 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center group-hover:bg-brand-500/20 transition-colors">
                                    <action.icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white">
                                        {action.label}
                                    </p>
                                    <p className="text-xs text-surface-500">{action.desc}</p>
                                </div>
                                <ArrowUpRight className="w-4 h-4 text-surface-500 group-hover:text-surface-300 transition-colors" />
                            </Link>
                        ))}
                    </div>
                </motion.div>

                {/* Recent DMs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="glass-light rounded-2xl p-6"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-white">Recent DMs</h2>
                        <Link
                            href="/dashboard/logs"
                            className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                        >
                            View all
                        </Link>
                    </div>
                    {recentLogs.length === 0 ? (
                        <div className="text-center py-8">
                            <MessageCircle className="w-8 h-8 text-surface-700 mx-auto mb-3" />
                            <p className="text-sm text-surface-500">No DMs sent yet</p>
                            <p className="text-xs text-surface-600 mt-1">
                                Set up an automation to start sending
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {recentLogs.map((log) => (
                                <div
                                    key={log.id}
                                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-all"
                                >
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-500/20 to-brand-500/20 flex items-center justify-center text-xs font-bold text-white">
                                        {log.commenter_username?.[0]?.toUpperCase() || "?"}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">
                                            @{log.commenter_username}
                                        </p>
                                        <p className="text-xs text-surface-500 truncate">
                                            {log.message_sent}
                                        </p>
                                    </div>
                                    <span
                                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${log.status === "sent"
                                            ? "bg-success-500/15 text-success-400"
                                            : log.status === "failed"
                                                ? "bg-danger-500/15 text-danger-400"
                                                : "bg-surface-700/50 text-surface-400"
                                            }`}
                                    >
                                        {log.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}

function FileText(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" />
            <path d="M10 9H8" />
            <path d="M16 13H8" />
            <path d="M16 17H8" />
        </svg>
    );
}
