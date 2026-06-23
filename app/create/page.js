import { CreatePanels } from "@/components/create-panels";
import { requireCurrentUserPage } from "@/lib/auth/current-user";

export const metadata = {
  title: "Create | Brackeroni"
};

export const dynamic = "force-dynamic";

export default async function CreatePage() {
  await requireCurrentUserPage("/create");
  return <CreatePanels />;
}
