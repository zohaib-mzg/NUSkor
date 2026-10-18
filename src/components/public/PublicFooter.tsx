import Link from "next/link";
import Image from "next/image";
import CookieSettingsLink from "@/components/public/CookieSettingsLink";
import {
  ADMIN_LOGIN_HREF,
  SITE,
  STUDENT_PORTAL_HREF,
  TA_LOGIN_HREF,
} from "@/lib/site";

const columns: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Tools",
    links: [
      { href: "/tools/cgpa-calculator", label: "CGPA Calculator" },
      { href: "/tools/gpa-calculator", label: "GPA Calculator" },
      { href: "/tools/grade-calculator", label: "Final Grade Calculator" },
      { href: "/tools/attendance-calculator", label: "Attendance Calculator" },
      { href: "/tools/semester-gpa-planner", label: "What-If Planner" },
      { href: "/tools", label: "All tools" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/resources/gpa-scale-explained", label: "GPA scale explained" },
      { href: "/resources/cgpa-formula", label: "CGPA formula" },
      { href: "/resources/study-resources", label: "Study resources" },
      { href: "/glossary", label: "Glossary" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/features", label: "Features" },
      { href: "/for-students", label: "For students" },
      { href: "/for-tas", label: "For TAs" },
      { href: "/updates", label: "Updates" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy-policy", label: "Privacy policy" },
      { href: "/terms", label: "Terms of use" },
      { href: "/disclaimer", label: "Disclaimer" },
      { href: "/cookie-policy", label: "Cookie policy" },
    ],
  },
];

export default function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-black/[0.06] bg-white">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <div className="relative h-9 w-9 overflow-hidden rounded-full ring-2 ring-gold">
                <Image
                  src="/logo.png"
                  alt="nuSkor logo"
                  fill
                  sizes="36px"
                  className="object-cover"
                />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-ink">
                nu<span className="text-gold-deep">Skor</span>
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-ink/55">
              Free student tools and a marks portal. {SITE.tagline}
            </p>
            <div className="mt-5 flex flex-col items-start gap-2 text-sm font-semibold">
              <Link
                href={STUDENT_PORTAL_HREF}
                className="text-gold-deep hover:underline"
              >
                Student portal →
              </Link>
              <Link href={TA_LOGIN_HREF} className="text-ink/60 hover:text-ink">
                Login as TA
              </Link>
              <Link
                href={ADMIN_LOGIN_HREF}
                className="text-ink/40 hover:text-ink/70"
              >
                Admin
              </Link>
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h2 className="text-xs font-bold uppercase tracking-widest text-ink/40">
                {col.title}
              </h2>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-ink/60 transition-colors hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                {col.title === "Legal" && (
                  <li>
                    <CookieSettingsLink />
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-black/[0.06] pt-6">
          <p className="mx-auto max-w-2xl text-center text-xs leading-relaxed text-ink/45">
            {SITE.independence.line}
          </p>
          <p className="mt-3 text-center text-xs text-ink/40">
            © {year} {SITE.name} · {SITE.tagline}
          </p>
        </div>
      </div>
    </footer>
  );
}
