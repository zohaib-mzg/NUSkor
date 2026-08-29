import { createClient } from "@/lib/supabase/server";
import InviteClient from "./InviteClient";
import type { InviteDetails } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: { token: string };
}) {
  const token = params.token;
  let details: InviteDetails | null = null;
  let errorMessage: string | null = null;

  const supabase = createClient();
  const { data, error: err } = await supabase.rpc("get_invite_details", {
    p_token: token,
  });

  if (!err && data) {
    details = data as InviteDetails;
  } else {
    errorMessage = err?.message ?? "This invitation is no longer valid";
  }

  return (
    <InviteClient token={token} details={details} errorMessage={errorMessage} />
  );
}