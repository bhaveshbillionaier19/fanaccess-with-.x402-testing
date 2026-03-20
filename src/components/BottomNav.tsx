"use client";

import Link from "next/link";
import { Home, PlusSquare } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function BottomNav() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/mint", icon: PlusSquare, label: "Mint" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-nav border-t border-white/[0.08] z-50 pb-safe">
      <div className="flex justify-around items-center h-16">
        {navLinks.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex flex-col items-center justify-center w-full h-full text-xs font-medium transition-all duration-300",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="flex flex-col items-center"
              >
                <Icon className="w-5 h-5 mb-1" />
                <span>{label}</span>
              </motion.div>
              {isActive && (
                <motion.div
                  layoutId="bottomnav-active"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
