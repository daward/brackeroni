import { CreatePanels } from "@/components/create-panels";
import { requireCurrentUserPage } from "@/lib/auth/current-user";

export const metadata = {
  title: "Create | Brackeroni"
};

export const dynamic = "force-dynamic";

export default async function CreatePage({ searchParams }) {
  const params = (await searchParams) ?? {};
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      query.set(key, value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        query.append(key, item);
      }
    }
  }

  const callbackPath = query.size > 0 ? `/create?${query.toString()}` : "/create";
  await requireCurrentUserPage(callbackPath);
  return <CreatePanels />;
}
