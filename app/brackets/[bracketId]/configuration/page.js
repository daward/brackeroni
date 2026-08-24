import { NewBracketSetupPage } from "@/components/brackets";
import { requireCurrentUserPage } from "@/lib/auth/current-user";

export const metadata = { title: "Bracket Configuration | Brackeroni" };
export const dynamic = "force-dynamic";

export default async function BracketConfigurationPage({ params, searchParams }) {
  const { bracketId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (typeof value === "string") query.set(key, value);
  }

  const callbackPath = query.size ? `/brackets/${bracketId}/configuration?${query.toString()}` : `/brackets/${bracketId}/configuration`;
  await requireCurrentUserPage(callbackPath);
  return <NewBracketSetupPage draftId={bracketId} />;
}
