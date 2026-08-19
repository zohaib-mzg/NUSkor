import JoinClient from "./JoinClient";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  return <JoinClient initialToken={searchParams.token ?? ""} />;
}