"use client";

import { useState } from "react";
import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";

const faqs = [
  {
    question: "What is DispoSight?",
    answer:
      "DispoSight is an AI-powered corporate distress intelligence platform for deal-driven organizations — liquidation firms, distressed-focused PE groups, equipment remarketers, and wholesale asset buyers. It monitors public data sources — WARN Act filings, bankruptcy courts, SEC 8-K filings, and global news — to detect early signals of corporate distress, then scores and ranks which companies are most likely to have surplus corporate assets available for acquisition.",
  },
  {
    question: "Who is DispoSight built for?",
    answer:
      "DispoSight is built for corporate liquidation firms, distressed-focused PE groups, equipment leasing companies, remarketers, and wholesale asset buyers — anyone in the business of acquiring surplus corporate assets. If your deal team needs to find companies with equipment to disposition, DispoSight delivers those opportunities before your competitors hear about them.",
  },
  {
    question: "What data sources does DispoSight monitor?",
    answer:
      "DispoSight monitors four verified data pipelines: (1) WARN Act filings from the Department of Labor — legally required 60-day advance notices of mass layoffs and plant closures; (2) Chapter 7 and Chapter 11 bankruptcy filings from federal courts; (3) SEC EDGAR 8-K filings covering M&A, restructuring, and asset impairments; and (4) global news and press releases for closures, relocations, and downsizing events.",
  },
  {
    question: "How does the AI deal scoring work?",
    answer:
      "Every signal is processed through our NLP pipeline which extracts entities, classifies the event type, and estimates whether it could produce 100+ estimated assets. Companies are then scored 0–100 based on estimated asset volume, urgency, source credibility, and corroboration across multiple data pipelines. Higher scores mean higher priority opportunities for your team.",
  },
  {
    question: "What plans and pricing are available?",
    answer:
      "DispoSight offers two plans: Starter at $99/month (all 4 data pipelines, 50 watchlist companies, daily email digest, 1 team member) and Professional at $199/month (everything in Starter plus 200 watchlist companies, real-time alerts, 5 team members, signal correlation, and API access). Enterprise pricing is available for larger teams with custom requirements.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "Yes. Every plan includes a free 3-day trial with full access to all features. No credit card is required to start your trial. You can explore live data, set up watchlists, and see deal scores before committing to a subscription.",
  },
  {
    question: "How is my data secured?",
    answer:
      "DispoSight uses Supabase for authentication and database hosting with row-level security (RLS) policies ensuring complete tenant isolation. Your watchlists, alerts, and account data are never visible to other users. All connections are encrypted via HTTPS, and we follow industry-standard security practices for data handling.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. You can cancel your subscription at any time from the Settings page. There are no long-term contracts or cancellation fees. When you cancel, you retain access until the end of your current billing period.",
  },
  {
    question: "How do I get support?",
    answer:
      "You can reach our support team at support@disposight.com. For sales inquiries about Enterprise plans, contact sales@disposight.com. We also have an in-app Help page with a detailed FAQ and how-to guide available from your dashboard.",
  },
];

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <ScrollReveal>
        <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-12 sm:pb-16 text-center">
          <p
            className="text-xs font-medium uppercase tracking-widest mb-4"
            style={{ color: "var(--accent)" }}
          >
            FAQ
          </p>
          <h1
            className="text-3xl sm:text-4xl font-bold mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            Frequently asked questions
          </h1>
          <p className="text-base" style={{ color: "var(--text-secondary)" }}>
            Everything you need to know about DispoSight.
          </p>
        </section>
      </ScrollReveal>

      <ScrollReveal stagger={80}>
        <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="sr-item rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                }}
              >
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {faq.question}
                  </span>
                  <span
                    className="shrink-0 text-sm transition-transform duration-200"
                    style={{
                      color: "var(--text-muted)",
                      transform: openIndex === i ? "rotate(45deg)" : "rotate(0deg)",
                    }}
                  >
                    +
                  </span>
                </button>
                {openIndex === i && (
                  <div
                    className="px-5 pb-4"
                  >
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              Still have questions?
            </p>
            <Link
              href="/contact"
              className="inline-block px-6 py-2.5 rounded-md text-sm font-medium transition-all hover:brightness-110"
              style={{
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-strong)",
              }}
            >
              Contact Us
            </Link>
          </div>
        </section>
      </ScrollReveal>
    </>
  );
}
