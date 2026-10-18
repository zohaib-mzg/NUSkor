import Link from "next/link";
import { GraduationCap, LayoutDashboard, Users } from "lucide-react";
import { TA_LOGIN_HREF } from "@/lib/site";
import PortalButton from "@/components/public/PortalButton";
import { cn } from "@/lib/utils";

/**
 * Shared soft CTA used at the end of public content pages (prompt §7, Phase 5
 * formalises it further). Links only — never an ad.
 */
export default function CtaCard({
  title = "Track your real marks and book evaluation slots on nuSkor.",
  description = "The portal is free for students: the marks your instructors publish, class statistics, a privacy-conscious ranking and evaluation slot booking — all in one place.",
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <section
      className={cn("card relative overflow-hidden p-6 sm:p-8", className)}
      aria-label="Join nuSkor"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-60"
        style={{
          background:
            "radial-gradient(360px 120px at 50% -30px, rgba(245,197,24,0.25), transparent 70%)",
        }}
      />
      <h2 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
        {title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink/60">
        {description}
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <PortalButton
          className="btn-primary w-full sm:w-auto"
          signedOutLabel={
            <>
              <GraduationCap className="h-4 w-4" aria-hidden="true" /> Sign in
              as Student
            </>
          }
          signedInLabel={
            <>
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" /> Go to
              Dashboard
            </>
          }
        />
        <Link href={TA_LOGIN_HREF} className="btn-outline w-full sm:w-auto">
          <Users className="h-4 w-4" aria-hidden="true" /> Login as TA
        </Link>
      </div>
    </section>
  );
}
