import Link from "next/link";

export interface RelatedLink {
  href: string;
  label: string;
  description?: string;
}

/** Internal-links block (every public page carries at least three). */
export default function RelatedLinks({
  links,
  heading = "Related tools and guides",
}: {
  links: RelatedLink[];
  heading?: string;
}) {
  return (
    <section aria-label={heading}>
      <h2 className="text-2xl font-bold tracking-tight text-ink">{heading}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="card p-4 transition-shadow hover:shadow-lift"
          >
            <p className="text-sm font-bold text-ink">{link.label}</p>
            {link.description && (
              <p className="mt-1 text-xs leading-relaxed text-ink/55">
                {link.description}
              </p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
