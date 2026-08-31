import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { parallelBracketId } = await params;

  return {
    title: `Parallel Bracket | ${parallelBracketId} | Brackeroni`
  };
}

export default async function ParallelBracketPage({ params }) {
  const { parallelBracketId } = await params;
  redirect(`/vote?parallelBracket=${parallelBracketId}`);
}
