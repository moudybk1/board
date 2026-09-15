"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

import { prefersReducedMotion } from "@/lib/motion/gsap-config";
import { cn } from "@/lib/utils";

/**
 * Staggers child `[data-reveal]` nodes on mount. Honors reduced motion.
 */
export function PageReveal({
  className,
  children,
  stagger = 0.06,
}: {
  className?: string;
  children: React.ReactNode;
  stagger?: number;
}) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = root.current;
    if (!node || prefersReducedMotion()) return;

    const items = node.querySelectorAll<HTMLElement>("[data-reveal]");
    if (!items.length) return;

    const tween = gsap.from(items, {
      y: 14,
      opacity: 0,
      duration: 0.42,
      stagger,
      ease: "power3.out",
      clearProps: "transform,opacity",
    });

    return () => {
      tween.kill();
    };
  }, [stagger]);

  return (
    <div ref={root} className={cn(className)}>
      {children}
    </div>
  );
}
