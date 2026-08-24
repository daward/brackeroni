import type { Dispatch, RefObject, SetStateAction } from "react";
import type { CandidateDraft, ImageSuggestion, PoolCandidate } from "@/components/pools/candidates";
import type { BracketDraft, BracketInvite, BracketMatch, BracketStatus, ManagedBracket } from "@/lib/brackets/types";
import type { ManagedPool, PoolDetail } from "@/lib/pools/types";

export type BracketStageView = Extract<BracketStatus, "draft" | "active" | "complete">;
export type WorkspaceTournament = ManagedBracket & Record<string, any>;
export type WorkspacePool = ManagedPool & { id: string };
export type WorkspacePoolDetail = PoolDetail & Record<string, any>;
export type WorkspaceMatch = BracketMatch & Record<string, any>;
export type WorkspaceInvite = BracketInvite & Record<string, any>;
export type WorkspaceShareLink = { id: string } & Record<string, any>;
export type ActionState = Record<string, boolean>;
export type TournamentDrafts = Record<string, Partial<BracketDraft> & Record<string, any>>;
export type CandidateDrafts = Record<string, CandidateDraft>;
export type CandidateEditorState = Record<string, any> | null;
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
export type ReplaceCandidate = (poolId: string, candidate: PoolCandidate & Record<string, any>) => void;
export type RemoveCandidate = (poolId: string, candidateId: string) => void;

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message || fallback : fallback;
}
