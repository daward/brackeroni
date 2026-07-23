"use client";

import { requestJson } from "@/lib/client-api/http";

export function listPools() {
  return requestJson("/api/pools", {
    cache: "no-store",
    errorMessage: "Failed to load pools."
  });
}

export function listBracketTemplates() {
  return requestJson("/api/bracket-templates", {
    cache: "no-store",
    errorMessage: "Failed to load bracket templates."
  });
}

export function createBracketTemplate(payload) {
  return requestJson("/api/bracket-templates", {
    method: "POST",
    body: payload,
    errorMessage: "Failed to create bracket template."
  });
}

export function updateBracketTemplate(templateId, patch) {
  return requestJson(`/api/bracket-templates/${templateId}`, {
    method: "PATCH",
    body: patch,
    errorMessage: "Failed to update bracket template."
  });
}

export function getPool(poolId) {
  return requestJson(`/api/pools/${poolId}`, {
    cache: "no-store",
    errorMessage: "Failed to load pool."
  });
}

export function createPool(payload) {
  return requestJson("/api/pools", {
    method: "POST",
    body: payload,
    errorMessage: "Failed to create pool."
  });
}

export function updatePool(poolId, patch) {
  return requestJson(`/api/pools/${poolId}`, {
    method: "PATCH",
    body: patch,
    errorMessage: "Failed to update pool."
  });
}

export function removeTagFromPoolCandidates(poolId, removeTag) {
  return requestJson(`/api/pools/${poolId}`, {
    method: "PATCH",
    body: { removeTag },
    errorMessage: "Failed to remove tag from pool candidates."
  });
}

export function removeLowValueTagsFromPoolCandidates(poolId, removeTagsAtOrBelowCount) {
  return requestJson(`/api/pools/${poolId}`, {
    method: "PATCH",
    body: { removeTagsAtOrBelowCount },
    errorMessage: "Failed to remove low-value tags from pool candidates."
  });
}

export function enrichPoolCandidatesFromSourceUrls(poolId) {
  return requestJson(`/api/pools/${poolId}`, {
    method: "PATCH",
    body: { enrichFromSourceUrls: true },
    errorMessage: "Failed to enrich candidates from source URLs."
  });
}

export function archivePool(poolId) {
  return requestJson(`/api/pools/${poolId}`, {
    method: "DELETE",
    errorMessage: "Failed to archive pool."
  });
}

export function favoritePool(poolId) {
  return requestJson(`/api/pools/${poolId}/favorites`, {
    method: "POST",
    errorMessage: "Failed to add pool to favorites."
  });
}

export function mergePoolIntoPool(poolId, sourcePoolId) {
  return requestJson(`/api/pools/${poolId}/imports`, {
    method: "POST",
    body: { sourcePoolId },
    errorMessage: "Failed to merge pools."
  });
}

export function createCandidateInPool(poolId, payload) {
  return requestJson(`/api/pools/${poolId}/candidates`, {
    method: "POST",
    body: payload,
    errorMessage: "Failed to create candidate."
  });
}

export function updateCandidateInPool(poolId, candidateId, patch) {
  return requestJson(`/api/pools/${poolId}/candidates/${candidateId}`, {
    method: "PATCH",
    body: patch,
    errorMessage: "Failed to update candidate."
  });
}

export function removeCandidateFromPool(poolId, candidateId) {
  return requestJson(`/api/pools/${poolId}/candidates/${candidateId}`, {
    method: "DELETE",
    errorMessage: "Failed to remove candidate from pool."
  });
}

export function listTournaments() {
  return requestJson("/api/tournaments", {
    cache: "no-store",
    errorMessage: "Failed to load brackets."
  });
}

export function createTournament(payload) {
  return requestJson("/api/tournaments", {
    method: "POST",
    body: payload,
    errorMessage: "Failed to create bracket."
  });
}

export function updateTournament(tournamentId, patch) {
  return requestJson(`/api/tournaments/${tournamentId}`, {
    method: "PATCH",
    body: patch,
    errorMessage: "Failed to update bracket."
  });
}

export function deleteTournament(tournamentId) {
  return requestJson(`/api/tournaments/${tournamentId}`, {
    method: "DELETE",
    errorMessage: "Failed to delete bracket."
  });
}

export function archiveTournament(tournamentId) {
  return deleteTournament(tournamentId);
}

export function syncTournamentWithPool(tournamentId) {
  return updateTournament(tournamentId, { syncWithPool: true });
}

export function closeCurrentTournamentRound(tournamentId) {
  return updateTournament(tournamentId, { closeCurrentRound: true });
}

export function setTournamentMatchWinner(matchId, winnerEntryId) {
  return requestJson(`/api/matches/${matchId}`, {
    method: "PATCH",
    body: { winnerEntryId },
    errorMessage: "Failed to update match winner."
  });
}

export function startTournament(tournamentId) {
  return updateTournament(tournamentId, { status: "active" });
}

export function rerunTournament(tournamentId) {
  return requestJson(`/api/tournaments/${tournamentId}/rerun-drafts`, {
    method: "POST",
    errorMessage: "Failed to create rerun."
  });
}

export function listTournamentInvites(tournamentId) {
  return requestJson(`/api/tournaments/${tournamentId}/invites`, {
    cache: "no-store",
    errorMessage: "Failed to load invitees."
  });
}

export function listTournamentShareLinks(tournamentId) {
  return requestJson(`/api/tournaments/${tournamentId}/links`, {
    cache: "no-store",
    errorMessage: "Failed to load share links."
  });
}

export function ensureTournamentShareLink(tournamentId, { rotate = false } = {}) {
  return requestJson(`/api/tournaments/${tournamentId}/links`, {
    method: "POST",
    body: rotate ? { rotate: true } : {},
    errorMessage: "Failed to prepare share link."
  });
}

export function listTournamentEntries(tournamentId) {
  return requestJson(`/api/tournaments/${tournamentId}/entries`, {
    cache: "no-store",
    errorMessage: "Failed to load bracket seeding."
  });
}

export function revealTournamentRound(roundId) {
  return requestJson(`/api/rounds/${roundId}`, {
    method: "PATCH",
    body: { revealed: true },
    errorMessage: "Failed to reveal round."
  });
}

export function updateTournamentEntries(tournamentId, entries, seedingStructure) {
  return requestJson(`/api/tournaments/${tournamentId}/entries`, {
    method: "PATCH",
    body: { entries, seedingStructure },
    errorMessage: "Failed to save bracket seeding."
  });
}

export function listParallelTournaments() {
  return requestJson("/api/parallel-tournaments", {
    cache: "no-store",
    errorMessage: "Failed to load parallel brackets."
  });
}

export function getParallelTournament(parallelTournamentId) {
  return requestJson(`/api/parallel-tournaments/${parallelTournamentId}`, {
    cache: "no-store",
    errorMessage: "Failed to load parallel bracket."
  });
}

export function createParallelTournament(payload) {
  return requestJson("/api/parallel-tournaments", {
    method: "POST",
    body: payload,
    errorMessage: "Failed to create parallel bracket."
  });
}

export function updateParallelTournament(parallelTournamentId, patch) {
  return requestJson(`/api/parallel-tournaments/${parallelTournamentId}`, {
    method: "PATCH",
    body: patch,
    errorMessage: "Failed to update parallel bracket."
  });
}

export function archiveParallelTournament(parallelTournamentId) {
  return requestJson(`/api/parallel-tournaments/${parallelTournamentId}`, {
    method: "DELETE",
    errorMessage: "Failed to archive parallel bracket."
  });
}

export function startParallelTournament(parallelTournamentId) {
  return updateParallelTournament(parallelTournamentId, { status: "active" });
}

export function listParallelTournamentShareLinks(parallelTournamentId) {
  return requestJson(`/api/parallel-tournaments/${parallelTournamentId}/links`, {
    cache: "no-store",
    errorMessage: "Failed to load share links."
  });
}

export function ensureParallelTournamentShareLink(parallelTournamentId, { rotate = false } = {}) {
  return requestJson(`/api/parallel-tournaments/${parallelTournamentId}/links`, {
    method: "POST",
    body: rotate ? { rotate: true } : {},
    errorMessage: "Failed to prepare share link."
  });
}

export function suggestImages(query) {
  return requestJson(`/api/image-suggestions?q=${encodeURIComponent(query)}`, {
    cache: "no-store",
    errorMessage: "Failed to fetch image suggestions."
  });
}
