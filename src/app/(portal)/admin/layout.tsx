import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL =
  (process.env.ADMIN_EMAIL ?? "").toLowerCase() || "l242530@lhr.nu.edu.pk";

export default async function AdminGuardLayout({
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
    .select("id, email, role")
    .eq("id", user.id)
    .maybeSingle();

  const email = (profile?.email ?? "").toLowerCase();
  const role = profile?.role;

  // Force admin role if email matches
  if (email === ADMIN_EMAIL && role !== "admin") {
    await supabase
      .from("profiles")
      .upsert({ id: user.id, role: "admin" }, { onConflict: "id" });
    return <>{children}</>;
  }

  if (role !== "admin") redirect("/dashboard");

  return <>{children}</>;
}
