import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LegacyCreatePage({ searchParams }) {
  const params = (await searchParams) ?? {};
  const poolId = typeof params.pool === "string" ? params.pool : null;
  const view = typeof params.view === "string" ? params.view : "tournaments";
  const stage = typeof params.stage === "string" ? params.stage : null;

  if (poolId) {
    redirect(`/pools/${poolId}`);
  }

  if (view === "pools") {
    redirect("/pools");
  }

  redirect(stage ? `/brackets?stage=${encodeURIComponent(stage)}` : "/brackets");
}