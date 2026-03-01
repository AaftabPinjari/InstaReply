"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Zap, Trash2, X, ToggleLeft, ToggleRight, Tag, Hash } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Automation {
    id: string;
    media_id: string | null;
    media_url: string | null;
    trigger_keywords: string[] | null;
    is_active: boolean;
    created_at: string;
    template: { id: string; name: string } | null;
}

interface Template { id: string; name: string; }

export default function AutomationsPage() {
    const queryClient = useQueryClient();
    const supabase = createClient();

    const [showModal, setShowModal] = useState(false);
    const [templateId, setTemplateId] = useState("");
    const [keywords, setKeywords] = useState("");
    const [mediaId, setMediaId] = useState("");

    const { data: autos = [] } = useQuery({
        queryKey: ["automations"],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");
            const { data, error } = await supabase.from("automations").select("*, template:dm_templates(id, name)").eq("user_id", user.id).order("created_at", { ascending: false });
            if (error) throw error;
            return data;
        },
    });

    const { data: templates = [] } = useQuery({
        queryKey: ["dm_templates_selector"],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");
            const { data, error } = await supabase.from("dm_templates").select("id, name").eq("user_id", user.id);
            if (error) throw error;
            return data;
        }
    });

    const saveMutation = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");
            const kw = keywords.split(",").map(k => k.trim()).filter(Boolean);
            const { error } = await supabase.from("automations").insert({
                user_id: user.id,
                template_id: templateId,
                media_id: mediaId || null,
                trigger_keywords: kw.length > 0 ? kw : null,
                is_active: true,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["automations"] });
            setShowModal(false); setTemplateId(""); setKeywords(""); setMediaId("");
        }
    });

    const toggleMutation = useMutation({
        mutationFn: async ({ id, current }: { id: string, current: boolean }) => {
            const { error } = await supabase.from("automations").update({ is_active: !current }).eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["automations"] });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("automations").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["automations"] });
        }
    });

    const save = () => { if (templateId) saveMutation.mutate(); };
    const toggle = (id: string, current: boolean) => toggleMutation.mutate({ id, current });
    const del = (id: string) => deleteMutation.mutate(id);

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Automations</h1>
                    <p className="text-sm text-surface-400">Set up comment-to-DM rules for your posts</p>
                </div>
                <button onClick={() => setShowModal(true)} className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl gradient-brand text-sm font-semibold text-white hover:opacity-90 transition-all shadow-lg shadow-brand-500/25 sm:w-auto">
                    <Plus className="w-4 h-4" />New <span className="sm:hidden lg:inline">Automation</span>
                </button>
            </div>

            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4" onClick={() => setShowModal(false)}>
                        <motion.div
                            initial={{ opacity: 0, y: "100%" }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md glass rounded-t-3xl sm:rounded-2xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-xl font-bold text-white">New Automation</h2>
                                <button onClick={() => setShowModal(false)} className="p-2 -mr-2 text-surface-500 hover:text-surface-300 transition-colors"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-surface-300 mb-2.5">DM Template</label>
                                    <div className="relative">
                                        <select
                                            value={templateId}
                                            onChange={(e) => setTemplateId(e.target.value)}
                                            className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white outline-none focus:border-brand-500/50 text-sm appearance-none transition-all"
                                        >
                                            <option value="" className="bg-surface-900">Select a template...</option>
                                            {templates.map(t => <option key={t.id} value={t.id} className="bg-surface-900">{t.name}</option>)}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-surface-500 text-xs">▼</div>
                                    </div>
                                    {templates.length === 0 && (
                                        <p className="text-xs text-warning-400 mt-2 flex items-center gap-1">
                                            <span>⚠️</span> Create a template first!
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-surface-300 mb-2.5">
                                        Media ID <span className="text-surface-500 font-normal">(optional)</span>
                                    </label>
                                    <input type="text" value={mediaId} onChange={(e) => setMediaId(e.target.value)} placeholder="Leave blank for all posts" className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-surface-500 outline-none focus:border-brand-500/50 text-sm transition-all" />
                                    <p className="text-xs text-surface-600 mt-2">Target a specific post. Blank = applies to all posts.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-surface-300 mb-2.5">
                                        Keyword Triggers <span className="text-surface-500 font-normal">(optional)</span>
                                    </label>
                                    <input type="text" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="e.g. price, info, link" className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-surface-500 outline-none focus:border-brand-500/50 text-sm transition-all" />
                                    <p className="text-xs text-surface-600 mt-2">Comma-separated. Only reply when comment contains these words.</p>
                                </div>
                                <div className="flex flex-col sm:flex-row items-center gap-3 pt-4">
                                    <button onClick={() => setShowModal(false)} className="w-full sm:flex-1 py-3.5 rounded-xl border border-white/[0.08] text-sm font-semibold text-surface-300 hover:bg-white/[0.04] transition-all">Cancel</button>
                                    <button onClick={save} disabled={!templateId || saveMutation.isPending} className="w-full sm:flex-1 py-3.5 rounded-xl gradient-brand text-sm font-bold text-white hover:opacity-90 shadow-lg shadow-brand-500/25 disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
                                        <Plus className="w-4 h-4" />
                                        {saveMutation.isPending ? "Creating..." : "Create Automation"}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {autos.length === 0 ? (
                <div className="glass-light rounded-2xl p-6 text-center py-12">
                    <div className="w-14 h-14 rounded-2xl bg-surface-800 flex items-center justify-center mx-auto mb-4"><Zap className="w-7 h-7 text-surface-600" /></div>
                    <h3 className="font-semibold text-white mb-2">No automations yet</h3>
                    <p className="text-sm text-surface-500 max-w-xs mx-auto mb-5">Create an automation to start auto-replying to comments with DMs.</p>
                    <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-brand text-sm font-semibold text-white hover:opacity-90 shadow-lg shadow-brand-500/25"><Plus className="w-4 h-4" />Create Automation</button>
                </div>
            ) : (
                <div className="space-y-3">
                    {autos.map((a, i) => (
                        <motion.div key={a.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-light rounded-2xl p-5 flex items-center gap-4">
                            <button onClick={() => toggle(a.id, a.is_active)} className="shrink-0">
                                {a.is_active ? <ToggleRight className="w-8 h-8 text-success-400" /> : <ToggleLeft className="w-8 h-8 text-surface-600" />}
                            </button>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-semibold text-white">{a.template?.name || "Unknown template"}</span>
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${a.is_active ? "bg-success-500/15 text-success-400" : "bg-surface-700/50 text-surface-500"}`}>{a.is_active ? "Active" : "Paused"}</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-surface-500">
                                    <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{a.media_id ? `Post ${a.media_id.slice(0, 8)}...` : "All posts"}</span>
                                    {a.trigger_keywords && a.trigger_keywords.length > 0 && (
                                        <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{a.trigger_keywords.join(", ")}</span>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => del(a.id)} className="p-2 rounded-lg text-surface-500 hover:text-danger-400 hover:bg-danger-500/10 transition-all shrink-0"><Trash2 className="w-4 h-4" /></button>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
