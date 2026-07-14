"use client";

import { requestJson } from "@/lib/client-api/http";

export function getShareLinkAccess(token) {
  return requestJson(`/api/share-links/${token}`, {
    cache: "no-store",
    errorMessage: "Failed to refresh invite."
  });
}
