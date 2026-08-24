/**
 * Public route-level UI for joining bracket invites.
 *
 * The `/join/[token]` route enters the bracket application through this
 * feature root; waiting-room implementation details stay private.
 */
export { BracketJoinPage } from "./internal/join-page";
export { ShareLinkWaitingRoom } from "./internal/share-link-waiting-room";
export type { BracketJoinPageProps, ShareLinkAccessItem, ShareLinkWaitingRoomProps } from "./types";
