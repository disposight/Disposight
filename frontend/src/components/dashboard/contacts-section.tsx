"use client";

import { useEffect, useState } from "react";
import { api, PlanLimitError, type ContactInfo } from "@/lib/api";
import { ContactCard } from "./contact-card";
import { UpgradePrompt } from "./upgrade-prompt";
import KineticDotsLoader from "@/components/ui/kinetic-dots-loader";

type ContactsState = "idle" | "loading" | "found" | "none_found" | "no_domain" | "error" | "gated";

interface ContactsSectionProps {
  companyId: string;
  companyName: string;
  domain: string | null;
  isPaid: boolean;
}

export function ContactsSection({ companyId, companyName, domain, isPaid }: ContactsSectionProps) {
  const [state, setState] = useState<ContactsState>(isPaid ? "idle" : "gated");
  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [error, setError] = useState("");

  // Check for cached contacts on mount
  useEffect(() => {
    if (!isPaid) {
      setState("gated");
      return;
    }

    api
      .getContacts(companyId)
      .then((res) => {
        if (res.contacts.length > 0) {
          setContacts(res.contacts);
          setState("found");
        } else if (res.status === "no_domain") {
          setState("no_domain");
        }
        // Otherwise stay idle — user can click "Find Contacts"
      })
      .catch((err) => {
        if (err instanceof PlanLimitError) {
          setState("gated");
        }
        // On error, stay idle — user can still trigger manually
      });
  }, [companyId, isPaid]);

  const handleFindContacts = async () => {
    setState("loading");
    setError("");

    try {
      const res = await api.findContacts(companyId);
      if (res.contacts.length > 0) {
        setContacts(res.contacts);
        setState("found");
      } else if (res.status === "no_domain") {
        setState("no_domain");
      } else {
        setState("none_found");
      }
    } catch (err) {
      if (err instanceof PlanLimitError) {
        setState("gated");
      } else {
        setError(err instanceof Error ? err.message : "Failed to find contacts");
        setState("error");
      }
    }
  };

  return (
    <div
      className="p-6 rounded-lg"
      style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
    >
      <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
        Decision-Maker Contacts
      </h2>

      {state === "gated" && (
        <div className="space-y-3">
          {/* Blurred placeholder cards */}
          <div className="space-y-2" style={{ filter: "blur(6px)", userSelect: "none" }} aria-hidden="true">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-3 rounded-lg"
                style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
              >
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  John Smith
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  VP of Operations
                </p>
                <p className="text-xs font-mono mt-1" style={{ color: "var(--text-secondary)" }}>
                  john.smith@company.com
                </p>
              </div>
            ))}
          </div>
          <UpgradePrompt message="Upgrade to find decision-maker contacts at this company." />
        </div>
      )}

      {state === "idle" && (
        <div className="text-center py-4">
          {!domain ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No website domain on file. Contact discovery requires a company website.
            </p>
          ) : (
            <>
              <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
                Discover leadership contacts with validated emails and phone numbers.
              </p>
              <button
                onClick={handleFindContacts}
                className="px-5 py-2.5 rounded-md text-sm font-medium transition-colors"
                style={{ backgroundColor: "var(--accent)", color: "#fff" }}
              >
                Find Contacts
              </button>
            </>
          )}
        </div>
      )}

      {state === "loading" && (
        <div className="py-4">
          <KineticDotsLoader label={`Finding decision-makers at ${companyName}`} />
        </div>
      )}

      {state === "found" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {contacts.map((contact) => (
            <ContactCard key={contact.id} contact={contact} />
          ))}
        </div>
      )}

      {state === "none_found" && (
        <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
          No leadership contacts found on this company&apos;s website.
        </p>
      )}

      {state === "no_domain" && (
        <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
          No website domain on file. Contact discovery requires a company website.
        </p>
      )}

      {state === "error" && (
        <div className="text-center py-4 space-y-3">
          <p className="text-sm" style={{ color: "var(--critical)" }}>
            {error}
          </p>
          <button
            onClick={handleFindContacts}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
            style={{
              backgroundColor: "var(--bg-elevated)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-default)",
            }}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
