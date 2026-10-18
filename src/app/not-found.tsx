import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-5 py-20 text-center">
      <p className="text-6xl font-extrabold text-gold/60">404</p>
      <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink">
        We couldn&apos;t find that page
      </h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-ink/55">
        The link may be broken or the page may have moved. Try one of these
        instead:
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary">
          Back to home
        </Link>
        <Link href="/tools" className="btn-outline">
          Browse tools
        </Link>
        <Link href="/blog" className="btn-outline">
          Read guides
        </Link>
      </div>
    </main>
  );
}
