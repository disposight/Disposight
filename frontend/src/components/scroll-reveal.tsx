"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;       // ms before animation starts after intersecting
  stagger?: number;     // ms between child items (applies to direct children with .sr-item)
}

export function ScrollReveal({ children, className = "", delay = 0, stagger = 0 }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            el.classList.add("sr-visible");
            // Stagger direct children that have .sr-item
            if (stagger > 0) {
              const items = el.querySelectorAll<HTMLElement>(".sr-item");
              items.forEach((item, i) => {
                setTimeout(() => item.classList.add("sr-visible"), i * stagger);
              });
            }
          }, delay);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, stagger]);

  return (
    <div ref={ref} className={`sr-container ${className}`}>
      {children}
    </div>
  );
}
