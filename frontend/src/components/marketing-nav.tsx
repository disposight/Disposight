import Link from "next/link";

export function MarketingNav() {
  return (
    <nav className="flex items-center justify-between max-w-6xl mx-auto px-4 sm:px-6 py-5">
      <Link href="/" className="flex items-center gap-2">
        <img src="/logo.png" alt="DispoSight" className="h-8" />
        <span className="text-lg font-bold" style={{ color: "var(--accent)" }}>
          DispoSight
        </span>
      </Link>
      <div className="flex items-center gap-3 sm:gap-5">
        <Link
          href="/about"
          className="text-sm hidden sm:inline transition-colors hover:opacity-80"
          style={{ color: "var(--text-secondary)" }}
        >
          About
        </Link>
        <Link
          href="/pricing"
          className="text-sm hidden sm:inline transition-colors hover:opacity-80"
          style={{ color: "var(--text-secondary)" }}
        >
          Pricing
        </Link>
        <Link
          href="/faq"
          className="text-sm hidden sm:inline transition-colors hover:opacity-80"
          style={{ color: "var(--text-secondary)" }}
        >
          FAQ
        </Link>
        <Link
          href="/contact"
          className="text-sm hidden sm:inline transition-colors hover:opacity-80"
          style={{ color: "var(--text-secondary)" }}
        >
          Contact
        </Link>
        <Link
          href="/login"
          className="text-sm transition-colors hover:opacity-80"
          style={{ color: "var(--text-secondary)" }}
        >
          Sign In
        </Link>
        <Link
          href="/register"
          className="px-4 py-2 rounded-md text-sm font-medium transition-all hover:brightness-110"
          style={{ backgroundColor: "var(--accent)", color: "#fff" }}
        >
          Get Started
        </Link>
      </div>
    </nav>
  );
}
