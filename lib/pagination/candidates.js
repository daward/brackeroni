import { reconcileInitialPage } from "@/lib/pagination/collection";

export function mergeInitialCandidatePage(current, previousInitialIds, nextInitialPage) {
  return reconcileInitialPage(current, previousInitialIds, nextInitialPage);
}
