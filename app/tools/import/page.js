import { BookmarkletInstaller } from "@/components/bookmarklet-installer";
import { SectionCard } from "@/components/section-card";
import { requireCurrentUserPage } from "@/lib/auth/current-user";

export const metadata = {
  title: "Import Tools | Brackeroni"
};

export const dynamic = "force-dynamic";

export default async function ImportToolsPage() {
  await requireCurrentUserPage("/tools/import");

  const origin =
    process.env.NEXT_PUBLIC_APP_ORIGIN ||
    process.env.APP_ORIGIN ||
    "http://localhost:3000";

  return (
    <div className="space-y-6">
      <SectionCard title="Install Bookmarklet">
        <div className="px-5 py-5">
          <BookmarkletInstaller origin={origin} />
        </div>
      </SectionCard>
    </div>
  );
}
