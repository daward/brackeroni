import { ImportPoolReview } from "@/components/import-pool-review";
import { requireCurrentUserPage } from "@/lib/auth/current-user";

export const metadata = {
  title: "Import Page | Brackeroni"
};

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  await requireCurrentUserPage("/import");
  return <ImportPoolReview />;
}
