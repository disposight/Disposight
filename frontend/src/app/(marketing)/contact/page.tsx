import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact DispoSight — Get in Touch",
  description:
    "Contact the DispoSight team for support, sales inquiries, or questions about our corporate distress intelligence platform. Reach us at support@disposight.com.",
  openGraph: {
    title: "Contact DispoSight — Get in Touch",
    description:
      "Reach the DispoSight team for support or sales inquiries about our corporate distress intelligence platform.",
    url: "https://disposight.com/contact",
  },
  alternates: { canonical: "https://disposight.com/contact" },
};

export default function ContactPage() {
  return (
    <>
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-12 sm:pb-16 text-center">
        <p
          className="text-xs font-medium uppercase tracking-widest mb-4"
          style={{ color: "var(--accent)" }}
        >
          Contact
        </p>
        <h1
          className="text-3xl sm:text-4xl font-bold mb-4"
          style={{ color: "var(--text-primary)" }}
        >
          Get in touch
        </h1>
        <p className="text-base" style={{ color: "var(--text-secondary)" }}>
          Have a question or need help? We&apos;re here for you.
        </p>
      </section>

      <section className="max-w-2xl mx-auto px-4 sm:px-6 pb-12">
        <ContactForm />
      </section>

      <section className="max-w-2xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Support */}
          <div
            className="p-6 rounded-xl"
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
            }}
          >
            <h2
              className="text-lg font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              Support
            </h2>
            <p
              className="text-sm leading-relaxed mb-4"
              style={{ color: "var(--text-secondary)" }}
            >
              Questions about your account, data, or how to use DispoSight?
              Our support team is ready to help.
            </p>
            <a
              href="mailto:support@disposight.com"
              className="inline-block text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--accent)" }}
            >
              support@disposight.com
            </a>
          </div>

          {/* Sales */}
          <div
            className="p-6 rounded-xl"
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
            }}
          >
            <h2
              className="text-lg font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              Sales
            </h2>
            <p
              className="text-sm leading-relaxed mb-4"
              style={{ color: "var(--text-secondary)" }}
            >
              Interested in Enterprise pricing, custom data sources, or a
              demo? Talk to our sales team.
            </p>
            <a
              href="mailto:sales@disposight.com"
              className="inline-block text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--accent)" }}
            >
              sales@disposight.com
            </a>
          </div>
        </div>

        <div
          className="mt-6 p-5 rounded-xl text-center"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
          }}
        >
          <p
            className="text-sm mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            Looking for answers to common questions?
          </p>
          <Link
            href="/faq"
            className="text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: "var(--accent)" }}
          >
            Check our FAQ
          </Link>
        </div>
      </section>
    </>
  );
}
