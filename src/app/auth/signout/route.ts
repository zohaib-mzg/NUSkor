import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = createClient();
  await supabase.auth.signOut();
  return redirect("/login");
}

export async function GET() {
  const supabase = createClient();
  await supabase.auth.signOut();
  const res = NextResponse.redirect(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  );
  return res;
}