import { NewBracketSetupPage } from "@/components/new-bracket-setup-page";
import { requireCurrentUserPage } from "@/lib/auth/current-user";

export const metadata = { title: "New Bracket | Brackeroni" };
export const dynamic = "force-dynamic";

export default async function NewBracketPage({ searchParams }) {
  const params = (await searchParams) ?? {};
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      query.set(key, value);
    }
  }

  const callbackPath = query.size
    ? `/create/bracket/new?${query.toString()}`
    : "/create/bracket/new";

  await requireCurrentUserPage(callbackPath);
  return <NewBracketSetupPage />;
}
