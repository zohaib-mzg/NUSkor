/**
 * Site-wide configuration for the public (university-neutral) side of nuSkor.
 * All values that differ per deployment come from NEXT_PUBLIC_* env vars —
 * see .env.example.
 */

export const SITE = {
  name: "nuSkor",
  tagline: "Empowering Students. Elevating Futures.",
  /** Canonical site URL, no trailing slash. */
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/+$/,
    ""
  ),
  /** nuSkor's own contact address — never a university address. */
  contactEmail:
    process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "zohaib.mzg158@gmail.com",
  independence: {
    short:
      "nuSkor is an independent student-built project — not affiliated with any university.",
    line: "nuSkor is an independent student-built project. It is not affiliated with, endorsed by, or operated by any university.",
    estimates:
      "Estimates for planning only. Your university's own rules and records are the final authority.",
  },
  nav: [
    { href: "/tools", label: "Tools" },
    { href: "/blog", label: "Guides" },
    { href: "/resources", label: "Resources" },
    { href: "/faq", label: "FAQ" },
    { href: "/about", label: "About" },
  ],
} as const;

export const STUDENT_PORTAL_HREF = "/login?flow=student";
export const TA_LOGIN_HREF = "/login?flow=ta";
export const ADMIN_LOGIN_HREF = "/admin/login";
