import Link from "next/link";
import { ChevronRight } from "lucide-react";
import JsonLd from "@/components/public/JsonLd";
import { breadcrumbSchema } from "@/lib/schema";

/**
 * Visual breadcrumbs + matching BreadcrumbList JSON-LD.
 * "Home" is prepended automatically; `items` are the trail after home.
 */
export default function Breadcrumbs({
  items,
}: {
  items: { name: string; href: string }[];
}) {
  const all = [{ name: "Home", href: "/" }, ...items];

  return (
    <>
      <JsonLd data={breadcrumbSchema(all)} />
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-xs text-ink/45">
          {all.map((item, index) => {
            const isLast = index === all.length - 1;
            return (
              <li
                key={item.href}
                className="flex items-center gap-1"
              >
                {index > 0 && (
                  <ChevronRight
                    className="h-3 w-3 text-ink/25"
                    aria-hidden="true"
                  />
                )}
                {isLast ? (
                  <span aria-current="page" className="font-medium text-ink/60">
                    {item.name}
                  </span>
                ) : (
                  <Link href={item.href} className="hover:text-ink/70">
                    {item.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
