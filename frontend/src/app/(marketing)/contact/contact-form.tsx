"use client";

import { useActionState } from "react";
import { sendContactEmail, type ContactState } from "./action";

const initial: ContactState = { success: false, error: null };

const inputStyle = {
  backgroundColor: "var(--bg-base)",
  color: "var(--text-primary)",
  border: "1px solid var(--border-default)",
};

const focusClass =
  "w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-colors focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 placeholder:text-[var(--text-muted)]";

export function ContactForm() {
  const [state, formAction, pending] = useActionState(sendContactEmail, initial);

  if (state.success) {
    return (
      <div
        className="p-8 rounded-xl text-center"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
        }}
      >
        <div
          className="text-3xl mb-3"
          style={{ color: "var(--accent)" }}
        >
          &#10003;
        </div>
        <h3
          className="text-lg font-semibold mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          Message sent
        </h3>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          We&apos;ll get back to you as soon as possible.
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="p-6 sm:p-8 rounded-xl space-y-4"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border-default)",
      }}
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="name"
            className="block text-xs font-medium mb-1.5"
            style={{ color: "var(--text-secondary)" }}
          >
            Name <span className="text-red-400">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="Your name"
            className={focusClass}
            style={inputStyle}
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-medium mb-1.5"
            style={{ color: "var(--text-secondary)" }}
          >
            Email <span className="text-red-400">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@company.com"
            className={focusClass}
            style={inputStyle}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="company"
            className="block text-xs font-medium mb-1.5"
            style={{ color: "var(--text-secondary)" }}
          >
            Company
          </label>
          <input
            id="company"
            name="company"
            type="text"
            placeholder="Your company"
            className={focusClass}
            style={inputStyle}
          />
        </div>
        <div>
          <label
            htmlFor="subject"
            className="block text-xs font-medium mb-1.5"
            style={{ color: "var(--text-secondary)" }}
          >
            Subject <span className="text-red-400">*</span>
          </label>
          <input
            id="subject"
            name="subject"
            type="text"
            required
            placeholder="What's this about?"
            className={focusClass}
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="message"
          className="block text-xs font-medium mb-1.5"
          style={{ color: "var(--text-secondary)" }}
        >
          Message <span className="text-red-400">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          placeholder="Tell us more..."
          className={`${focusClass} resize-none`}
          style={inputStyle}
        />
      </div>

      {state.error && (
        <p className="text-sm text-red-400">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full py-3 rounded-lg text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-50"
        style={{ backgroundColor: "var(--accent)", color: "#fff" }}
      >
        {pending ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
