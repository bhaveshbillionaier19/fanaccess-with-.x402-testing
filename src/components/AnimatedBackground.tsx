"use client";

import { motion } from "framer-motion";

const orbs = [
  {
    className: "w-[500px] h-[500px] bg-purple-600/20 top-[-10%] left-[-5%]",
    duration: 20,
    delay: 0,
  },
  {
    className: "w-[400px] h-[400px] bg-cyan-500/15 top-[40%] right-[-8%]",
    duration: 25,
    delay: 2,
  },
  {
    className: "w-[350px] h-[350px] bg-violet-500/15 bottom-[-5%] left-[30%]",
    duration: 22,
    delay: 4,
  },
];

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full blur-[100px] ${orb.className}`}
          animate={{
            y: [0, -30, 10, -20, 0],
            x: [0, 20, -10, 15, 0],
            scale: [1, 1.1, 0.95, 1.05, 1],
          }}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: orb.delay,
          }}
        />
      ))}
    </div>
  );
}
