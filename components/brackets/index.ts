/**
 * Public application surface for bracket routes and bracket-owned UI.
 *
 * Runtime code outside `components/brackets` should import bracket UI from this
 * root instead of coupling to management, configuration, voting, join, results,
 * progress, or shared subfeature folders.
 */
export { NewBracketSetupPage } from "./configuration";
export { BracketJoinPage } from "./join";
export { BracketManagementWorkspace } from "./management";
export { BracketOutcomeNav, BracketProgressPage } from "./progress";
export { ParallelResultsPage, ResultsLinkedViewSelect, TournamentResultsPage, TournamentScoringPage } from "./results";
export { CompletedBracketCard, TournamentPublishWarning } from "./shared";
export { default as BracketVotingPage } from "./voting";
export type { BracketJoinPageProps, ShareLinkAccessItem, ShareLinkWaitingRoomProps } from "./join";
export type { BracketOutcomeNavProps, BracketOutcomeView, BracketProgressMatch, BracketProgressPageProps, BracketProgressRound, BracketProgressTournament } from "./progress";
export type { ParallelResultsPageProps, ResultsLinkedViewOption, ResultsLinkedViewSelectProps, TournamentResultsPageProps, TournamentScoringPageProps } from "./results";
export type { CompletedBracketCardProps, TournamentPublishWarningProps } from "./shared";
