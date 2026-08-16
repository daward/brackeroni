import { NewBracketSetupPage } from "@/components/brackets/configuration/new-bracket-setup-page";
import { requireCurrentUserPage } from "@/lib/auth/current-user";

export const metadata = { title: "Bracket Configuration | Brackeroni" };
export const dynamic = "force-dynamic";

export default async function BracketConfigurationPage({ params }) {
  const { bracketId } = await params;
  await requireCurrentUserPage(`/brackets/${bracketId}/configuration`);
  return <NewBracketSetupPage draftId={bracketId} />;
}