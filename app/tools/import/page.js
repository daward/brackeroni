import { BookmarkletInstaller } from "@/components/bookmarklet-installer";
import { SectionCard } from "@/components/section-card";
import { requireCurrentUserPage } from "@/lib/auth/current-user";
import { resolvePreferredOrigin } from "@/lib/app-origin";
import { headers } from "next/headers";

export const metadata = {
  title: "Import Tools | Brackeroni"
};

export const dynamic = "force-dynamic";

async function resolveAppOrigin() {
  const requestHeaders = await headers();
  return resolvePreferredOrigin({
    configuredOrigin: process.env.NEXT_PUBLIC_APP_ORIGIN || process.env.APP_ORIGIN,
    forwardedProto: requestHeaders.get("x-forwarded-proto"),
    forwardedHost: requestHeaders.get("x-forwarded-host"),
    host: requestHeaders.get("host")
  });
}

export default async function ImportToolsPage({ searchParams }) {
  await requireCurrentUserPage("/tools/import");

  const resolvedSearchParams = await searchParams;
  const poolId =
    typeof resolvedSearchParams?.poolId === "string" ? resolvedSearchParams.poolId : null;
  const poolName =
    typeof resolvedSearchParams?.poolName === "string" ? resolvedSearchParams.poolName : null;

  const origin = await resolveAppOrigin();

  return (
    <div className="space-y-6">
      <SectionCard title="Install Bookmarklet">
        <div className="px-5 py-5">
          <BookmarkletInstaller origin={origin} poolId={poolId} poolName={poolName} />
        </div>
      </SectionCard>
    </div>
  );
}
