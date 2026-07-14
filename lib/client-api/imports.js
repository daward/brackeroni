"use client";

import { requestJson } from "@/lib/client-api/http";

export function createImportedPool(payload) {
  return requestJson("/api/pools", {
    method: "POST",
    body: payload,
    errorMessage: "Import failed."
  });
}

export function importCandidatesIntoPool(poolId, payload) {
  return requestJson(`/api/pools/${poolId}/imports`, {
    method: "POST",
    body: payload,
    errorMessage: "Import failed."
  });
}
