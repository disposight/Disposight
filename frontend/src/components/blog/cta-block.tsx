import Link from "next/link";
import type { BlogCTA } from "@/lib/blog/types";

export function CTABlock({ cta }: { cta: BlogCTA }) {
  return (
    <div
      className="rounded-lg p-6 sm:p-8 my-10 text-center border"
      style={{
        backgroundColor: "rgba(16, 185, 129, 0.05)",
        borderColor: "rgba(16, 185, 129, 0.2)",
      }}
    >
      <h3 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
        {cta.headline}
      </h3>
      <p className="text-sm mb-5 max-w-lg mx-auto" style={{ color: "var(--text-secondary)" }}>
        {cta.description}
      </p>
      <Link
        href={cta.buttonUrl}
        className="inline-block px-6 py-2.5 rounded-md text-sm font-medium transition-all hover:brightness-110"
        style={{ backgroundColor: "var(--accent)", color: "#fff" }}
      >
        {cta.buttonText}
      </Link>
    </div>
  );
}
