import AdSenseScript from "@/components/public/AdSenseScript";
import CookieConsent from "@/components/public/CookieConsent";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";

/**
 * Layout for all university-neutral public pages. This is the ONLY place the
 * AdSense loader can ever be mounted — login/portal/admin routes live outside
 * this route group, so they can never load ads.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <AdSenseScript />
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
      <CookieConsent />
    </div>
  );
}
