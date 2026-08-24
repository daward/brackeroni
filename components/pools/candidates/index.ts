/**
 * Public UI for creating, editing, listing, and tagging pool candidates.
 *
 * Import candidate management UI only from this feature root; implementation
 * details remain private to `internal/`.
 */
export { CandidateManagerPanel } from "./internal/candidate-manager-panel";
export { PaginatedCandidateManagerPanel } from "./internal/paginated-candidate-manager-panel";
export { usePaginatedCandidates } from "./internal/use-paginated-candidates";
export type {
  CandidateActions,
  CandidateCollection,
  CandidateDraft,
  CandidateEditor,
  CandidateManagerProps,
  CandidateManagerView,
  CandidatePaginationSource,
  CandidateTagManagement,
  ImageSuggestion,
} from "./types";
export type { PoolCandidate } from "@/lib/pools/types";
