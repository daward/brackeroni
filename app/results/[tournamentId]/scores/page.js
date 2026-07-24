import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { tournamentId } = await params;

  return {
    title: `Scoring | ${tournamentId} | Brackeroni`
  };
}

export default async function TournamentScoringRoute({ params }) {
  const { tournamentId } = await params;
  redirect(`/results/${tournamentId}?view=scoring`);
}
