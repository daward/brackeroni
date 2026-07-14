"use client";

import { requestJson } from "@/lib/client-api/http";

export function purgeArchivedMaterial() {
  return requestJson("/api/admin/archive", {
    method: "DELETE",
    errorMessage: "Admin action failed."
  });
}

export function updateAdminPool(poolId, patch) {
  return requestJson(`/api/admin/pools/${poolId}`, {
    method: "PATCH",
    body: patch,
    errorMessage: "Admin action failed."
  });
}

export function deleteArchivedAdminPool(poolId) {
  return requestJson(`/api/admin/pools/${poolId}`, {
    method: "DELETE",
    errorMessage: "Admin action failed."
  });
}

export function updateAdminTournament(tournamentId, patch) {
  return requestJson(`/api/admin/tournaments/${tournamentId}`, {
    method: "PATCH",
    body: patch,
    errorMessage: "Admin action failed."
  });
}

export function deleteArchivedAdminTournament(tournamentId) {
  return requestJson(`/api/admin/tournaments/${tournamentId}`, {
    method: "DELETE",
    errorMessage: "Admin action failed."
  });
}
