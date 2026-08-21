import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TaApplyClient from "./TaApplyClient";

export const dynamic = "force-dynamic";

export default async function TaApplyPage() {
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
  if (profile.role === "admin") redirect("/admin");
  if (profile.role === "ta") redirect("/dashboard");

  const { data: app } = await supabase
    .from("ta_applications")
    .select("id, status, requested_at, rejection_reason")
    .eq("user_id", user.id)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <TaApplyClient
      userId={user.id}
      email={profile.email}
      fullName={profile.full_name}
      application={app ?? null}
    />
  );
}
