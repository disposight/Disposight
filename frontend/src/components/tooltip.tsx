"use client";

import { type ReactNode } from "react";

interface TooltipProps {
  children: ReactNode;
  text: string;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function Tooltip({ children, text, position = "top", className = "" }: TooltipProps) {
  const positionClasses: Record<string, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowClasses: Record<string, string> = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-[color:var(--bg-elevated)] border-t-4 border-x-transparent border-x-4 border-b-0",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-[color:var(--bg-elevated)] border-b-4 border-x-transparent border-x-4 border-t-0",
    left: "left-full top-1/2 -translate-y-1/2 border-l-[color:var(--bg-elevated)] border-l-4 border-y-transparent border-y-4 border-r-0",
    right: "right-full top-1/2 -translate-y-1/2 border-r-[color:var(--bg-elevated)] border-r-4 border-y-transparent border-y-4 border-l-0",
  };

  return (
    <span className={`relative inline-flex group ${className}`}>
      {children}
      <span
        role="tooltip"
        className={`absolute ${positionClasses[position]} z-50 px-2.5 py-1.5 rounded-md text-xs leading-relaxed whitespace-nowrap opacity-0 scale-95 pointer-events-none transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto`}
        style={{
          backgroundColor: "var(--bg-elevated)",
          color: "var(--text-secondary)",
          border: "1px solid var(--border-strong)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          maxWidth: "260px",
          whiteSpace: "normal",
        }}
      >
        {text}
        <span className={`absolute ${arrowClasses[position]} w-0 h-0`} />
      </span>
    </span>
  );
}
