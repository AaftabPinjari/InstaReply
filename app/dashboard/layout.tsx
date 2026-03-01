"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Send,
    LayoutDashboard,
    Instagram,
    FileText,
    Zap,
    ScrollText,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/accounts", label: "Accounts", icon: Instagram },
    { href: "/dashboard/templates", label: "Templates", icon: FileText },
    { href: "/dashboard/automations", label: "Automations", icon: Zap },
    { href: "/dashboard/logs", label: "DM Logs", icon: ScrollText },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [user, setUser] = useState<{ email?: string; full_name?: string } | null>(null);

    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) {
                setUser({
                    email: data.user.email,
                    full_name: data.user.user_metadata?.full_name,
                });
            }
        });
    }, []);

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
    };

    // Close mobile sidebars on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    return (
        <div className="min-h-screen bg-surface-950 flex flex-col md:flex-row">
            {/* Mobile Header */}
            <header className="md:hidden flex items-center justify-between px-5 h-16 border-b border-white/[0.06] bg-surface-950/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center shadow-md shadow-brand-500/20">
                        <Send className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-lg font-bold tracking-tight text-white">InstaReply</span>
                </div>
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="p-2 rounded-xl text-surface-400 hover:text-white hover:bg-white/[0.04] transition-all"
                >
                    <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        {mobileOpen ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        )}
                    </svg>
                </button>
            </header>

            {/* Sidebar Overlay (Mobile) */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setMobileOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <motion.aside
                initial={false}
                animate={{
                    width: collapsed ? 72 : 260,
                    x: mobileOpen ? 0 : (typeof window !== 'undefined' && window.innerWidth < 768 ? -260 : 0)
                }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className={`fixed left-0 top-0 h-screen border-r border-white/[0.06] bg-surface-950 z-[45] flex flex-col md:relative ${mobileOpen ? 'shadow-2xl' : ''
                    }`}
            >
                {/* Logo */}
                <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/[0.06] shrink-0">
                    <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center shadow-md shadow-brand-500/20 shrink-0">
                        <Send className="w-4 h-4 text-white" />
                    </div>
                    <AnimatePresence>
                        {(!collapsed || mobileOpen) && (
                            <motion.span
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: "auto" }}
                                exit={{ opacity: 0, width: 0 }}
                                className="text-lg font-bold tracking-tight text-white whitespace-nowrap overflow-hidden"
                            >
                                InstaReply
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>

                {/* Nav */}
                <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive =
                            item.href === "/dashboard"
                                ? pathname === "/dashboard"
                                : pathname.startsWith(item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${isActive
                                    ? "bg-brand-500/15 text-brand-400"
                                    : "text-surface-400 hover:text-white hover:bg-white/[0.04]"
                                    }`}
                            >
                                <item.icon
                                    className={`w-[18px] h-[18px] shrink-0 ${isActive ? "text-brand-400" : "text-surface-500 group-hover:text-surface-300"
                                        }`}
                                />
                                <AnimatePresence>
                                    {(!collapsed || mobileOpen) && (
                                        <motion.span
                                            initial={{ opacity: 0, width: 0 }}
                                            animate={{ opacity: 1, width: "auto" }}
                                            exit={{ opacity: 0, width: 0 }}
                                            className="whitespace-nowrap overflow-hidden"
                                        >
                                            {item.label}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-brand-500"
                                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                    />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom */}
                <div className="border-t border-white/[0.06] p-3 space-y-2 shrink-0">
                    {/* User info */}
                    <AnimatePresence>
                        {(!collapsed || mobileOpen) && user && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="px-3 py-2"
                            >
                                <p className="text-xs font-medium text-white truncate">
                                    {user.full_name || "User"}
                                </p>
                                <p className="text-xs text-surface-500 truncate">{user.email}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-surface-400 hover:text-danger-400 hover:bg-danger-500/10 transition-all w-full"
                    >
                        <LogOut className="w-[18px] h-[18px] shrink-0" />
                        <AnimatePresence>
                            {(!collapsed || mobileOpen) && (
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="whitespace-nowrap"
                                >
                                    Log out
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </button>

                    {/* Collapse toggle (Desktop only) */}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="hidden md:flex items-center justify-center w-full py-2 rounded-xl text-surface-500 hover:text-surface-300 hover:bg-white/[0.04] transition-all"
                    >
                        {collapsed ? (
                            <ChevronRight className="w-4 h-4" />
                        ) : (
                            <ChevronLeft className="w-4 h-4" />
                        )}
                    </button>
                </div>
            </motion.aside>

            {/* Main Content */}
            <main className="flex-1 min-h-screen overflow-x-hidden">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
                    {children}
                </div>
            </main>
        </div>
    );
}
