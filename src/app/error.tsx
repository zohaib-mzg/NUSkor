"use client";

import Link from "next/link";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-5 py-20 text-center">
      <p className="text-5xl font-extrabold text-gold/60">Oops</p>
      <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-ink/55">
        An unexpected error occurred while loading this page. You can try again,
        or head back to a page that works:
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="btn-primary">
          Try again
        </button>
        <Link href="/" className="btn-outline">
          Back to home
        </Link>
        <Link href="/tools" className="btn-outline">
          Browse tools
        </Link>
      </div>
    </main>
  );
}
