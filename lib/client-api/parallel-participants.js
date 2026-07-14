"use client";

import { requestJson } from "@/lib/client-api/http";

export function openMyParallelBracket(parallelTournamentId) {
  return requestJson(`/api/parallel-tournaments/${parallelTournamentId}/participants/me`, {
    method: "POST",
    errorMessage: "Failed to open your bracket."
  });
}
