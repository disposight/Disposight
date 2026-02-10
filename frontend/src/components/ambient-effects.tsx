"use client";

import { useState, useEffect, useRef } from "react";

export function AmbientEffects() {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const [scrolled, setScrolled] = useState(false);
  const floatingRef = useRef<HTMLElement[]>([]);

  // Mouse-following glow — direct DOM updates, no re-renders
  const glowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = glowRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
      el.style.opacity = "1";
    };
    const onLeave = () => {
      el.style.opacity = "0";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  // Click ripples
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const r = { id: Date.now(), x: e.clientX, y: e.clientY };
      setRipples((p) => [...p, r]);
      setTimeout(() => setRipples((p) => p.filter((x) => x.id !== r.id)), 1000);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Shooting stars — spawned via DOM, no re-renders
  const starsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = starsRef.current;
    if (!container) return;

    const spawn = () => {
      const star = document.createElement("div");
      star.className = "ds-star";

      // Random start position along top or right edge
      const fromTop = Math.random() > 0.4;
      const startX = fromTop ? Math.random() * 100 : 80 + Math.random() * 20;
      const startY = fromTop ? -2 : Math.random() * 30;

      // Travel distance and angle
      const angle = 15 + Math.random() * 35; // 15°–50° from horizontal
      const dist = 300 + Math.random() * 500;
      const dx = -Math.cos((angle * Math.PI) / 180) * dist;
      const dy = Math.sin((angle * Math.PI) / 180) * dist;
      const duration = 0.6 + Math.random() * 0.6; // 0.6–1.2s
      const length = 60 + Math.random() * 80; // tail length

      star.style.cssText = `
        left: ${startX}%;
        top: ${startY}%;
        width: ${length}px;
        --dx: ${dx}px;
        --dy: ${dy}px;
        --angle: ${angle}deg;
        animation-duration: ${duration}s;
      `;

      container.appendChild(star);
      setTimeout(() => star.remove(), duration * 1000 + 100);
    };

    // Spawn one every 2–5 seconds
    let timeout: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const delay = 2000 + Math.random() * 3000;
      timeout = setTimeout(() => {
        spawn();
        schedule();
      }, delay);
    };
    // First one after a short delay
    timeout = setTimeout(() => {
      spawn();
      schedule();
    }, 1500);

    return () => clearTimeout(timeout);
  }, []);

  // Floating elements on scroll
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".ds-float");
    floatingRef.current = Array.from(els);
    const onScroll = () => {
      if (!scrolled) {
        setScrolled(true);
        floatingRef.current.forEach((el, i) => {
          setTimeout(() => {
            if (el) {
              el.style.animationPlayState = "running";
              el.style.opacity = "";
            }
          }, i * 200);
        });
      }
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [scrolled]);

  return (
    <>
      <style>{`
        /* ── Hero entrance animations (play once on page load) ── */
        @keyframes ds-fade-down {
          0% { opacity: 0; transform: translateY(-20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes ds-fade-up {
          0% { opacity: 0; transform: translateY(30px); filter: blur(4px); }
          60% { filter: blur(0); }
          100% { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        @keyframes ds-fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes ds-scale-up {
          0% { opacity: 0; transform: translateY(40px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        .hero-nav       { opacity: 0; animation: ds-fade-down 0.7s ease-out 0.1s forwards; }
        .hero-label     { opacity: 0; animation: ds-fade-up 0.7s ease-out 0.3s forwards; }
        .hero-heading   { opacity: 0; animation: ds-fade-up 0.8s ease-out 0.5s forwards; }
        .hero-subtitle  { opacity: 0; animation: ds-fade-up 0.7s ease-out 0.8s forwards; }
        .hero-cta       { opacity: 0; animation: ds-fade-up 0.7s ease-out 1.0s forwards; }
        .hero-sources   { opacity: 0; animation: ds-fade-in 0.8s ease-out 1.3s forwards; }
        .hero-preview   { opacity: 0; animation: ds-scale-up 0.9s ease-out 1.5s forwards; }

        /* ── Scroll reveal ── */
        .sr-container {
          opacity: 0;
          transform: translateY(32px);
          transition: opacity 0.7s ease-out, transform 0.7s ease-out;
        }
        .sr-container.sr-visible {
          opacity: 1;
          transform: translateY(0);
        }
        .sr-item {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.5s ease-out, transform 0.5s ease-out;
        }
        .sr-item.sr-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .ds-glow {
          position: fixed;
          top: 0;
          left: 0;
          width: 160px;
          height: 160px;
          pointer-events: none;
          border-radius: 9999px;
          background: radial-gradient(circle, rgba(16,185,129,0.15), rgba(16,185,129,0.06), transparent 70%);
          filter: blur(25px);
          transform: translate3d(0, 0, 0) translate(-50%, -50%);
          will-change: transform, opacity;
          transition: opacity 300ms ease-out;
          z-index: 20;
        }
        @keyframes ds-grid-draw {
          0% { stroke-dashoffset: 1000; opacity: 0; }
          50% { opacity: 0.5; }
          100% { stroke-dashoffset: 0; opacity: 0.4; }
        }
        @keyframes ds-pulse {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }
        @keyframes ds-float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.15; }
          25% { transform: translateY(-12px) translateX(6px); opacity: 0.5; }
          50% { transform: translateY(-6px) translateX(-4px); opacity: 0.3; }
          75% { transform: translateY(-18px) translateX(8px); opacity: 0.6; }
        }
        @keyframes ds-corner-in {
          0% { opacity: 0; transform: scale(0.5); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes ds-ripple {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(12); opacity: 0; }
        }
        .ds-grid-line {
          stroke: rgba(16,185,129,0.5);
          stroke-width: 0.8;
          opacity: 0;
          stroke-dasharray: 5 5;
          stroke-dashoffset: 1000;
          animation: ds-grid-draw 2.5s ease-out forwards;
        }
        .ds-dot {
          fill: rgba(16,185,129,0.7);
          opacity: 0;
          animation: ds-pulse 4s ease-in-out infinite;
        }
        .ds-corner {
          position: absolute;
          width: 32px;
          height: 32px;
          border: 1px solid rgba(16,185,129,0.12);
          opacity: 0;
          animation: ds-corner-in 1s ease-out forwards;
        }
        .ds-float {
          position: absolute;
          width: 2px;
          height: 2px;
          background: rgba(16,185,129,0.5);
          border-radius: 50%;
          opacity: 0;
          animation: ds-float 5s ease-in-out infinite;
          animation-play-state: paused;
        }
        .ds-ripple {
          position: fixed;
          width: 6px;
          height: 6px;
          background: rgba(16,185,129,0.5);
          border-radius: 50%;
          pointer-events: none;
          animation: ds-ripple 0.8s ease-out forwards;
          z-index: 9999;
        }

        /* ── Shooting stars ── */
        @keyframes ds-shoot {
          0% {
            transform: rotate(var(--angle)) translateX(0);
            opacity: 0;
          }
          8% {
            opacity: 1;
          }
          70% {
            opacity: 0.6;
          }
          100% {
            transform: rotate(var(--angle)) translateX(var(--dx));
            opacity: 0;
          }
        }
        .ds-stars {
          position: fixed;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          z-index: 1;
        }
        .ds-star {
          position: absolute;
          height: 1px;
          background: linear-gradient(90deg, rgba(16,185,129,0.6), rgba(16,185,129,0.15), transparent);
          border-radius: 1px;
          opacity: 0;
          animation: ds-shoot ease-out forwards;
          box-shadow: 0 0 4px rgba(16,185,129,0.3);
        }
      `}</style>

      {/* SVG grid background */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 0 }}
        aria-hidden="true"
      >
        <defs>
          <pattern id="ds-grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path
              d="M 60 0 L 0 0 0 60"
              fill="none"
              stroke="rgba(16,185,129,0.35)"
              strokeWidth="0.6"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ds-grid)" />

        {/* Accent grid lines */}
        <line x1="0" y1="20%" x2="100%" y2="20%" className="ds-grid-line" style={{ animationDelay: "0.5s" }} />
        <line x1="0" y1="80%" x2="100%" y2="80%" className="ds-grid-line" style={{ animationDelay: "1s" }} />
        <line x1="20%" y1="0" x2="20%" y2="100%" className="ds-grid-line" style={{ animationDelay: "1.5s" }} />
        <line x1="80%" y1="0" x2="80%" y2="100%" className="ds-grid-line" style={{ animationDelay: "2s" }} />
        <line x1="50%" y1="0" x2="50%" y2="100%" className="ds-grid-line" style={{ animationDelay: "2.5s", opacity: "0.2" }} />
        <line x1="0" y1="50%" x2="100%" y2="50%" className="ds-grid-line" style={{ animationDelay: "3s", opacity: "0.2" }} />

        {/* Intersection dots */}
        <circle cx="20%" cy="20%" r="2" className="ds-dot" style={{ animationDelay: "3s" }} />
        <circle cx="80%" cy="20%" r="2" className="ds-dot" style={{ animationDelay: "3.2s" }} />
        <circle cx="20%" cy="80%" r="2" className="ds-dot" style={{ animationDelay: "3.4s" }} />
        <circle cx="80%" cy="80%" r="2" className="ds-dot" style={{ animationDelay: "3.6s" }} />
        <circle cx="50%" cy="50%" r="1.5" className="ds-dot" style={{ animationDelay: "4s" }} />
      </svg>

      {/* Corner elements */}
      <div className="ds-corner top-4 left-4 sm:top-6 sm:left-6 md:top-8 md:left-8" style={{ animationDelay: "3.5s" }}>
        <div className="absolute top-0 left-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "rgba(16,185,129,0.3)" }} />
      </div>
      <div className="ds-corner top-4 right-4 sm:top-6 sm:right-6 md:top-8 md:right-8" style={{ animationDelay: "3.7s" }}>
        <div className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "rgba(16,185,129,0.3)" }} />
      </div>
      <div className="ds-corner bottom-4 left-4 sm:bottom-6 sm:left-6 md:bottom-8 md:left-8" style={{ animationDelay: "3.9s" }}>
        <div className="absolute bottom-0 left-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "rgba(16,185,129,0.3)" }} />
      </div>
      <div className="ds-corner bottom-4 right-4 sm:bottom-6 sm:right-6 md:bottom-8 md:right-8" style={{ animationDelay: "4.1s" }}>
        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "rgba(16,185,129,0.3)" }} />
      </div>

      {/* Floating particles */}
      <div className="ds-float" style={{ top: "15%", left: "12%", animationDelay: "0s" }} />
      <div className="ds-float" style={{ top: "35%", left: "88%", animationDelay: "0.8s" }} />
      <div className="ds-float" style={{ top: "55%", left: "8%", animationDelay: "1.6s" }} />
      <div className="ds-float" style={{ top: "72%", left: "92%", animationDelay: "2.4s" }} />
      <div className="ds-float" style={{ top: "45%", left: "50%", animationDelay: "3.2s" }} />
      <div className="ds-float" style={{ top: "85%", left: "25%", animationDelay: "1.2s" }} />

      {/* Shooting stars container — populated via DOM */}
      <div ref={starsRef} className="ds-stars" />

      {/* Mouse glow */}
      <div ref={glowRef} className="ds-glow" style={{ opacity: 0 }} />

      {/* Click ripples */}
      {ripples.map((r) => (
        <div key={r.id} className="ds-ripple" style={{ left: `${r.x}px`, top: `${r.y}px` }} />
      ))}
    </>
  );
}
