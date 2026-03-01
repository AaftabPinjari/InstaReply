"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Settings, Save, Loader2, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
    const queryClient = useQueryClient();
    const supabase = createClient();

    const [name, setName] = useState("");
    const [msg, setMsg] = useState("");

    const { data: userProfile } = useQuery({
        queryKey: ["user_profile"],
        queryFn: async () => {
            const { data } = await supabase.auth.getUser();
            if (data.user) {
                setName(data.user.user_metadata?.full_name || "");
            }
            return data.user;
        }
    });

    const saveMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["user_profile"] });
            setMsg("Settings saved!");
            setTimeout(() => setMsg(""), 3000);
        },
        onError: (error) => {
            setMsg(error.message);
            setTimeout(() => setMsg(""), 3000);
        }
    });

    const save = () => saveMutation.mutate();

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
                <p className="text-sm text-surface-400">Manage your account</p>
            </div>

            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-light rounded-2xl p-6 max-w-lg">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center">
                        <User className="w-5 h-5 text-brand-400" />
                    </div>
                    <h2 className="font-semibold text-white">Profile</h2>
                </div>

                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-surface-300 mb-2">Full Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white outline-none focus:border-brand-500/50 text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-surface-300 mb-2">Email</label>
                        <input type="email" value={userProfile?.email || ""} disabled className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-surface-500 outline-none text-sm cursor-not-allowed" />
                    </div>

                    {msg && <p className={`text-sm ${msg.includes("saved") ? "text-success-400" : "text-danger-400"}`}>{msg}</p>}

                    <button onClick={save} disabled={saveMutation.isPending} className="flex items-center gap-2 px-5 py-3 rounded-xl gradient-brand text-sm font-semibold text-white hover:opacity-90 shadow-lg shadow-brand-500/25 disabled:opacity-50">
                        {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saveMutation.isPending ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
