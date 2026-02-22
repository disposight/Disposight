export function AuthorSection({
  author,
}: {
  author: { name: string; role: string; bio: string };
}) {
  return (
    <div
      className="flex items-start gap-4 p-5 rounded-lg border mt-10"
      style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-default)" }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-bold"
        style={{ backgroundColor: "var(--accent)", color: "#fff" }}
      >
        {author.name.charAt(0)}
      </div>
      <div>
        <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
          {author.name}
        </p>
        <p className="text-sm mb-2" style={{ color: "var(--accent)" }}>
          {author.role}
        </p>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {author.bio}
        </p>
      </div>
    </div>
  );
}
