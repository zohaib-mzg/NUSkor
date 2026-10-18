import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";

/**
 * Layout for all university-neutral public pages.
 *
 * Ads infrastructure (AdSenseScript) and CookieConsent are wired in here in
 * Phase 2, so that ads can never load on login/portal/admin routes which live
 * outside this route group.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
