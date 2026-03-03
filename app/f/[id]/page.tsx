"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ChevronLeft, Instagram, ExternalLink, CheckCircle2 } from "lucide-react";

interface FlowStep {
    id: string;
    message_text: string;
    buttons: any[];
    step_index: number;
}

interface ChatMessage {
    id: string;
    text: string;
    sender: "bot" | "user";
    buttons?: any[];
}

export default function ExternalFlowPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const flowId = params.id as string;
    const supabase = createClient();

    const [flowName, setFlowName] = useState("Conversation");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [allSteps, setAllSteps] = useState<FlowStep[]>([]);
    const [loading, setLoading] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial Fetch
    useEffect(() => {
        async function fetchFlow() {
            const { data: flow } = await supabase.from("conversation_flows").select("name").eq("id", flowId).single();
            if (flow) setFlowName(flow.name);

            const { data: steps } = await supabase.from("flow_steps").select("*").eq("flow_id", flowId).order("step_index", { ascending: true });

            if (steps && steps.length > 0) {
                setAllSteps(steps);
                // Start with first step
                addBotMessage(steps[0]);
            }
            setLoading(false);
        }
        fetchFlow();
    }, [flowId]);

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const addBotMessage = (step: FlowStep) => {
        setIsTyping(true);
        setTimeout(() => {
            setIsTyping(false);
            const newMsg: ChatMessage = {
                id: Math.random().toString(),
                text: step.message_text,
                sender: "bot",
                buttons: step.buttons
            };
            setMessages(prev => [...prev, newMsg]);
        }, 1000);
    };

    const handleButtonClick = (button: any) => {
        // 1. Add user's choice to chat
        const userMsg: ChatMessage = {
            id: Math.random().toString(),
            text: button.title,
            sender: "user"
        };
        setMessages(prev => [...prev.map(m => ({ ...m, buttons: [] })), userMsg]);

        // 2. Process action
        if (button.type === "url") {
            window.open(button.url, "_blank");
        } else if (button.next_step_id) {
            const nextStep = allSteps.find(s => s.id === button.next_step_id);
            if (nextStep) {
                addBotMessage(nextStep);
            }
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black">
                <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[100dvh] bg-black text-white font-sans overflow-hidden">
            {/* Header */}
            <div className="px-4 h-16 border-b border-white/10 flex items-center justify-between bg-black/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] p-[2px]">
                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                            <Instagram className="w-5 h-5 text-white" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-sm font-bold truncate max-w-[150px]">{flowName}</h1>
                        <p className="text-[10px] text-surface-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-success-500 rounded-full animate-pulse"></span>
                            Active now
                        </p>
                    </div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-brand-500" />
            </div>

            {/* Chat Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scroll-smooth">
                <AnimatePresence>
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.sender === "user"
                                        ? "bg-brand-500 text-white rounded-tr-none"
                                        : "bg-white/[0.08] text-white rounded-tl-none border border-white/[0.05]"
                                    } shadow-lg`}
                            >
                                {msg.text}
                            </motion.div>

                            {/* Buttons */}
                            {msg.sender === "bot" && msg.buttons && msg.buttons.length > 0 && (
                                <div className="mt-3 flex flex-col gap-2 w-full max-w-[85%]">
                                    {msg.buttons.map((btn, idx) => (
                                        <motion.button
                                            key={idx}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.2 + (idx * 0.1) }}
                                            onClick={() => handleButtonClick(btn)}
                                            className="w-full py-3 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm font-semibold hover:bg-white/[0.08] transition-all flex items-center justify-between group"
                                        >
                                            <span className="text-white group-hover:text-glow-brand transition-all">{btn.title}</span>
                                            {btn.type === "url" ? <ExternalLink className="w-3.5 h-3.5 text-surface-500" /> : <Send className="w-3.5 h-3.5 text-brand-500" />}
                                        </motion.button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                    {isTyping && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-1.5 p-3 rounded-2xl bg-white/[0.08] w-fit">
                            <span className="w-1.5 h-1.5 bg-surface-500 rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-surface-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                            <span className="w-1.5 h-1.5 bg-surface-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer / Branding */}
            <div className="p-4 border-t border-white/10 bg-black/50 backdrop-blur-md">
                <div className="flex items-center gap-2 justify-center py-2 opacity-50">
                    <span className="text-[10px] text-surface-400">Powered by</span>
                    <span className="text-[10px] font-bold tracking-tight bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent italic">InstaReply</span>
                </div>
            </div>
        </div>
    );
}
