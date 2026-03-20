"use client";

import { useEffect, useRef, useState } from "react";
import { type LucideIcon } from "lucide-react";

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  suffix?: string;
  numericValue?: number;
}

export default function StatsCard({ icon: Icon, label, value, suffix, numericValue }: StatsCardProps) {
  const [displayValue, setDisplayValue] = useState("0");
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (numericValue === undefined || numericValue === 0 || hasAnimated.current) {
      setDisplayValue(value);
      return;
    }

    hasAnimated.current = true;
    const duration = 1200;
    const steps = 40;
    const stepDuration = duration / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += numericValue / steps;
      if (current >= numericValue) {
        current = numericValue;
        clearInterval(timer);
      }
      // Determine decimal places from original value
      const decimals = value.includes(".") ? value.split(".")[1]?.length ?? 2 : 0;
      setDisplayValue(current.toFixed(decimals));
    }, stepDuration);

    return () => clearInterval(timer);
  }, [numericValue, value]);

  return (
    <div
      ref={ref}
      className="glass-card glow-border rounded-2xl px-5 py-4 flex flex-col items-center text-center transition-all duration-300 hover:scale-[1.03]"
    >
      <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-purple-400" />
      </div>
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xl font-bold">
        {numericValue !== undefined ? displayValue : value}
        {suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}
      </p>
    </div>
  );
}
