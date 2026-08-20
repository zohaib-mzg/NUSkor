import JoinClient from "./JoinClient";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: { token?: string; missing?: string };
}) {
  return (
    <JoinClient
      initialToken={searchParams.token ?? ""}
      missing={searchParams.missing === "1"}
    />
  );
}