import { getShareLinkTarget } from "@/lib/brackets/internal/share-links";

type GetShareLinkTargetOptions = Parameters<typeof getShareLinkTarget>[0];

export function shareLinks() {
  return {
    getTarget: (options: GetShareLinkTargetOptions) => getShareLinkTarget(options),
  };
}
