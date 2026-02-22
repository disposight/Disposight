import type { BlogSource } from "@/lib/blog/types";

export function SourcesSection({ sources }: { sources: BlogSource[] }) {
  if (sources.length === 0) return null;

  return (
    <div className="mt-10">
      <h2
        className="text-lg font-semibold mb-4"
        style={{ color: "var(--text-primary)" }}
      >
        Sources
      </h2>
      <ol className="list-decimal pl-5 space-y-2">
        {sources.map((source, i) => (
          <li key={i} className="text-sm" style={{ color: "var(--text-secondary)" }}>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 transition-colors hover:text-emerald-400"
              style={{ color: "var(--accent)" }}
            >
              {source.title}
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}
