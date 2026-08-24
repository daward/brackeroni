import type { Dispatch, RefObject, SetStateAction } from "react";
import type { CandidateDraft, ImageSuggestion, PoolCandidate } from "@/components/pools/candidates";
import type { BracketDraft, BracketInvite, BracketMatch, BracketStatus, ManagedBracket } from "@/lib/brackets/types";
import type { ManagedPool, PoolDetail } from "@/lib/pools/types";

export type BracketStageView = Extract<BracketStatus, "draft" | "active" | "complete">;
export type WorkspaceTournament = ManagedBracket & {
  parentParallelTournamentId?: string | null;
  completedAt?: string | Date | null;
  archivedAt?: string | Date | null;
  updatedAt?: string | Date | null;
  startedAt?: string | Date | null;
  description?: string | null;
};
export type WorkspacePool = ManagedPool & { id: string };
export type WorkspacePoolDetail = PoolDetail;
export type WorkspaceMatch = BracketMatch & {
  roundId?: string | null;
  roundNumber?: number | null;
  subBracketName?: string | null;
};
export type WorkspaceInvite = BracketInvite & {
  userId?: string | null;
  anonymousVoterToken?: string | null;
};
export type WorkspaceShareLink = {
  id: string;
  token?: string | null;
  url?: string | null;
  active?: boolean;
  createdAt?: string | Date | null;
};
export type ActionState = Record<string, boolean>;
export type TournamentDrafts = Record<string, Partial<BracketDraft> & { description?: string | null }>;
export type CandidateDrafts = Record<string, CandidateDraft>;
export type CandidateEditorState = {
  poolId: string;
  candidateId?: string | null;
  mode?: "create" | "edit";
} | null;
export type PoolInlineDrafts = Record<string, { name: string; description: string }>;
export type ImageSuggestionState = Record<string, ImageSuggestion[]>;
export type ImageSuggestionLoadingState = Record<string, boolean>;
export type PoolDetailsState = Record<string, WorkspacePoolDetail | WorkspacePool>;
export type TournamentInvitesState = Record<string, WorkspaceInvite[]>;
export type TournamentShareLinksState = Record<string, WorkspaceShareLink[]>;
export type TournamentMatchesState = Record<string, WorkspaceMatch[]>;
export type TournamentCardRefs = RefObject<Record<string, HTMLDivElement | null>>;
export type MessageSetter = Dispatch<SetStateAction<string>>;
export type ActionMarker = (actionKey: string) => void;
export type PendingActionChecker = (actionKey: string) => boolean;
export type LoadWorkspace = (options?: { force?: boolean }) => Promise<void>;
export type SetWorkspaceView = (view: "tournaments" | "pools") => void;
export type SetStageView = (stage: BracketStageView) => void;
export type SetNullableId = Dispatch<SetStateAction<string | null>>;
export type SetExpandedDraftId = Dispatch<SetStateAction<string | "all" | null>>;
export type SetBooleanRecord = Dispatch<SetStateAction<Record<string, boolean>>>;
export type SetTournamentDrafts = Dispatch<SetStateAction<TournamentDrafts>>;
export type SetPoolInlineDrafts = Dispatch<SetStateAction<PoolInlineDrafts>>;
export type ReplaceTournament = (tournamentId: string, tournament: WorkspaceTournament) => void;
export type ReplaceTournamentMatch = (tournamentId: string, match: WorkspaceMatch) => void;
export type RefreshTournamentMatches = (tournamentId: string) => Promise<WorkspaceMatch[]>;
export type ReplacePool = (pool: WorkspacePoolDetail | WorkspacePool) => void;
export type ReplaceCandidate = (poolId: string, candidate: PoolCandidate) => void;
export type RemoveCandidate = (poolId: string, candidateId: string) => void;

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message || fallback : fallback;
}
