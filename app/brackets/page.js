import { BracketManagementWorkspace } from "@/components/brackets";
import { requireCurrentUserPage } from "@/lib/auth/current-user";

export const metadata = { title: "Brackets | Brackeroni" };
export const dynamic = "force-dynamic";

export default async function BracketsWorkspacePage() {
  await requireCurrentUserPage("/brackets");
  return <BracketManagementWorkspace />;
}
