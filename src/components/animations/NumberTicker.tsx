"use client";

import { useEffect, useRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
  value: number;
  startValue?: number;
  direction?: "up" | "down";
  delay?: number;
  decimalPlaces?: number;
}

export function NumberTicker({
  value,
  startValue = 0,
  direction = "up",
  delay = 0,
  className,
  decimalPlaces = 0,
  ...props
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const fmt = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });

  const from = direction === "down" ? value : startValue;
  const to = direction === "down" ? startValue : value;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        const startTime = performance.now() + delay * 1000;
        const duration = 1500;

        const tick = (now: number) => {
          if (now < startTime) {
            requestAnimationFrame(tick);
            return;
          }
          const elapsed = Math.min((now - startTime) / duration, 1);
          const eased = 1 - Math.pow(1 - elapsed, 3);
          const current = from + (to - from) * eased;
          if (ref.current) ref.current.textContent = fmt.format(Number(current.toFixed(decimalPlaces)));
          if (elapsed < 1) requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, startValue, direction, delay, decimalPlaces]);

  return (
    <span
      ref={ref}
      className={cn("inline-block tracking-wider tabular-nums", className)}
      {...props}
    >
      {fmt.format(from)}
    </span>
  );
}
