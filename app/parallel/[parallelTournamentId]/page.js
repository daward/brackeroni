import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { parallelTournamentId } = await params;

  return {
    title: `Parallel Bracket | ${parallelTournamentId} | Brackeroni`
  };
}

export default async function ParallelBracketPage({ params }) {
  const { parallelTournamentId } = await params;
  redirect(`/vote?parallelTournament=${parallelTournamentId}`);
}
