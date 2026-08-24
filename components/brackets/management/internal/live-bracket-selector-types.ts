import type { TournamentInvitesState, TournamentMatchesState, WorkspaceTournament } from "./workspace-internal-types";

export type LiveBracketSelectorProps = {
  tournaments: WorkspaceTournament[];
  tournamentInvites: TournamentInvitesState;
  tournamentMatches: TournamentMatchesState;
  selectedTournamentId: string | null;
  onSelectTournament: (tournamentId: string) => void;
  className?: string;
};
