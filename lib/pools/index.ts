import { getPoolById } from "@/lib/pools/internal/access";
import { importCandidatesIntoPool } from "@/lib/pools/internal/imports";
import {
  addCandidatesToPool,
  createCandidateInPool,
  enrichPoolCandidatesFromSourceUrls,
  removeCandidateFromPool,
  removeLowValueTagsFromPoolCandidates,
  removeTagFromPoolCandidates,
  updateCandidateInPool
} from "@/lib/pools/internal/candidates";
import { archivePool } from "@/lib/pools/internal/lifecycle";
import { favoritePool } from "@/lib/pools/internal/favorites";
import { mergePoolIntoPool } from "@/lib/pools/internal/merging";
import { updatePool } from "@/lib/pools/internal/details";
import type {
  PoolCandidateInput,
  PoolCandidatePatch,
  PoolHandle,
  PoolHandleOptions
} from "@/lib/pools/types";

export {
  listPools,
  listPublicPools
} from "@/lib/pools/internal/listing";

export {
  createPool
} from "@/lib/pools/internal/creation";

export function pool({
  poolId,
  viewerUserId,
  isAdmin = false
}: PoolHandleOptions): PoolHandle {
  return {
    get(options = {}) {
      return getPoolById({
        poolId,
        userId: viewerUserId,
        isAdmin,
        candidateLimit: options.candidateLimit,
        candidateOffset: options.candidateOffset
      });
    },

    update(patch) {
      if (!viewerUserId) {
        throw new Error("UNAUTHORIZED");
      }

      return updatePool({
        poolId,
        creatorUserId: viewerUserId,
        patch: { ...patch, isAdmin }
      });
    },

    archive() {
      if (!viewerUserId) {
        throw new Error("UNAUTHORIZED");
      }

      return archivePool({
        poolId,
        userId: viewerUserId,
        isAdmin
      });
    },

    favorite() {
      if (!viewerUserId) {
        throw new Error("UNAUTHORIZED");
      }

      return favoritePool({
        poolId,
        creatorUserId: viewerUserId
      });
    },

    mergeFromPool({ sourcePoolId }) {
      if (!viewerUserId) {
        throw new Error("UNAUTHORIZED");
      }

      return mergePoolIntoPool({
        poolId,
        sourcePoolId,
        creatorUserId: viewerUserId,
        isAdmin
      });
    },

    importCandidates({ candidates }) {
      if (!viewerUserId) {
        throw new Error("UNAUTHORIZED");
      }

      return importCandidatesIntoPool({
        poolId,
        creatorUserId: viewerUserId,
        candidates,
        isAdmin
      });
    },

    addCandidates({ candidateIds }) {
      if (!viewerUserId) {
        throw new Error("UNAUTHORIZED");
      }

      return addCandidatesToPool({
        poolId,
        creatorUserId: viewerUserId,
        candidateIds,
        isAdmin
      });
    },

    createCandidate(candidate: PoolCandidateInput) {
      if (!viewerUserId) {
        throw new Error("UNAUTHORIZED");
      }

      return createCandidateInPool({
        poolId,
        creatorUserId: viewerUserId,
        ...candidate,
        isAdmin
      });
    },

    candidate(candidateId) {
      return {
        update(patch: PoolCandidatePatch) {
          if (!viewerUserId) {
            throw new Error("UNAUTHORIZED");
          }

          return updateCandidateInPool({
            poolId,
            candidateId,
            creatorUserId: viewerUserId,
            patch,
            isAdmin
          });
        },

        remove() {
          if (!viewerUserId) {
            throw new Error("UNAUTHORIZED");
          }

          return removeCandidateFromPool({
            poolId,
            creatorUserId: viewerUserId,
            candidateId,
            isAdmin
          });
        }
      };
    },

    removeTagFromCandidates({ tag }) {
      if (!viewerUserId) {
        throw new Error("UNAUTHORIZED");
      }

      return removeTagFromPoolCandidates({
        poolId,
        creatorUserId: viewerUserId,
        tag,
        isAdmin
      });
    },

    removeLowValueTagsFromCandidates({ maxCandidateCount }) {
      if (!viewerUserId) {
        throw new Error("UNAUTHORIZED");
      }

      return removeLowValueTagsFromPoolCandidates({
        poolId,
        creatorUserId: viewerUserId,
        maxCandidateCount,
        isAdmin
      });
    },

    enrichCandidatesFromSourceUrls() {
      if (!viewerUserId) {
        throw new Error("UNAUTHORIZED");
      }

      return enrichPoolCandidatesFromSourceUrls({
        poolId,
        creatorUserId: viewerUserId,
        isAdmin
      });
    }
  };
}
