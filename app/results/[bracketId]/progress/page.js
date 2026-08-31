import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { bracketId } = await params;

  return {
    title: `Rounds | ${bracketId} | Brackeroni`
  };
}

export default async function ProgressPage({ params }) {
  const { bracketId } = await params;
  redirect(`/results/${bracketId}?view=rounds`);
}
