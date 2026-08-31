import { notFound } from "next/navigation";
import { getCurrentUser, requireCurrentUserPage } from "@/lib/auth/current-user";
import { shareLink } from "@/lib/brackets";
import type { BracketJoinPageProps } from "../types";
import { ShareLinkWaitingRoom } from "./share-link-waiting-room";

export async function BracketJoinPage({ params }: BracketJoinPageProps) {
  const { token } = await params;
  await requireCurrentUserPage(`/join/${token}`);
  const user = await getCurrentUser();

  try {
    const item = await shareLink({
      token,
      userId: user.id,
    }).getTarget();

    return <ShareLinkWaitingRoom token={token} initialItem={item} />;
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      notFound();
    }

    throw error;
  }
}
