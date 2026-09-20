import { notFound, redirect } from "next/navigation";
import { FriendsBracketVotePage } from "@/components/brackets";
import { requireCurrentUserPage } from "@/lib/auth/current-user";
import { bracket, bracketDirectory } from "@/lib/brackets";

export const metadata = { title: "Friends Vote | Brackeroni" };
export const dynamic = "force-dynamic";

export default async function FriendsBracketVoteRoute({ params }) {
  const { bracketId } = await params;
  const user = await requireCurrentUserPage(`/brackets/${bracketId}/vote`);
  const canAccess = await bracketDirectory().canAccessFriendsVotePage({
    bracketId,
    userId: user.id,
  });

  if (!canAccess) {
    notFound();
  }

  const result = await bracket({
    bracketId,
    userId: user.id,
  }).listMatches();

  if (result.bracket.creatorUserId === user.id) {
    redirect(`/brackets?stage=active&tournament=${encodeURIComponent(bracketId)}`);
  }

  return (
    <FriendsBracketVotePage
      initialTournament={result.bracket}
      initialMatches={result.matches}
    />
  );
}
