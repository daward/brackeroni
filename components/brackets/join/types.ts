/** Public contracts for bracket invite join and waiting-room UI. */

export type ShareLinkAccessState = "waiting" | "active" | "complete" | "link_inactive" | "not_invited";

export type ShareLinkAccessItem = {
  title: string;
  creatorName: string;
  accessState: ShareLinkAccessState;
  votePath: string;
  resultsPath: string;
};

export type ShareLinkWaitingRoomProps = {
  token: string;
  initialItem: ShareLinkAccessItem;
};

export type BracketJoinPageProps = {
  params: Promise<{
    token: string;
  }>;
};
