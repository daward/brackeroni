import { PoolManagementWorkspace } from "@/components/pools/management";
import { requireCurrentUserPage } from "@/lib/auth/current-user";

export const metadata = { title: "Pools | Brackeroni" };
export const dynamic = "force-dynamic";

export default async function PoolsWorkspacePage() {
  await requireCurrentUserPage("/pools");
  return <PoolManagementWorkspace />;
}
