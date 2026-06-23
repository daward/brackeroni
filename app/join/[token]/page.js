import { notFound } from "next/navigation";
import { ShareLinkWaitingRoom } from "@/components/share-link-waiting-room";
import { getCurrentUser, requireCurrentUserPage } from "@/lib/auth/current-user";
import { getTournamentByShareToken } from "@/lib/data/tournaments";

export const metadata = {
  title: "Join Bracket | Brackeroni"
};

export const dynamic = "force-dynamic";

export default async function JoinBracketPage({ params }) {
  const { token } = await params;
  await requireCurrentUserPage(`/join/${token}`);
  const user = await getCurrentUser();

  try {
    const item = await getTournamentByShareToken({
      token,
      userId: user.id
    });

    return <ShareLinkWaitingRoom token={token} initialItem={item} />;
  } catch (error) {
    if (error.message === "NOT_FOUND") {
      notFound();
    }

    throw error;
  }
}
