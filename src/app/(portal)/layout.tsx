import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PortalShell from "@/components/PortalShell";
import { ToastProvider } from "@/components/ui/Toast";
import { cleanName } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/login");

  // Students must have a student account (created via a TA invitation).
  if (profile.role === "student") {
    const { data: studentRow } = await supabase
      .from("students")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (!studentRow) redirect("/join?missing=1");
  }

  // Check if admin is also a TA (has section_tas assignments)
  let isAlsoTa = false;
  if (profile.role === "admin") {
    const { data: taRow } = await supabase
      .from("section_tas")
      .select("id")
      .eq("ta_id", user.id)
      .limit(1)
      .maybeSingle();
    isAlsoTa = !!taRow;
  }

  return (
    <ToastProvider>
      <PortalShell
        email={profile.email}
        displayName={cleanName(profile.full_name) || profile.email.split("@")[0]}
        role={profile.role}
        isAlsoTa={isAlsoTa}
      >
        {children}
      </PortalShell>
    </ToastProvider>
  );
}
