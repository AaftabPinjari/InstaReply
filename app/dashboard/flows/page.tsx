"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    Workflow,
    Edit3,
    Trash2,
    Save,
    X,
    ChevronRight,
    MessageSquare,
    Circle,
    ChevronDown,
    Link as LinkIcon,
    MousePointer2,
    CheckCircle2,
    ExternalLink
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Flow {
    id: string;
    name: string;
    created_at: string;
    steps?: FlowStep[];
}

interface FlowStep {
    id: string;
    flow_id: string;
    step_order: number;
    message_text: string;
    is_start: boolean;
    buttons: FlowButton[];
}

interface FlowButton {
    type: "quick_reply" | "url" | "postback";
    title: string;
    url?: string;
    next_step_id: string | null;
}

export default function FlowsPage() {
    const queryClient = useQueryClient();
    const supabase = createClient();

    const [showEditor, setShowEditor] = useState(false);
    const [editingFlow, setEditingFlow] = useState<Flow | null>(null);
    const [flowName, setFlowName] = useState("");
    const [steps, setSteps] = useState<Partial<FlowStep>[]>([]);
    const [activeStepIndex, setActiveStepIndex] = useState(0);

    // Fetch Flows
    const { data: flows = [], isLoading } = useQuery({
        queryKey: ["conversation_flows"],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");
            const { data, error } = await supabase
                .from("conversation_flows")
                .select("*, steps:flow_steps(*)")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data as Flow[];
        },
    });

    const saveMutation = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            let flowId = editingFlow?.id;

            // 1. Save/Update Flow
            if (flowId) {
                await supabase.from("conversation_flows").update({ name: flowName }).eq("id", flowId);
            } else {
                const { data, error } = await supabase
                    .from("conversation_flows")
                    .insert({ user_id: user.id, name: flowName })
                    .select()
                    .single();
                if (error) throw error;
                flowId = data.id;
            }

            // 2. Save Steps
            // Note: Since IDs change on every save in this simplified editor, we link by index during the save process
            if (editingFlow?.id) {
                await supabase.from("flow_steps").delete().eq("flow_id", flowId);
            }

            // Map UI steps to DB-ready steps
            // First pass: Insert steps and get their generated IDs
            const stepsToInsert = steps.map((s, idx) => ({
                flow_id: flowId,
                message_text: s.message_text,
                is_start: idx === 0,
                step_order: idx,
                buttons: s.buttons || []
            }));

            const { data: insertedSteps, error: stepError } = await supabase
                .from("flow_steps")
                .insert(stepsToInsert)
                .select();

            if (stepError) throw stepError;

            // Second pass: Update buttons to use the real next_step_ids
            // For now, next_step_id in the UI is the index. We map index -> real ID.
            if (insertedSteps) {
                for (const step of insertedSteps) {
                    const originalIndex = step.step_order;
                    const originalButtons = steps[originalIndex].buttons || [];

                    const updatedButtons = originalButtons.map(btn => {
                        if (btn.type === "quick_reply" && btn.next_step_id !== null) {
                            const nextStepIndex = parseInt(btn.next_step_id);
                            const realNextStep = insertedSteps.find(s => s.step_order === nextStepIndex);
                            return { ...btn, next_step_id: realNextStep?.id || null };
                        }
                        return btn;
                    });

                    await supabase.from("flow_steps").update({ buttons: updatedButtons }).eq("id", step.id);
                }
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["conversation_flows"] });
            setShowEditor(false);
            resetEditor();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await supabase.from("conversation_flows").delete().eq("id", id);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conversation_flows"] })
    });

    const resetEditor = () => {
        setEditingFlow(null);
        setFlowName("");
        setSteps([]);
        setActiveStepIndex(0);
    };

    const openEditor = (f?: Flow) => {
        if (f) {
            setEditingFlow(f);
            setFlowName(f.name);
            // Sort steps by order
            const sortedSteps = [...(f.steps || [])].sort((a, b) => a.step_order - b.step_order);

            // Map real next_step_ids back to indices for the UI
            const uiSteps = sortedSteps.map(s => ({
                ...s,
                buttons: s.buttons.map(b => ({
                    ...b,
                    next_step_id: b.next_step_id ? sortedSteps.findIndex(ss => ss.id === b.next_step_id).toString() : null
                }))
            }));

            setSteps(uiSteps);
        } else {
            resetEditor();
            setSteps([{ message_text: "", is_start: true, buttons: [] }]);
        }
        setShowEditor(true);
    };

    const addStep = () => {
        setSteps([...steps, { message_text: "", is_start: false, buttons: [] }]);
        setActiveStepIndex(steps.length);
    };

    const removeStep = (index: number) => {
        const newSteps = [...steps];
        newSteps.splice(index, 1);
        setSteps(newSteps);
        if (activeStepIndex >= newSteps.length) {
            setActiveStepIndex(Math.max(0, newSteps.length - 1));
        }
    };

    const updateStep = (index: number, data: Partial<FlowStep>) => {
        const newSteps = [...steps];
        newSteps[index] = { ...newSteps[index], ...data };
        setSteps(newSteps);
    };

    const addButton = (stepIndex: number) => {
        const newSteps = [...steps];
        const buttons = newSteps[stepIndex].buttons || [];
        newSteps[stepIndex].buttons = [...buttons, { type: "quick_reply", title: "New Button", next_step_id: null }];
        setSteps(newSteps);
    };

    const updateButton = (stepIndex: number, buttonIndex: number, data: Partial<FlowButton>) => {
        const newSteps = [...steps];
        const buttons = [...(newSteps[stepIndex].buttons || [])];
        buttons[buttonIndex] = { ...buttons[buttonIndex], ...data };
        newSteps[stepIndex].buttons = buttons;
        setSteps(newSteps);
    };

    const removeButton = (stepIndex: number, buttonIndex: number) => {
        const newSteps = [...steps];
        const buttons = [...(newSteps[stepIndex].buttons || [])];
        buttons.splice(buttonIndex, 1);
        newSteps[stepIndex].buttons = buttons;
        setSteps(newSteps);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Conversation Flows</h1>
                    <p className="text-sm text-surface-400">Build interactive multi-step chatbots</p>
                </div>
                <button onClick={() => openEditor()} className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl gradient-brand text-sm font-semibold text-white hover:opacity-90 transition-all shadow-lg shadow-brand-500/25">
                    <Plus className="w-4 h-4" /> New Flow
                </button>
            </div>

            {/* Flow List */}
            {isLoading ? (
                <div className="flex justify-center py-20">
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" />
                </div>
            ) : flows.length === 0 ? (
                <div className="glass-light rounded-2xl p-12 text-center border border-white/[0.05]">
                    <div className="w-16 h-16 rounded-2xl bg-surface-800 flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <Workflow className="w-8 h-8 text-surface-600" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No flows yet</h3>
                    <p className="text-sm text-surface-500 max-w-sm mx-auto mb-8">Create your first conversation flow to automate complex customer interactions.</p>
                    <button onClick={() => openEditor()} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-brand text-sm font-bold text-white hover:opacity-90 transition-all shadow-lg shadow-brand-500/25">
                        <Plus className="w-4 h-4" /> Build My First Flow
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {flows.map((f, i) => (
                        <motion.div
                            key={f.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="glass-light rounded-2xl overflow-hidden group hover:bg-white/[0.05] transition-all border border-white/[0.05] hover:border-brand-500/30 shadow-xl"
                        >
                            <div className="p-5">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-brand-500/15 text-brand-400 flex items-center justify-center shadow-inner">
                                            <Workflow className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-base group-hover:text-brand-400 transition-colors truncate max-w-[140px]">{f.name}</h3>
                                            <p className="text-[10px] text-surface-500 font-medium uppercase tracking-wider">{f.steps?.length || 0} Steps</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                        <button
                                            onClick={() => {
                                                const url = `${window.location.origin}/f/${f.id}`;
                                                navigator.clipboard.writeText(url);
                                                alert("Link copied to clipboard!");
                                            }}
                                            title="Copy External Link"
                                            className="p-2 rounded-lg text-surface-400 hover:text-brand-400 hover:bg-brand-500/10 transition-all"
                                        >
                                            <LinkIcon className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => openEditor(f)} className="p-2 rounded-lg text-surface-400 hover:text-white hover:bg-white/[0.08] transition-all">
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => { if (confirm("Are you sure?")) deleteMutation.mutate(f.id) }} className="p-2 rounded-lg text-surface-400 hover:text-danger-400 hover:bg-danger-500/10 transition-all">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {f.steps && f.steps.length > 0 && (
                                    <div className="space-y-2 mt-2">
                                        <p className="text-xs text-surface-400 font-medium line-clamp-2 italic">
                                            "{f.steps.find(s => s.is_start)?.message_text}"
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div className="bg-white/[0.02] px-5 py-3 border-t border-white/[0.05] flex items-center justify-between">
                                <span className="text-[10px] text-surface-600 font-medium tracking-tighter uppercase">Created {new Date(f.created_at).toLocaleDateString()}</span>
                                <ChevronRight className="w-4 h-4 text-surface-700 group-hover:text-brand-500 transition-colors group-hover:translate-x-1" />
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Full Screen Flow Editor */}
            <AnimatePresence>
                {showEditor && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex flex-col bg-surface-950/98 backdrop-blur-xl"
                    >
                        {/* Header */}
                        <div className="h-20 border-b border-white/[0.08] flex items-center justify-between px-6 sm:px-10 shrink-0">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setShowEditor(false)} className="p-2.5 rounded-xl hover:bg-white/[0.05] text-surface-400 hover:text-white transition-all">
                                    <X className="w-6 h-6" />
                                </button>
                                <div className="h-8 w-px bg-white/[0.08]" />
                                <div className="flex flex-col">
                                    <input
                                        type="text"
                                        value={flowName}
                                        onChange={(e) => setFlowName(e.target.value)}
                                        placeholder="Enter flow name..."
                                        className="bg-transparent border-none text-xl font-bold text-white focus:outline-none placeholder:text-surface-700 w-full max-w-md"
                                    />
                                    <span className="text-[10px] text-brand-500 font-bold uppercase tracking-widest mt-0.5">Flow Builder</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {editingFlow && (
                                    <button
                                        onClick={() => {
                                            const url = `${window.location.origin}/f/${editingFlow.id}`;
                                            window.open(url, "_blank");
                                        }}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.08] hover:bg-white/[0.04] text-sm font-semibold text-white transition-all"
                                    >
                                        <ExternalLink className="w-4 h-4" /> Preview
                                    </button>
                                )}
                                <button
                                    onClick={() => saveMutation.mutate()}
                                    disabled={!flowName.trim() || steps.length === 0 || saveMutation.isPending}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-brand text-sm font-bold text-white hover:opacity-90 transition-all shadow-lg shadow-brand-500/25 disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    {saveMutation.isPending ? "Saving..." : "Save Flow"}
                                </button>
                            </div>
                        </div>

                        {/* Editor Body */}
                        <div className="flex-1 flex overflow-hidden lg:flex-row flex-col">
                            {/* Step Sidebar */}
                            <div className="w-full lg:w-72 border-r border-white/[0.08] flex flex-col shrink-0 bg-surface-950/50">
                                <div className="p-4 flex items-center justify-between border-b border-white/[0.05]">
                                    <h3 className="text-xs font-bold text-surface-500 uppercase tracking-widest">Flow Steps</h3>
                                    <button onClick={addStep} className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 transition-all">
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 space-y-2 shadow-inner">
                                    {steps.map((step, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setActiveStepIndex(idx)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all group ${activeStepIndex === idx
                                                ? "bg-brand-500/15 border border-brand-500/30 text-white shadow-lg shadow-brand-500/5"
                                                : "hover:bg-white/[0.04] text-surface-400"
                                                }`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${activeStepIndex === idx ? "bg-brand-500 text-white" : "bg-surface-800 text-surface-500"
                                                }`}>
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 text-left min-w-0">
                                                <p className="text-sm font-semibold truncate leading-none mb-1">
                                                    {step.message_text || (idx === 0 ? "Start Step" : `Step ${idx + 1}`)}
                                                </p>
                                                {idx === 0 && <p className="text-[9px] text-brand-500 font-bold uppercase tracking-tight">Entry Point</p>}
                                            </div>
                                            {steps.length > 1 && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); removeStep(idx); }}
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-danger-500/20 hover:text-danger-400 transition-all"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Step Canvas */}
                            <div className="flex-1 overflow-hidden flex flex-col pt-4">
                                {steps[activeStepIndex] ? (
                                    <div className="flex-1 overflow-y-auto p-6 lg:p-12">
                                        <div className="max-w-3xl mx-auto space-y-10">
                                            {/* Message Content */}
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center shadow-inner">
                                                        <MessageSquare className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-lg font-bold text-white">Step {activeStepIndex + 1}: Message</h4>
                                                        <p className="text-xs text-surface-500">What the bot will say in this step</p>
                                                    </div>
                                                </div>
                                                <textarea
                                                    value={steps[activeStepIndex].message_text}
                                                    onChange={(e) => updateStep(activeStepIndex, { message_text: e.target.value })}
                                                    rows={6}
                                                    placeholder="Hey there! How can I help you today?"
                                                    className="w-full px-6 py-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-surface-700 outline-none focus:border-brand-500/50 focus:ring-4 focus:ring-brand-500/5 transition-all text-base resize-none shadow-2xl"
                                                />
                                            </div>

                                            {/* Buttons Section */}
                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-2xl bg-accent-500/10 text-accent-400 flex items-center justify-center shadow-inner">
                                                            <MousePointer2 className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-lg font-bold text-white">Interactive Buttons</h4>
                                                            <p className="text-xs text-surface-500">Add options for users to click</p>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => addButton(activeStepIndex)} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.08] hover:bg-white/[0.04] text-sm font-semibold text-white transition-all">
                                                        <Plus className="w-4 h-4" /> Add Button
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {steps[activeStepIndex].buttons?.map((btn, bIdx) => (
                                                        <div key={bIdx} className="glass p-5 rounded-2xl border border-white/[0.08] space-y-4 relative group/btn">
                                                            <button
                                                                onClick={() => removeButton(activeStepIndex, bIdx)}
                                                                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-danger-500/10 text-surface-600 hover:text-danger-400 opacity-0 group-hover/btn:opacity-100 transition-all"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>

                                                            <div className="space-y-3">
                                                                <div>
                                                                    <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest block mb-1.5 font-mono">Label</label>
                                                                    <input
                                                                        type="text"
                                                                        value={btn.title}
                                                                        onChange={(e) => updateButton(activeStepIndex, bIdx, { title: e.target.value })}
                                                                        className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-500/50"
                                                                    />
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div>
                                                                        <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest block mb-1.5 font-mono">Action</label>
                                                                        <select
                                                                            value={btn.type}
                                                                            onChange={(e) => updateButton(activeStepIndex, bIdx, { type: e.target.value as any })}
                                                                            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none appearance-none"
                                                                        >
                                                                            <option value="quick_reply" className="bg-surface-900">Next Step</option>
                                                                            <option value="url" className="bg-surface-900">Visit URL</option>
                                                                        </select>
                                                                    </div>
                                                                    {btn.type === "url" ? (
                                                                        <div>
                                                                            <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest block mb-1.5 font-mono">URL</label>
                                                                            <input
                                                                                type="url"
                                                                                value={btn.url || ""}
                                                                                placeholder="https://..."
                                                                                onChange={(e) => updateButton(activeStepIndex, bIdx, { url: e.target.value })}
                                                                                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-500/50"
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        <div>
                                                                            <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest block mb-1.5 font-mono">Target</label>
                                                                            <select
                                                                                value={btn.next_step_id || ""}
                                                                                onChange={(e) => updateButton(activeStepIndex, bIdx, { next_step_id: e.target.value })}
                                                                                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none appearance-none"
                                                                            >
                                                                                <option value="" className="bg-surface-900">Select...</option>
                                                                                {steps.map((_, i) => i !== activeStepIndex && (
                                                                                    <option key={i} value={i} className="bg-surface-900">Step {i + 1}</option>
                                                                                ))}
                                                                            </select>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {(!steps[activeStepIndex].buttons || steps[activeStepIndex].buttons.length === 0) && (
                                                        <div className="col-span-full py-8 border-2 border-dashed border-white/[0.05] rounded-2xl flex flex-col items-center justify-center text-surface-600">
                                                            <MousePointer2 className="w-6 h-6 mb-2 opacity-20" />
                                                            <p className="text-sm">No buttons added to this step</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-surface-600">
                                        <Circle className="w-12 h-12 mb-4 opacity-10 animate-pulse" />
                                        <p className="text-lg font-medium">Select a step to start building</p>
                                    </div>
                                )}

                                {/* Simple Step Navigation Footer */}
                                <div className="h-16 border-t border-white/[0.08] px-8 flex items-center justify-between bg-surface-950/80 shrink-0 backdrop-blur-md">
                                    <button
                                        type="button"
                                        disabled={activeStepIndex === 0}
                                        onClick={() => setActiveStepIndex(p => p - 1)}
                                        className="flex items-center gap-2 text-sm font-semibold text-surface-400 hover:text-white disabled:opacity-30 transition-all"
                                    >
                                        <ChevronRight className="w-4 h-4 rotate-180" /> Previous
                                    </button>
                                    <div className="flex items-center gap-1.5 text-xs text-surface-600 font-bold tracking-widest uppercase font-mono">
                                        Step {activeStepIndex + 1} <span className="text-surface-800">/</span> {steps.length}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => activeStepIndex === steps.length - 1 ? addStep() : setActiveStepIndex(p => p + 1)}
                                        className="flex items-center gap-2 text-sm font-semibold text-brand-400 hover:text-brand-300 transition-all font-glow-brand"
                                    >
                                        {activeStepIndex === steps.length - 1 ? "Add Final Step" : "Next Step"} <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
