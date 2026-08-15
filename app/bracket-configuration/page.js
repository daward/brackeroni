import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LegacyBracketConfigurationPage({ searchParams }) {
  const params = (await searchParams) ?? {};
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value);
  }

  redirect(query.size ? `/brackets/configuration?${query.toString()}` : "/brackets/configuration");
}