import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { bracketId } = await params;

  return {
    title: `Scoring | ${bracketId} | Brackeroni`
  };
}

export default async function TournamentScoringRoute({ params }) {
  const { bracketId } = await params;
  redirect(`/results/${bracketId}?view=scoring`);
}
