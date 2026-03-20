"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export default function Hero() {
  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      <motion.div
        className="container mx-auto px-4 text-center relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="inline-flex items-center gap-2 rounded-full glass-card px-4 py-1.5 mb-6 text-sm text-muted-foreground">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>Powered by Base and x402 sessions</span>
        </motion.div>

        <motion.h1
          variants={itemVariants}
          className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight leading-tight mb-6"
        >
          Unlock Creator NFTs{" "}
          <br className="hidden sm:block" />
          <span className="gradient-text-hero">With Verified Payments</span>
        </motion.h1>

        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="#nfts">
            <button className="gradient-btn text-white font-semibold px-8 py-3.5 rounded-full text-base inline-flex items-center gap-2 group">
              Explore NFTs
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </Link>
          <Link href="/mint">
            <button className="gradient-btn-outline text-foreground font-semibold px-8 py-3.5 rounded-full text-base hover:bg-white/5 transition-colors">
              Create Paywall NFT
            </button>
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}

