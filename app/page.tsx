"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  MessageCircle,
  Zap,
  Users,
  ArrowRight,
  Instagram,
  Sparkles,
  Send,
  TrendingUp,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

export default function Home() {
  return (
    <div className="min-h-screen bg-surface-950 text-white overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-brand-600/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent-500/8 blur-[120px]" />
      </div>

      {/* Navbar */}
      <nav className="relative z-50 flex items-center justify-between px-6 md:px-12 py-5 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:shadow-brand-500/40 transition-shadow">
            <Send className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">InstaReply</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-5 py-2.5 text-sm font-medium text-surface-300 hover:text-white transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2.5 text-sm font-semibold rounded-xl gradient-brand hover:opacity-90 transition-opacity shadow-lg shadow-brand-500/25"
          >
            Get Started Free
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pt-20 pb-32">
        <motion.div
          className="text-center max-w-3xl mx-auto"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        >
          <motion.div
            variants={fadeUp}
            custom={0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-light text-sm text-surface-300 mb-8"
          >
            <Instagram className="w-4 h-4 text-accent-400" />
            <span>Powered by the Official Meta API</span>
            <Sparkles className="w-3.5 h-3.5 text-warning-400" />
          </motion.div>

          <motion.h1
            variants={fadeUp}
            custom={1}
            className="text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6"
          >
            Turn comments into{" "}
            <span className="gradient-text">conversations</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            custom={2}
            className="text-lg md:text-xl text-surface-300 max-w-xl mx-auto mb-10 leading-relaxed"
          >
            Automatically DM anyone who comments on your Instagram posts with
            personalized templates. Drive followers, engagement, and sales on
            autopilot.
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="flex items-center gap-2 px-8 py-4 text-base font-semibold rounded-2xl gradient-brand hover:opacity-90 transition-all shadow-xl shadow-brand-500/25 hover:shadow-brand-500/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              Start Free — No Card Needed
              <ArrowRight className="w-4.5 h-4.5" />
            </Link>
            <span className="text-sm text-surface-400">
              100 free DMs/month included
            </span>
          </motion.div>
        </motion.div>

        {/* How It Works Visual */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mt-24 max-w-4xl mx-auto"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: MessageCircle,
                step: "01",
                title: "Someone Comments",
                desc: "A user drops a comment on your Instagram post, reel, or story.",
                color: "brand",
              },
              {
                icon: Zap,
                step: "02",
                title: "Webhook Fires",
                desc: "Meta instantly notifies InstaReply via webhook. We match it to your automation.",
                color: "warning",
              },
              {
                icon: Send,
                step: "03",
                title: "DM Delivered",
                desc: "A personalized DM lands in their inbox — driving follows, links, or sales.",
                color: "accent",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + i * 0.15, duration: 0.6 }}
                className="relative group"
              >
                <div className="glass-light rounded-2xl p-6 h-full hover:bg-white/[0.05] transition-all duration-300">
                  <span className="text-xs font-bold text-surface-500 tracking-widest">
                    STEP {item.step}
                  </span>
                  <div
                    className={`w-12 h-12 rounded-xl mt-4 mb-4 flex items-center justify-center ${item.color === "brand"
                      ? "bg-brand-500/15 text-brand-400"
                      : item.color === "warning"
                        ? "bg-warning-400/15 text-warning-400"
                        : "bg-accent-500/15 text-accent-400"
                      }`}
                  >
                    <item.icon className="w-5.5 h-5.5" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-surface-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Feature Cards */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pb-32">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything you need to{" "}
            <span className="gradient-text">automate engagement</span>
          </h2>
          <p className="text-surface-400 max-w-lg mx-auto">
            Built on the official Meta API. Enterprise-grade reliability, zero risk to your account.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              icon: Sparkles,
              title: "Template Builder",
              desc: "Create beautiful DM templates with dynamic variables like {{commenter_name}}.",
            },
            {
              icon: Instagram,
              title: "Keyword Triggers",
              desc: "Only auto-reply when comments match specific keywords — stay relevant.",
            },
            {
              icon: TrendingUp,
              title: "Real-Time Analytics",
              desc: "Track DMs sent, open rates, and engagement growth per post.",
            },
            {
              icon: Users,
              title: "Contact Growth",
              desc: "Build your contact list automatically from engaged commenters.",
            },
            {
              icon: Zap,
              title: "Instant Delivery",
              desc: "DMs fire in under 2 seconds — while the commenter is still online.",
            },
            {
              icon: MessageCircle,
              title: "Multi-Post Rules",
              desc: "Set global rules or per-post automations. Full flexibility.",
            },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="glass-light rounded-2xl p-6 hover:bg-white/[0.05] transition-all duration-300 group cursor-default"
            >
              <div className="w-10 h-10 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center mb-4 group-hover:bg-brand-500/20 transition-colors">
                <feature.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base mb-2">{feature.title}</h3>
              <p className="text-sm text-surface-400 leading-relaxed">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 md:px-12 pb-32">
        <div className="glass rounded-3xl p-10 md:p-14 text-center glow-brand">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to turn comments into customers?
          </h2>
          <p className="text-surface-400 mb-8 max-w-md mx-auto">
            Set up in under 5 minutes. Connect your Instagram, build a template, and let InstaReply handle the rest.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold rounded-2xl gradient-brand hover:opacity-90 transition-all shadow-xl shadow-brand-500/25"
          >
            Get Started Free
            <ArrowRight className="w-4.5 h-4.5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] py-8">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center">
              <Send className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold">InstaReply</span>
          </div>
          <p className="text-xs text-surface-500">
            © {new Date().getFullYear()} InstaReply. Built with the official Meta Instagram API.
          </p>
        </div>
      </footer>
    </div>
  );
}
