/** Public contracts for reusable pool presentation and management components. */
import type { Pagination } from "@/lib/pagination/types";
import type { ManagedPool, PoolCandidate, PoolDraft, PoolVisibility, PublicPool } from "@/lib/pools/types";
import type { MouseEvent, ReactNode } from "react";
export type { Pagination } from "@/lib/pagination/types";
export type { ManagedPool, PoolCandidate, PoolDraft, PoolVisibility, PublicPool } from "@/lib/pools/types";

/** Inputs for the compact candidate card used in editable pool layouts. */
export type CandidatePoolCardProps = {
  candidate: PoolCandidate;
  readOnly?: boolean;
  expanded?: boolean;
  removing?: boolean;
  onActivate?: () => void;
  onRemove?: (event: MouseEvent<HTMLButtonElement>) => void;
};

/** Inputs for a compact, optionally truncated, list of candidate tags. */
export type CandidateTagListProps = {
  tags?: string[] | null;
  className?: string;
  limit?: number | null;
};

/** An imported source and its optional human-readable title. */
export type PoolSourceInfoProps = {
  sourceUrl?: string | null;
  sourceTitle?: string | null;
};

/** Props for the published pool's read-only candidate grid. */
export type PublicPoolCandidatesProps = {
  poolId: string;
  initialCandidates: PoolCandidate[];
  initialPagination?: Pagination | null;
};

/** Configuration for a public-pool card. */
export type PublicPoolCardProps = {
  pool: PublicPool;
  href?: string | null;
  favoriteMode?: "create" | "inline";
  signedIn?: boolean;
  fillContainer?: boolean;
};

/** Props for the warning shown before a pool becomes immutable. */
export type PoolPublishWarningProps = {
  visibility: PoolVisibility;
};

export type PoolVisibilityPickerProps = {
  value: PoolVisibility;
  onChange: (visibility: PoolVisibility) => void;
  compact?: boolean;
};

export type PoolManagementPanelProps = {
  pool: ManagedPool | null;
  draft?: Partial<PoolDraft> | null;
  readOnly?: boolean;
  presentation?: {
    title?: { show?: boolean; placeholder?: string };
    summary?: { show?: boolean; visibility?: boolean };
    details?: { compact?: boolean; showRule?: boolean };
    showPanelRule?: boolean;
  };
  onDraftChange?: (draft: PoolDraft) => void;
  onDraftCommit?: (draft: PoolDraft) => void;
  actionRail?: ReactNode;
  actionBar?: ReactNode;
  children?: ReactNode;
  className?: string;
};
