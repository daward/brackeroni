import { NewBracketSetupPage } from "@/components/new-bracket-setup-page";
import { requireCurrentUserPage } from "@/lib/auth/current-user";

export const metadata = { title: "New Bracket | Brackeroni" };
export const dynamic = "force-dynamic";

export default async function NewBracketPage() {
  await requireCurrentUserPage("/create/bracket/new");
  return <NewBracketSetupPage />;
}
