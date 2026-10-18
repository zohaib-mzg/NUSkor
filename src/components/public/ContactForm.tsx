"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { SITE } from "@/lib/site";

const TOPICS = [
  "General question",
  "Bug report",
  "Content correction",
  "Privacy request",
  "Something else",
];

/**
 * mailto: contact form with a hidden honeypot field. Nothing is sent to a
 * nuSkor server — the form composes an email in your own mail app.
 */
export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [attempted, setAttempted] = useState(false);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (honeypot.trim() !== "") {
      // Bot filled the hidden field — pretend it worked and do nothing.
      setAttempted(true);
      return;
    }
    const subject = encodeURIComponent(`[nuSkor] ${topic}`);
    const body = encodeURIComponent(
      `${message}\n\n— ${name}${email ? ` (${email})` : ""}`
    );
    window.location.href = `mailto:${SITE.contactEmail}?subject=${subject}&body=${body}`;
    setAttempted(true);
  };

  if (attempted) {
    return (
      <div className="card p-6" aria-live="polite">
        <h3 className="font-bold text-ink">Check your email app</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink/60">
          Your mail app should now be opening with the message ready to send.
          If nothing happened, email us directly at{" "}
          <a
            href={`mailto:${SITE.contactEmail}`}
            className="font-medium text-gold-deep hover:underline"
          >
            {SITE.contactEmail}
          </a>
          .
        </p>
        <button
          type="button"
          className="btn-ghost mt-4 !px-2 text-xs"
          onClick={() => setAttempted(false)}
        >
          Write another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="contact-name">
            Your name
          </label>
          <input
            id="contact-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </div>
        <div>
          <label className="label" htmlFor="contact-email">
            Your email{" "}
            <span className="font-normal text-ink/45">(so we can reply)</span>
          </label>
          <input
            id="contact-email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="contact-topic">
          What is this about?
        </label>
        <select
          id="contact-topic"
          className="input"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        >
          {TOPICS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="contact-message">
          Message
        </label>
        <textarea
          id="contact-message"
          className="input min-h-[140px]"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          placeholder="For bug reports, include the page address and what you expected to happen."
        />
      </div>

      {/* Honeypot — hidden from people, tempting to bots. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <button type="submit" className="btn-primary">
        <Send className="h-4 w-4" aria-hidden="true" /> Open in my email app
      </button>
      <p className="text-xs leading-relaxed text-ink/45">
        This form does not send anything to a nuSkor server — it opens your own
        mail app with the message pre-filled, addressed to{" "}
        {SITE.contactEmail}.
      </p>
    </form>
  );
}
