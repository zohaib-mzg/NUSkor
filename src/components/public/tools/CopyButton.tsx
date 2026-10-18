"use client";

import { useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

/** Copies the tool's result summary to the clipboard. */
export default function CopyButton({
  text,
  label = "Copy result",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked — leave the button unchanged, never break the tool.
    }
  };

  return (
    <button type="button" onClick={copy} className="btn-outline !py-2 text-xs">
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-600" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {copied ? "Copied" : label}
    </button>
  );
}
