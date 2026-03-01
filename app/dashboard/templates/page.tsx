"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, FileText, Edit3, Trash2, Save, X, Eye, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Template {
    id: string;
    name: string;
    message_text: string;
    is_default: boolean;
    created_at: string;
}

const VARIABLES = [
    { label: "Commenter Name", value: "{{commenter_name}}" },
    { label: "Post Caption", value: "{{post_caption}}" },
    { label: "Your Username", value: "{{your_username}}" },
];

export default function TemplatesPage() {
    const queryClient = useQueryClient();
    const supabase = createClient();

    const [showEditor, setShowEditor] = useState(false);
    const [editing, setEditing] = useState<Template | null>(null);
    const [name, setName] = useState("");
    const [msg, setMsg] = useState("");
    const [preview, setPreview] = useState(false);

    // Fetch templates
    const { data: templates = [] } = useQuery({
        queryKey: ["dm_templates"],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");
            const { data, error } = await supabase
                .from("dm_templates")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data;
        },
    });

    // Save template mutation
    const saveMutation = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");
            if (editing) {
                const { error } = await supabase.from("dm_templates").update({ name, message_text: msg, updated_at: new Date().toISOString() }).eq("id", editing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("dm_templates").insert({ user_id: user.id, name, message_text: msg });
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["dm_templates"] });
            setShowEditor(false); setEditing(null); setName(""); setMsg("");
        },
    });

    // Delete template mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("dm_templates").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["dm_templates"] });
        },
    });

    const save = () => {
        if (!name.trim() || !msg.trim()) return;
        saveMutation.mutate();
    };

    const del = (id: string) => deleteMutation.mutate(id);

    const open = (t?: Template) => {
        setEditing(t || null); setName(t?.name || ""); setMsg(t?.message_text || ""); setShowEditor(true); setPreview(false);
    };

    const renderPreview = (t: string) => t.replace(/\{\{commenter_name\}\}/g, "Alex").replace(/\{\{post_caption\}\}/g, "Check out our new product! 🚀").replace(/\{\{your_username\}\}/g, "yourbrand");

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">DM Templates</h1>
                    <p className="text-sm text-surface-400">Create message templates with dynamic variables</p>
                </div>
                <button onClick={() => open()} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-brand text-sm font-semibold text-white hover:opacity-90 transition-all shadow-lg shadow-brand-500/25">
                    <Plus className="w-4 h-4" /> New Template
                </button>
            </div>

            <AnimatePresence>
                {showEditor && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowEditor(false)}>
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg glass rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold text-white">{editing ? "Edit Template" : "New Template"}</h2>
                                <button onClick={() => setShowEditor(false)} className="text-surface-500 hover:text-surface-300"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-surface-300 mb-2">Template Name</label>
                                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Welcome Message" className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-surface-500 outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/25 transition-all text-sm" />
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-surface-300">Message</label>
                                        <button onClick={() => setPreview(!preview)} className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300"><Eye className="w-3 h-3" />{preview ? "Edit" : "Preview"}</button>
                                    </div>
                                    {preview ? (
                                        <div className="w-full min-h-[120px] px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-surface-200 leading-relaxed">{renderPreview(msg) || <span className="text-surface-500">Nothing to preview</span>}</div>
                                    ) : (
                                        <textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Hey {{commenter_name}}! Thanks for your comment 🙌..." rows={5} className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-surface-500 outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/25 transition-all text-sm resize-none" />
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-surface-500 mb-2">Insert Variable</label>
                                    <div className="flex flex-wrap gap-2">
                                        {VARIABLES.map((v) => (<button key={v.value} onClick={() => setMsg((p) => p + v.value)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-400 text-xs font-medium hover:bg-brand-500/20 transition-colors"><Sparkles className="w-3 h-3" />{v.label}</button>))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 pt-2">
                                    <button onClick={() => setShowEditor(false)} className="flex-1 py-3 rounded-xl border border-white/[0.08] text-sm font-medium text-surface-300 hover:bg-white/[0.04] transition-all">Cancel</button>
                                    <button onClick={save} disabled={!name.trim() || !msg.trim() || saveMutation.isPending} className="flex-1 py-3 rounded-xl gradient-brand text-sm font-semibold text-white hover:opacity-90 transition-all shadow-lg shadow-brand-500/25 disabled:opacity-50 flex items-center justify-center gap-2"><Save className="w-4 h-4" />{saveMutation.isPending ? "Saving..." : "Save Template"}</button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {templates.length === 0 ? (
                <div className="glass-light rounded-2xl p-6 text-center py-12">
                    <div className="w-14 h-14 rounded-2xl bg-surface-800 flex items-center justify-center mx-auto mb-4"><FileText className="w-7 h-7 text-surface-600" /></div>
                    <h3 className="font-semibold text-white mb-2">No templates yet</h3>
                    <p className="text-sm text-surface-500 max-w-xs mx-auto mb-5">Create your first DM template to start automating replies.</p>
                    <button onClick={() => open()} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-brand text-sm font-semibold text-white hover:opacity-90 transition-all shadow-lg shadow-brand-500/25"><Plus className="w-4 h-4" />Create Template</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map((t, i) => (
                        <motion.div key={t.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-light rounded-2xl p-5 group hover:bg-white/[0.05] transition-all">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-brand-500/15 text-brand-400 flex items-center justify-center"><FileText className="w-4 h-4" /></div>
                                    <h3 className="font-semibold text-white text-sm">{t.name}</h3>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => open(t)} className="p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-white/[0.08] transition-all"><Edit3 className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => del(t.id)} className="p-1.5 rounded-lg text-surface-400 hover:text-danger-400 hover:bg-danger-500/10 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                            </div>
                            <p className="text-sm text-surface-400 leading-relaxed line-clamp-3">{t.message_text}</p>
                            <p className="text-[10px] text-surface-600 mt-3">Created {new Date(t.created_at).toLocaleDateString()}</p>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
