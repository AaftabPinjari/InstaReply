"use client";

import { motion } from "framer-motion";
import { BookOpen, ExternalLink, CheckCircle2, ArrowRight } from "lucide-react";

const steps = [
    {
        title: "Create a Meta Developer Account",
        desc: "Go to developers.facebook.com and create a developer account if you don't have one.",
        link: "https://developers.facebook.com/",
        linkLabel: "Meta for Developers",
    },
    {
        title: "Create a New App",
        desc: 'Click "Create App" → select "Other" use case → choose "Business" app type → give it a name.',
        link: "https://developers.facebook.com/apps/",
        linkLabel: "App Dashboard",
    },
    {
        title: 'Add the "Instagram" Product',
        desc: 'In your app dashboard, click "Add Product" → find "Instagram" → click "Set Up". Choose "API Setup with Instagram Login".',
    },
    {
        title: "Request Required Permissions",
        desc: "Under Instagram > Permissions, request: instagram_business_basic, instagram_business_manage_messages, instagram_business_manage_comments.",
    },
    {
        title: "Configure OAuth Redirect",
        desc: "Under Instagram > API Setup, add your redirect URI. For local development use ngrok or similar.",
    },
    {
        title: 'Add the "Webhooks" Product',
        desc: 'Click "Add Product" → "Webhooks" → "Set Up". Under Instagram subscriptions, subscribe to the "comments" field.',
    },
    {
        title: "Set Environment Variables",
        desc: "Add META_APP_ID, META_APP_SECRET, META_WEBHOOK_VERIFY_TOKEN, and NEXT_PUBLIC_META_APP_ID to your .env.local file.",
    },
    {
        title: "Connect Your Instagram Account",
        desc: 'Go to the Accounts page in InstaReply and click "Connect Instagram". Authorize the app.',
    },
    {
        title: "Create a DM Template",
        desc: "Build a template with personalized variables like {{commenter_name}}.",
    },
    {
        title: "Set Up an Automation",
        desc: "Create an automation rule that links a template to your posts. Add keyword triggers if needed.",
    },
];

export default function SetupGuidePage() {
    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white mb-1">Setup Guide</h1>
                <p className="text-sm text-surface-400">Step-by-step instructions to get InstaReply running</p>
            </div>

            <div className="glass-light rounded-2xl p-6 md:p-8">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-brand-400" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-white">Complete Setup Checklist</h2>
                        <p className="text-xs text-surface-500">Follow these steps in order</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {steps.map((step, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex gap-4 group">
                            <div className="flex flex-col items-center">
                                <div className="w-8 h-8 rounded-full bg-brand-500/15 text-brand-400 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                                {i < steps.length - 1 && <div className="w-px flex-1 bg-white/[0.06] mt-2" />}
                            </div>
                            <div className="pb-6 flex-1">
                                <h3 className="text-sm font-semibold text-white mb-1">{step.title}</h3>
                                <p className="text-sm text-surface-400 leading-relaxed mb-2">{step.desc}</p>
                                {step.link && (
                                    <a href={step.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors">
                                        {step.linkLabel} <ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
