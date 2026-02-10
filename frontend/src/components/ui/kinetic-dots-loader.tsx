"use client";

export default function KineticDotsLoader({ label = "Analyzing" }: { label?: string }) {
  const dots = 4;

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8">
      <div className="flex gap-5">
        {[...Array(dots)].map((_, i) => (
          <div
            key={i}
            className="relative flex flex-col items-center justify-end h-20 w-6"
          >
            {/* Bouncing dot */}
            <div
              className="relative w-5 h-5 z-10"
              style={{
                animation: "kd-bounce 1.4s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite",
                animationDelay: `${i * 0.15}s`,
                willChange: "transform",
              }}
            >
              <div
                className="w-full h-full rounded-full"
                style={{
                  background: "linear-gradient(to bottom, var(--accent-text), var(--accent))",
                  boxShadow: "0 0 15px rgba(16, 185, 129, 0.6)",
                  animation: "kd-morph 1.4s linear infinite",
                  animationDelay: `${i * 0.15}s`,
                  willChange: "transform",
                }}
              />
              {/* Specular highlight */}
              <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-white/60 rounded-full blur-[0.5px]" />
            </div>

            {/* Floor ripple */}
            <div
              className="absolute bottom-0 w-10 h-3 rounded-[100%] opacity-0"
              style={{
                border: "1px solid rgba(16, 185, 129, 0.3)",
                animation: "kd-ripple 1.4s linear infinite",
                animationDelay: `${i * 0.15}s`,
              }}
            />

            {/* Shadow */}
            <div
              className="absolute -bottom-1 w-5 h-1.5 rounded-[100%] blur-sm"
              style={{
                backgroundColor: "rgba(16, 185, 129, 0.4)",
                animation: "kd-shadow 1.4s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite",
                animationDelay: `${i * 0.15}s`,
              }}
            />
          </div>
        ))}
      </div>

      {label && (
        <p className="text-xs font-medium tracking-wide" style={{ color: "var(--text-muted)" }}>
          {label}
        </p>
      )}

      <style>{`
        @keyframes kd-bounce {
          0% { transform: translateY(0); animation-timing-function: cubic-bezier(0.33, 1, 0.68, 1); }
          50% { transform: translateY(-40px); animation-timing-function: cubic-bezier(0.32, 0, 0.67, 0); }
          100% { transform: translateY(0); }
        }
        @keyframes kd-morph {
          0% { transform: scale(1.4, 0.6); }
          5% { transform: scale(0.9, 1.1); }
          15% { transform: scale(1, 1); }
          50% { transform: scale(1, 1); }
          85% { transform: scale(0.9, 1.1); }
          100% { transform: scale(1.4, 0.6); }
        }
        @keyframes kd-shadow {
          0% { transform: scale(1.4); opacity: 0.6; }
          50% { transform: scale(0.5); opacity: 0.1; }
          100% { transform: scale(1.4); opacity: 0.6; }
        }
        @keyframes kd-ripple {
          0% { transform: scale(0.5); opacity: 0; border-width: 4px; }
          5% { opacity: 0.8; }
          30% { transform: scale(1.5); opacity: 0; border-width: 0px; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
