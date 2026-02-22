import Link from "next/link";

export function BlogPagination({
  currentPage,
  totalPages,
  basePath = "/blog",
  category,
}: {
  currentPage: number;
  totalPages: number;
  basePath?: string;
  category?: string;
}) {
  if (totalPages <= 1) return null;

  function pageUrl(page: number): string {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (category) params.set("category", category);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const pages: number[] = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  return (
    <nav className="flex items-center justify-center gap-2 mt-10" aria-label="Blog pagination">
      {currentPage > 1 && (
        <Link
          href={pageUrl(currentPage - 1)}
          className="px-3 py-1.5 text-sm rounded border transition-colors hover:border-emerald-500/40"
          style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
        >
          Previous
        </Link>
      )}

      {pages.map((page) => (
        <Link
          key={page}
          href={pageUrl(page)}
          className="px-3 py-1.5 text-sm rounded border transition-colors"
          style={{
            borderColor: page === currentPage ? "var(--accent)" : "var(--border-default)",
            color: page === currentPage ? "var(--accent)" : "var(--text-secondary)",
            fontWeight: page === currentPage ? 600 : 400,
          }}
        >
          {page}
        </Link>
      ))}

      {currentPage < totalPages && (
        <Link
          href={pageUrl(currentPage + 1)}
          className="px-3 py-1.5 text-sm rounded border transition-colors hover:border-emerald-500/40"
          style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
        >
          Next
        </Link>
      )}
    </nav>
  );
}
