import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { requireAdminPage } from "@/lib/auth/admin";
import { listAdminPools, listAdminTournaments } from "@/lib/admin";

export const metadata = {
  title: "Admin | Brackeroni"
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdminPage("/admin");
  const [pools, tournaments] = await Promise.all([listAdminPools(), listAdminTournaments()]);

  return <AdminDashboard pools={pools} tournaments={tournaments} />;
}
