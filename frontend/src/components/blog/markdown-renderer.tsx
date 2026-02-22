"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const components: Components = {
  h2: ({ children }) => {
    const text = String(children);
    const id = slugify(text);
    return (
      <h2
        id={id}
        className="text-2xl font-bold mt-10 mb-4 scroll-mt-24"
        style={{ color: "var(--text-primary)" }}
      >
        {children}
      </h2>
    );
  },
  h3: ({ children }) => {
    const text = String(children);
    const id = slugify(text);
    return (
      <h3
        id={id}
        className="text-xl font-semibold mt-8 mb-3 scroll-mt-24"
        style={{ color: "var(--text-primary)" }}
      >
        {children}
      </h3>
    );
  },
  p: ({ children }) => (
    <p className="text-base leading-7 mb-4" style={{ color: "var(--text-secondary)" }}>
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: "var(--text-secondary)" }}>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-6 mb-4 space-y-2" style={{ color: "var(--text-secondary)" }}>
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="text-base leading-7">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold" style={{ color: "var(--text-primary)" }}>
      {children}
    </strong>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="underline underline-offset-2 transition-colors hover:text-emerald-400"
      style={{ color: "var(--accent)" }}
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote
      className="border-l-4 pl-4 my-6 italic"
      style={{ borderColor: "var(--accent)", color: "var(--text-muted)" }}
    >
      {children}
    </blockquote>
  ),
  img: ({ src, alt }) => (
    <span className="block my-6">
      <img
        src={src}
        alt={alt || ""}
        className="w-full rounded-lg"
        loading="lazy"
      />
      {alt && (
        <span className="block text-xs mt-2 text-center" style={{ color: "var(--text-muted)" }}>
          {alt}
        </span>
      )}
    </span>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-6">
      <table
        className="w-full text-sm border-collapse"
        style={{ color: "var(--text-secondary)" }}
      >
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th
      className="text-left p-3 font-semibold border-b"
      style={{ borderColor: "var(--border-default)", color: "var(--text-primary)" }}
    >
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="p-3 border-b" style={{ borderColor: "var(--border-default)" }}>
      {children}
    </td>
  ),
  code: ({ children, className }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <pre
          className="rounded-lg p-4 my-4 overflow-x-auto text-sm"
          style={{ backgroundColor: "var(--bg-elevated)" }}
        >
          <code style={{ color: "var(--text-primary)" }}>{children}</code>
        </pre>
      );
    }
    return (
      <code
        className="px-1.5 py-0.5 rounded text-sm"
        style={{ backgroundColor: "var(--bg-elevated)", color: "var(--accent)" }}
      >
        {children}
      </code>
    );
  },
  hr: () => (
    <hr className="my-8" style={{ borderColor: "var(--border-default)" }} />
  ),
};

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose-custom">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </Markdown>
    </div>
  );
}
