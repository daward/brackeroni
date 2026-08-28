/**
 * Public UI for shared pool presentation and management components.
 *
 * Import reusable pool UI only from this feature root; implementation details
 * remain private to `internal/`.
 */
export { CandidatePoolCard } from "./internal/candidate-pool-card";
export { CandidateTagList } from "./internal/candidate-tag-list";
export { PoolManagementPanel, PoolVisibilityPicker } from "./internal/pool-management-panel";
export { PoolPublishWarning } from "./internal/pool-presentation";
export { PoolSourceInfo } from "./internal/pool-source-info";
export { PublicPoolCandidates } from "./internal/public-pool-candidates";
export { PublicPoolCard } from "./internal/public-pool-card";
export { usePoolCandidateActions } from "./internal/use-pool-candidate-actions";
export { getAutomaticImageSuggestionQuery, isStrongSuggestedImageMatch } from "./internal/image-suggestions";
export {
  describePoolVisibility,
  isGeneratedPoolSourceDescription,
  normalizePoolNavigationTarget,
  sortManagedPools,
} from "./internal/pool-workspace-helpers";
export type {
  CandidatePoolCardProps,
  CandidateTagListProps,
  ManagedPool,
  Pagination,
  PoolCandidate,
  PoolDraft,
  PoolManagementPanelProps,
  PoolPublishWarningProps,
  PoolSourceInfoProps,
  PoolVisibility,
  PoolVisibilityPickerProps,
  PublicPool,
  PublicPoolCandidatesProps,
  PublicPoolCardProps,
} from "./types";
