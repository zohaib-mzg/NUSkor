import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PortalShell from "@/components/PortalShell";
import { ToastProvider } from "@/components/ui/Toast";
import { cleanName } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "adminmzg@gmail.com";

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

  // Force admin role if email matches — belt-and-suspenders fix
  // Uses SECURITY DEFINER RPC to bypass RLS role-change restriction
  let role = profile.role as string;
  const email = (profile.email ?? "").toLowerCase();
  if (email === ADMIN_EMAIL && role !== "admin") {
    role = "admin";
    await supabase.rpc("set_admin_role");
  }

  // Students must have a student account (created via a TA invitation).
  if (role === "student") {
    const { data: studentRow } = await supabase
      .from("students")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (!studentRow) {
      // TA applicants (pending/approved) belong on the application
      // screen — never the student invitation wall.
      const { data: app } = await supabase
        .from("ta_applications")
        .select("status")
        .eq("user_id", user.id)
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (app && app.status !== "rejected") redirect("/ta-apply");
      redirect("/join?missing=1");
    }
  }

  // Check if admin is also a TA (has section_tas assignments)
  let isAlsoTa = false;
  if (role === "admin") {
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
        role={role as "admin" | "ta" | "student"}
        isAlsoTa={isAlsoTa}
      >
        {children}
      </PortalShell>
    </ToastProvider>
  );
}
