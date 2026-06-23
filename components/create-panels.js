"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { SectionCard } from "@/components/section-card";

const emptyCandidateForm = {
  name: "",
  description: "",
  imageUrl: ""
};

const emptyPoolForm = {
  name: "",
  description: ""
};

const emptyTournamentForm = {
  title: "",
  sourcePoolId: "",
  sharingMode: "private",
  playStyle: "fixed_bracket",
  resultMode: "winner_only",
  tieBreakMode: "higher_seed_wins"
};

function proxiedImageUrl(url) {
  if (!url) {
    return "";
  }

  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

function InlineTitleField({ autoFocus = false, value, onChange, onBlur, onKeyDown }) {
  return (
    <input
      autoFocus={autoFocus}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      className="-mx-3 block w-[calc(100%+1.5rem)] border border-[var(--line)] bg-transparent px-3 py-2 text-[var(--ink)] outline-none focus:border-[var(--accent-3)]"
      style={{
        fontFamily: '"Arial Narrow", Arial, Helvetica, sans-serif',
        fontSize: "24px",
        fontWeight: 900,
        lineHeight: 1
      }}
    />
  );
}

function SuggestionThumbnail({ imageUrl, title }) {
  const [imageFailed, setImageFailed] = useState(false);

  if (!imageUrl || imageFailed) {
    return null;
  }

  return (
    <div className="h-24 w-full bg-[var(--panel-2)]">
      <img
        src={proxiedImageUrl(imageUrl)}
        alt={title}
        className="h-full w-full object-cover"
        onError={() => setImageFailed(true)}
      />
    </div>
  );
}

export function CreatePanels() {
  const [pools, setPools] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [poolDetails, setPoolDetails] = useState({});
  const [expandedPoolId, setExpandedPoolId] = useState(null);
  const [isPoolModalOpen, setIsPoolModalOpen] = useState(false);
  const [isTournamentModalOpen, setIsTournamentModalOpen] = useState(false);
  const [editingPool, setEditingPool] = useState(null);
  const [poolEditForm, setPoolEditForm] = useState(emptyPoolForm);
  const [seedingTournament, setSeedingTournament] = useState(null);
  const [seedingEntries, setSeedingEntries] = useState([]);
  const [seedingLoading, setSeedingLoading] = useState(false);
  const [savingSeeding, setSavingSeeding] = useState(false);
  const [draggingEntryId, setDraggingEntryId] = useState(null);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [candidateDrafts, setCandidateDrafts] = useState({});
  const [imageSuggestions, setImageSuggestions] = useState({});
  const [imageSuggestionLoading, setImageSuggestionLoading] = useState({});
  const [imageSuggestionQuery, setImageSuggestionQuery] = useState({});
  const [poolForm, setPoolForm] = useState(emptyPoolForm);
  const [tournamentForm, setTournamentForm] = useState(emptyTournamentForm);
  const [poolInlineDrafts, setPoolInlineDrafts] = useState({});
  const [tournamentInlineDrafts, setTournamentInlineDrafts] = useState({});
  const [workspaceView, setWorkspaceView] = useState("tournaments");
  const [expandedDraftTournamentId, setExpandedDraftTournamentId] = useState("all");
  const [editingTournamentTitleId, setEditingTournamentTitleId] = useState(null);
  const [expandedBracketRules, setExpandedBracketRules] = useState({});
  const [poolSelectionMode, setPoolSelectionMode] = useState({});
  const [recentlySavedBrackets, setRecentlySavedBrackets] = useState({});
  const [tournamentInvites, setTournamentInvites] = useState({});
  const [tournamentShareLinks, setTournamentShareLinks] = useState({});
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [pendingActions, setPendingActions] = useState({});
  const [isPending, startTransition] = useTransition();
  const candidateFormRefs = useRef({});

  function beginAction(actionKey) {
    setPendingActions((current) => ({
      ...current,
      [actionKey]: true
    }));
  }

  function endAction(actionKey) {
    setPendingActions((current) => ({
      ...current,
      [actionKey]: false
    }));
  }

  function isActionPending(actionKey) {
    return Boolean(pendingActions[actionKey]);
  }

  async function loadFriendsTournamentMeta(nextTournaments) {
    const withFriendsTournaments = (nextTournaments ?? []).filter(
      (tournament) =>
        tournament.sharingMode === "with_friends" &&
        (tournament.status === "draft" || tournament.status === "active")
    );

    const inviteEntries = await Promise.all(
      withFriendsTournaments.map(async (tournament) => {
        const response = await fetch(`/api/tournaments/${tournament.id}/invites`, {
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error(`Failed to load invitees for ${tournament.title}.`);
        }

        const data = await response.json();
        return [tournament.id, data.items ?? []];
      })
    );

    const linkEntries = await Promise.all(
      withFriendsTournaments
        .filter((tournament) => tournament.status === "draft")
        .map(async (tournament) => {
        const response = await fetch(`/api/tournaments/${tournament.id}/links`, {
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error(`Failed to load share links for ${tournament.title}.`);
        }

        const data = await response.json();
        return [tournament.id, data.items ?? []];
        })
    );

    setTournamentInvites(Object.fromEntries(inviteEntries));
    setTournamentShareLinks(Object.fromEntries(linkEntries));
  }

  async function loadWorkspace() {
    const [poolResponse, tournamentResponse] = await Promise.all([
      fetch("/api/pools", { cache: "no-store" }),
      fetch("/api/tournaments", { cache: "no-store" })
    ]);

    if (!poolResponse.ok || !tournamentResponse.ok) {
      throw new Error("Failed to load create workspace.");
    }

    const poolData = await poolResponse.json();
    const tournamentData = await tournamentResponse.json();

    setPools(poolData.items ?? []);
    setTournaments(tournamentData.items ?? []);
    setExpandedPoolId((current) => {
      if (!poolData.items?.length) {
        return null;
      }

      if (current && poolData.items.some((pool) => pool.id === current)) {
        return current;
      }

      return null;
    });

    const detailEntries = await Promise.all(
      (poolData.items ?? []).map(async (pool) => {
        const response = await fetch(`/api/pools/${pool.id}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to load pool ${pool.name}.`);
        }

        const data = await response.json();
        return [pool.id, data.item];
      })
    );

    setPoolDetails(Object.fromEntries(detailEntries));
    await loadFriendsTournamentMeta(tournamentData.items ?? []);
  }

  useEffect(() => {
    startTransition(async () => {
      try {
        await loadWorkspace();
      } catch (error) {
        setErrorMessage(error.message);
      }
    });
  }, []);

  useEffect(() => {
    if (expandedPoolId && !pools.some((pool) => pool.id === expandedPoolId)) {
      setExpandedPoolId(null);
    }

    if (editingPool && !pools.some((pool) => pool.id === editingPool.id)) {
      setEditingPool(null);
    }
  }, [expandedPoolId, editingPool, pools]);

  useEffect(() => {
    if (editingTournamentTitleId && !tournaments.some((tournament) => tournament.id === editingTournamentTitleId)) {
      setEditingTournamentTitleId(null);
    }

    if (
      expandedDraftTournamentId !== "all" &&
      !tournaments.some((tournament) => tournament.id === expandedDraftTournamentId)
    ) {
      setExpandedDraftTournamentId("all");
    }
  }, [editingTournamentTitleId, expandedDraftTournamentId, tournaments]);

  useEffect(() => {
    if (!successMessage) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setSuccessMessage("");
    }, 2200);

    return () => clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    if (!errorMessage) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setErrorMessage("");
    }, 4200);

    return () => clearTimeout(timer);
  }, [errorMessage]);

  useEffect(() => {
    const friendsMetaCount = tournaments.filter(
      (tournament) =>
        tournament.sharingMode === "with_friends" &&
        (tournament.status === "draft" || tournament.status === "active")
    ).length;

    if (workspaceView !== "tournaments" || friendsMetaCount === 0) {
      return undefined;
    }

    const timer = setInterval(() => {
      loadFriendsTournamentMeta(tournaments).catch(() => {
        // Keep the existing screen stable; the standard flash state handles explicit actions.
      });
    }, 10000);

    return () => clearInterval(timer);
  }, [workspaceView, tournaments]);

  useEffect(() => {
    if (workspaceView !== "tournaments") {
      return;
    }

    const missingLinks = tournaments.filter(
      (tournament) =>
        tournament.status === "draft" &&
        tournament.sharingMode === "with_friends" &&
        !tournamentShareLinks[tournament.id]?.some((item) => item.active) &&
        !isActionPending(`share-link:${tournament.id}`)
    );

    if (missingLinks.length === 0) {
      return;
    }

    missingLinks.forEach((tournament) => {
      handleEnsureShareLink(tournament.id, { silent: true }).catch(() => {
        // Error handling stays in the action path.
      });
    });
  }, [workspaceView, tournaments, tournamentShareLinks]);

  useEffect(() => {
    const timers = Object.entries(candidateDrafts).map(([poolId, draft]) => {
      const candidateName = (draft?.name || "").trim();

      if (
        candidateName.length < 2 ||
        imageSuggestionLoading[poolId] ||
        imageSuggestionQuery[poolId] === candidateName
      ) {
        return null;
      }

      return setTimeout(() => {
        handleSuggestImages(poolId, candidateName);
      }, 1200);
    });

    return () => {
      for (const timer of timers) {
        if (timer) {
          clearTimeout(timer);
        }
      }
    };
  }, [candidateDrafts, imageSuggestionLoading, imageSuggestionQuery]);

  async function handleCreateCandidateInPool(poolId) {
    const actionKey = `create-candidate:${poolId}`;
    if (isActionPending(actionKey)) {
      return;
    }

    beginAction(actionKey);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const draft = candidateDrafts[poolId] || emptyCandidateForm;

      const candidateResponse = await fetch("/api/candidates", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name: draft.name,
          description: draft.description || null,
          imageUrl: draft.imageUrl || null
        })
      });

      const candidateData = await candidateResponse.json();
      if (!candidateResponse.ok) {
        setErrorMessage(candidateData.error?.message || "Failed to create candidate.");
        return;
      }

      const attachResponse = await fetch(`/api/pools/${poolId}/candidates`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          candidateIds: [candidateData.item.id]
        })
      });

      const attachData = await attachResponse.json();
      if (!attachResponse.ok) {
        setErrorMessage(attachData.error?.message || "Failed to add candidate to pool.");
        return;
      }

      const linkedDraftBrackets = tournaments.filter(
        (tournament) => tournament.status === "draft" && tournament.sourcePoolId === poolId
      );

      await Promise.all(
        linkedDraftBrackets.map(async (tournament) => {
          await fetch(`/api/tournaments/${tournament.id}`, {
            method: "PATCH",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify({
              syncWithPool: true
            })
          });
        })
      );

      setCandidateDrafts((current) => ({
        ...current,
        [poolId]: emptyCandidateForm
      }));
      if (editingCandidate?.poolId === poolId) {
        setEditingCandidate(null);
      }
      setImageSuggestions((current) => ({
        ...current,
        [poolId]: []
      }));
      setImageSuggestionQuery((current) => ({
        ...current,
        [poolId]: ""
      }));
      setExpandedPoolId(poolId);
      setSuccessMessage("Candidate created inside pool.");
      await loadWorkspace();
    } finally {
      endAction(actionKey);
    }
  }

  async function handlePoolSubmit(event) {
    event.preventDefault();
    if (isActionPending("create-pool")) {
      return;
    }

    beginAction("create-pool");
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/pools", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name: poolForm.name,
          description: poolForm.description || null
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to create pool.");
        return;
      }

      setPoolForm(emptyPoolForm);
      setExpandedPoolId(data.item?.id ?? null);
      setIsPoolModalOpen(false);
      setSuccessMessage("Pool created.");
      await loadWorkspace();
    } finally {
      endAction("create-pool");
    }
  }

  async function createPoolRecord({
    name = "Untitled Pool",
    description = null,
    attachedTournamentId = null,
    switchToPools = false
  } = {}) {
    const actionKey = attachedTournamentId
      ? `create-pool-for-tournament:${attachedTournamentId}`
      : "create-pool";

    if (isActionPending(actionKey)) {
      return null;
    }

    beginAction(actionKey);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/pools", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name,
          description
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to create pool.");
        return null;
      }

      const createdPool = data.item;

      if (attachedTournamentId) {
        const attachResponse = await fetch(`/api/tournaments/${attachedTournamentId}`, {
          method: "PATCH",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            sourcePoolId: createdPool.id
          })
        });
        const attachData = await attachResponse.json();

        if (!attachResponse.ok) {
          setErrorMessage(attachData.error?.message || "Failed to attach pool to bracket.");
          return null;
        }
      }

      setPoolInlineDrafts((current) => ({
        ...current,
        [createdPool.id]: {
          name: createdPool.name,
          description: createdPool.description || ""
        }
      }));
      setExpandedPoolId(createdPool.id);

      if (switchToPools) {
        setWorkspaceView("pools");
      }

      setSuccessMessage(attachedTournamentId ? "New pool created and linked to bracket." : "Pool created.");
      await loadWorkspace();
      return createdPool;
    } finally {
      endAction(actionKey);
    }
  }

  async function createDraftBracket() {
    if (isActionPending("create-tournament")) {
      return;
    }

    beginAction("create-tournament");
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/tournaments", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          title: "Untitled Bracket",
          description: null,
          sourcePoolId: null,
          sharingMode: "private",
          playStyle: "fixed_bracket",
          resultMode: "winner_only",
          tieBreakMode: "higher_seed_wins"
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to create bracket.");
        return;
      }

      setTournamentInlineDrafts((current) => ({
        ...current,
        [data.item.id]: {
          title: data.item.title,
          sourcePoolId: data.item.sourcePoolId || "",
          sharingMode: data.item.sharingMode,
          playStyle: data.item.playStyle,
          resultMode: data.item.resultMode,
          tieBreakMode: data.item.tieBreakMode
        }
      }));
      setExpandedDraftTournamentId(data.item.id);
      setWorkspaceView("tournaments");
      setSuccessMessage("Draft bracket created.");
      await loadWorkspace();
    } finally {
      endAction("create-tournament");
    }
  }

  async function handleTournamentSubmit(event) {
    event.preventDefault();
    if (isActionPending("create-tournament")) {
      return;
    }

    beginAction("create-tournament");
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/tournaments", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          ...tournamentForm,
          description: null
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to create bracket.");
        return;
      }

      setTournamentForm(emptyTournamentForm);
      setIsTournamentModalOpen(false);
      setSuccessMessage("Draft bracket created.");
      await loadWorkspace();
    } finally {
      endAction("create-tournament");
    }
  }

  function openPoolEditor(pool) {
    setEditingPool(pool);
    setPoolEditForm({
      name: pool.name || "",
      description: pool.description || ""
    });
  }

  async function updateTournamentInline(tournamentId, patch, { silent = true } = {}) {
    const actionKey = `update-tournament:${tournamentId}`;
    if (isActionPending(actionKey)) {
      return;
    }

    beginAction(actionKey);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(patch)
      });
      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to update bracket.");
        return;
      }

      setRecentlySavedBrackets((current) => ({
        ...current,
        [tournamentId]: true
      }));
      setTimeout(() => {
        setRecentlySavedBrackets((current) => {
          const next = { ...current };
          delete next[tournamentId];
          return next;
        });
      }, 1800);

      await loadWorkspace();
    } finally {
      endAction(actionKey);
    }
  }

  async function savePoolInline(poolId) {
    const draft = poolInlineDrafts[poolId];
    const pool = pools.find((entry) => entry.id === poolId);

    if (!draft || !pool) {
      return;
    }

    const nextName = draft.name?.trim();
    const nextDescription = draft.description?.trim() || "";

    if (!nextName) {
      setPoolInlineDrafts((current) => ({
        ...current,
        [poolId]: {
          ...draft,
          name: pool.name
        }
      }));
      return;
    }

    if (nextName === pool.name && nextDescription === (pool.description || "")) {
      return;
    }

    const actionKey = `update-pool:${poolId}`;
    if (isActionPending(actionKey)) {
      return;
    }

    beginAction(actionKey);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/pools/${poolId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name: nextName,
          description: nextDescription || null
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to update pool.");
        return;
      }

      setPoolInlineDrafts((current) => ({
        ...current,
        [poolId]: {
          name: data.item?.name ?? nextName,
          description: data.item?.description ?? nextDescription
        }
      }));
      setSuccessMessage("Pool updated.");
      await loadWorkspace();
    } finally {
      endAction(actionKey);
    }
  }

  async function handleSuggestImages(poolId, requestedName) {
    const candidateName = (requestedName ?? candidateDrafts[poolId]?.name ?? "").trim();

    if (candidateName.length < 2) {
      setErrorMessage("Give the candidate a name before asking for image suggestions.");
      return;
    }

    setErrorMessage("");
    setImageSuggestionLoading((current) => ({
      ...current,
      [poolId]: true
    }));

    try {
      const response = await fetch(`/api/image-suggestions?q=${encodeURIComponent(candidateName)}`, {
        cache: "no-store"
      });
      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to fetch image suggestions.");
        return;
      }

      setImageSuggestions((current) => ({
        ...current,
        [poolId]: data.items ?? []
      }));
      setImageSuggestionQuery((current) => ({
        ...current,
        [poolId]: candidateName
      }));
    } catch {
      setErrorMessage("Failed to fetch image suggestions.");
    } finally {
      setImageSuggestionLoading((current) => ({
        ...current,
        [poolId]: false
      }));
    }
  }

  function selectSuggestedImage(poolId, imageUrl) {
    setCandidateDrafts((current) => ({
      ...current,
      [poolId]: {
        ...(current[poolId] || emptyCandidateForm),
        imageUrl
      }
    }));
  }

  async function handleStartTournament(tournamentId) {
    const actionKey = `start-tournament:${tournamentId}`;
    if (isActionPending(actionKey)) {
      return;
    }

    beginAction(actionKey);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          status: "active"
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to start bracket.");
        return;
      }

      setSuccessMessage("Bracket started.");
      await loadWorkspace();
    } finally {
      endAction(actionKey);
    }
  }

  async function handleEnsureShareLink(tournamentId, { rotate = false, silent = false } = {}) {
    const actionKey = rotate ? `rotate-link:${tournamentId}` : `share-link:${tournamentId}`;
    if (isActionPending(actionKey)) {
      return null;
    }

    beginAction(actionKey);
    if (!silent) {
      setErrorMessage("");
      setSuccessMessage("");
    }

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/links`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(rotate ? { rotate: true } : {})
      });
      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to prepare share link.");
        return null;
      }

      setTournamentShareLinks((current) => ({
        ...current,
        [tournamentId]: [data.item]
      }));
      if (!silent) {
        setSuccessMessage(rotate ? "Share link refreshed." : "Share link ready.");
      }
      return data.item;
    } finally {
      endAction(actionKey);
    }
  }

  async function handleCopyShareLink(tournamentId) {
    setErrorMessage("");
    setSuccessMessage("");

    let link = tournamentShareLinks[tournamentId]?.find((item) => item.active);
    if (!link) {
      link = await handleEnsureShareLink(tournamentId);
    }

    if (!link) {
      return;
    }

    const shareUrl = `${window.location.origin}/join/${link.token}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setSuccessMessage("Share link copied.");
    } catch {
      setErrorMessage("Could not copy the share link.");
    }
  }

  async function handleSyncTournamentWithPool(tournamentId) {
    const actionKey = `sync-tournament:${tournamentId}`;
    if (isActionPending(actionKey)) {
      return;
    }

    beginAction(actionKey);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          syncWithPool: true
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to sync bracket with pool.");
        return;
      }

      const addedEntryCount = data.meta?.addedEntryCount ?? 0;
      setSuccessMessage(
        addedEntryCount > 0
          ? `Bracket synced with pool. Added ${addedEntryCount} candidate${
              addedEntryCount === 1 ? "" : "s"
            }.`
          : "Bracket synced with pool. No new candidates were added."
      );
      await loadWorkspace();
    } finally {
      endAction(actionKey);
    }
  }

  async function handleRerunTournament(tournamentId) {
    const actionKey = `rerun-tournament:${tournamentId}`;
    if (isActionPending(actionKey)) {
      return;
    }

    beginAction(actionKey);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/reruns`, {
        method: "POST"
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to create rerun.");
        return;
      }

      setSuccessMessage("Rerun draft created.");
      await loadWorkspace();
    } finally {
      endAction(actionKey);
    }
  }

  async function openSeedingEditor(tournament) {
    setErrorMessage("");
    setSuccessMessage("");
    setSeedingLoading(true);
    setSeedingTournament(tournament);
    setSeedingEntries([]);

    try {
      const response = await fetch(`/api/tournaments/${tournament.id}/entries`, {
        cache: "no-store"
      });
      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to load bracket seeding.");
        setSeedingTournament(null);
        return;
      }

      setSeedingEntries(data.items ?? []);
    } catch {
      setErrorMessage("Failed to load bracket seeding.");
      setSeedingTournament(null);
    } finally {
      setSeedingLoading(false);
    }
  }

  function moveSeedEntry(fromIndex, toIndex) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
      return;
    }

    setSeedingEntries((current) => {
      if (fromIndex >= current.length || toIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  function handleSeedDrop(targetIndex) {
    if (!draggingEntryId) {
      return;
    }

    const fromIndex = seedingEntries.findIndex((entry) => entry.id === draggingEntryId);
    moveSeedEntry(fromIndex, targetIndex);
    setDraggingEntryId(null);
  }

  async function handleSeedingSubmit(event) {
    event.preventDefault();

    if (!seedingTournament) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setSavingSeeding(true);

    try {
      const response = await fetch(`/api/tournaments/${seedingTournament.id}/entries`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          entryIds: seedingEntries.map((entry) => entry.id)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to save bracket seeding.");
        return;
      }

      setSeedingEntries(data.items ?? []);
      setSeedingTournament(null);
      setSuccessMessage("Seeding updated.");
      await loadWorkspace();
    } catch {
      setErrorMessage("Failed to save bracket seeding.");
    } finally {
      setSavingSeeding(false);
      setDraggingEntryId(null);
    }
  }

  function openCandidateEditor(poolId, candidate) {
    setExpandedPoolId(poolId);
    setEditingCandidate({
      id: candidate.id,
      poolId
    });
    setCandidateDrafts((current) => ({
      ...current,
      [poolId]: {
        name: candidate.name || "",
        description: candidate.description || "",
        imageUrl: candidate.imageUrl || ""
      }
    }));
    setErrorMessage("");
    setSuccessMessage("");

    requestAnimationFrame(() => {
      candidateFormRefs.current[poolId]?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  }

  function closeCandidateEditor(poolId) {
    setEditingCandidate((current) => (current?.poolId === poolId ? null : current));
    setCandidateDrafts((current) => ({
      ...current,
      [poolId]: emptyCandidateForm
    }));
  }

  async function handlePoolEditSubmit(event) {
    event.preventDefault();

    if (!editingPool) {
      return;
    }

    if (isActionPending("save-pool")) {
      return;
    }

    beginAction("save-pool");
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/pools/${editingPool.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name: poolEditForm.name,
          description: poolEditForm.description || null
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to update pool.");
        return;
      }

      setEditingPool(null);
      setPoolEditForm(emptyPoolForm);
      setSuccessMessage("Pool updated.");
      await loadWorkspace();
    } finally {
      endAction("save-pool");
    }
  }

  async function handleCandidateEditSubmit(poolId) {
    if (!editingCandidate || editingCandidate.poolId !== poolId) {
      return;
    }

    const actionKey = `save-candidate:${poolId}`;
    if (isActionPending(actionKey)) {
      return;
    }

    beginAction(actionKey);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const draft = candidateDrafts[poolId] || emptyCandidateForm;

      const response = await fetch(`/api/candidates/${editingCandidate.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name: draft.name,
          description: draft.description || null,
          imageUrl: draft.imageUrl || null
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to update candidate.");
        return;
      }

      closeCandidateEditor(poolId);
      setSuccessMessage("Candidate updated.");
      await loadWorkspace();
    } finally {
      endAction(actionKey);
    }
  }

  async function handleArchiveTournament(tournamentId, title) {
    const confirmed = window.confirm(
      `Archive "${title}"?\n\nThis will hide it from the main views, but keep its data and history.`
    );

    if (!confirmed) {
      return;
    }

    const actionKey = `archive-tournament:${tournamentId}`;
    if (isActionPending(actionKey)) {
      return;
    }

    beginAction(actionKey);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}`, {
        method: "DELETE"
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to archive bracket.");
        return;
      }

      setSuccessMessage("Bracket archived.");
      await loadWorkspace();
    } finally {
      endAction(actionKey);
    }
  }

  async function handleArchivePool(poolId, name) {
    const confirmed = window.confirm(
      `Archive "${name}"?\n\nThis will hide it from the main views, but keep its data and history.`
    );

    if (!confirmed) {
      return;
    }

    const actionKey = `archive-pool:${poolId}`;
    if (isActionPending(actionKey)) {
      return;
    }

    beginAction(actionKey);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/pools/${poolId}`, {
        method: "DELETE"
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to archive pool.");
        return;
      }

      if (expandedPoolId === poolId) {
        setExpandedPoolId(null);
      }

      setSuccessMessage("Pool archived.");
      await loadWorkspace();
    } finally {
      endAction(actionKey);
    }
  }

  async function handleCloseCurrentRound(tournamentId) {
    const actionKey = `close-round:${tournamentId}`;
    if (isActionPending(actionKey)) {
      return;
    }

    beginAction(actionKey);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          closeCurrentRound: true
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to close the current round.");
        return;
      }

      setSuccessMessage("Round closed and bracket advanced.");
      await loadWorkspace();
    } finally {
      endAction(actionKey);
    }
  }

  return (
    <div className="space-y-6">
      <FlashMessages errorMessage={errorMessage} successMessage={successMessage} />

      <section className="border border-[var(--line)] bg-[var(--panel)]">
        <div className="grid gap-px border-b border-[var(--line)] bg-[var(--line)] md:grid-cols-2">
          <button
            type="button"
            onClick={() => setWorkspaceView("tournaments")}
            className={`px-5 py-4 text-left transition ${
              workspaceView === "tournaments"
                ? "bg-[var(--accent-3)] text-black"
                : "bg-[var(--panel)] hover:bg-[var(--panel-2)]"
            }`}
          >
            <p className="display-face text-lg font-black uppercase">Brackets</p>
            <p
              className={`mt-2 text-xs uppercase tracking-[0.14em] ${
                workspaceView === "tournaments" ? "text-black/80" : "text-[var(--muted)]"
              }`}
            >
              {pools.length} total · build and edit candidate sets
            </p>
          </button>
          <button
            type="button"
            onClick={() => setWorkspaceView("pools")}
            className={`px-5 py-4 text-left transition ${
              workspaceView === "pools"
                ? "bg-[var(--accent-2)] text-black"
                : "bg-[var(--panel)] hover:bg-[var(--panel-2)]"
            }`}
          >
            <p className="display-face text-lg font-black uppercase">Pools</p>
            <p
              className={`mt-2 text-xs uppercase tracking-[0.14em] ${
                workspaceView === "pools" ? "text-black/80" : "text-[var(--muted)]"
              }`}
            >
              {tournaments.length} total · seed brackets and manage rounds
            </p>
          </button>
        </div>
      </section>

      {workspaceView === "pools" ? (
        <div className="space-y-3">
          <div className="flex justify-start">
            <button
              type="button"
              onClick={() => createPoolRecord()}
              disabled={isActionPending("create-pool")}
              className="ui-button ui-button-compact ui-button-primary"
            >
              Add Pool
            </button>
          </div>
          <SectionCard>
            <div className="space-y-0">
              {pools.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No pools yet.</p>
              ) : (
                pools.map((pool) => {
                const isExpanded = expandedPoolId === pool.id;
                const shouldDimOtherPools = Boolean(expandedPoolId);
                const isMutedPool = shouldDimOtherPools && !isExpanded;
                const previewCandidates = poolDetails[pool.id]?.candidates || [];
                const inlinePoolDraft = poolInlineDrafts[pool.id] || {
                  name: pool.name,
                  description: pool.description || ""
                };
                const candidateDraft = candidateDrafts[pool.id] || emptyCandidateForm;
                const isEditingPoolCandidate = editingCandidate?.poolId === pool.id;
                return (
                  <div
                    key={pool.id}
                    className={`border-b border-[var(--line)] bg-[var(--panel-2)] transition-opacity duration-150 last:border-b-0 ${
                      isExpanded ? "p-5" : "p-0"
                    } ${
                      isMutedPool ? "opacity-45" : "opacity-100"
                    }`}
                  >
                    {isExpanded ? (
                      <>
                        <div className="flex items-start justify-between gap-6">
                          <div className="flex-1">
                            <InlineTitleField
                              value={inlinePoolDraft.name}
                              onChange={(event) =>
                                setPoolInlineDrafts((current) => ({
                                  ...current,
                                  [pool.id]: {
                                    name: event.target.value,
                                    description: current[pool.id]?.description ?? pool.description ?? ""
                                  }
                                }))
                              }
                            />
                            <p className="mt-2 text-sm uppercase tracking-[0.14em] text-[var(--accent-3)]">
                              {pool.candidateCount} candidates
                            </p>
                            <textarea
                              value={inlinePoolDraft.description}
                              onChange={(event) =>
                                setPoolInlineDrafts((current) => ({
                                  ...current,
                                  [pool.id]: {
                                    name: current[pool.id]?.name ?? pool.name,
                                    description: event.target.value
                                  }
                                }))
                              }
                              rows={2}
                              placeholder="Pool description"
                              className="mt-3 -mx-3 block w-[calc(100%+1.5rem)] border border-[var(--line)] bg-[var(--panel)] px-3 py-3 text-sm leading-6 text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent-3)]"
                            />
                          </div>
                          <div className="flex w-28 flex-col items-stretch gap-2">
                            <button
                              type="button"
                              onClick={() => savePoolInline(pool.id)}
                              disabled={isActionPending(`update-pool:${pool.id}`)}
                              className="ui-button ui-button-accent ui-button-stack"
                            >
                              {isActionPending(`update-pool:${pool.id}`) ? "Saving" : "Save Pool"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleArchivePool(pool.id, pool.name)}
                              disabled={isActionPending(`archive-pool:${pool.id}`)}
                              className="ui-button ui-button-muted ui-button-stack"
                            >
                              {isActionPending(`archive-pool:${pool.id}`) ? "Archiving" : "Archive"}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedPoolId((current) => (current === pool.id ? null : pool.id))
                              }
                              className="ui-button ui-button-muted ui-button-stack"
                            >
                              Collapse
                            </button>
                          </div>
                        </div>
                        <div className="mt-5 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                          <div
                            ref={(node) => {
                              candidateFormRefs.current[pool.id] = node;
                            }}
                            className="space-y-3 border border-[var(--line)] bg-[var(--panel-3)] p-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="display-face text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-2)]">
                                {isEditingPoolCandidate ? "Edit Candidate" : "Create Candidate"}
                              </p>
                              {isEditingPoolCandidate ? (
                                <button
                                  type="button"
                                  onClick={() => closeCandidateEditor(pool.id)}
                                  className="display-face text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]"
                                >
                                  Back To Create
                                </button>
                              ) : null}
                            </div>
                            <input
                              value={candidateDraft.name}
                              onChange={(event) =>
                                setCandidateDrafts((current) => ({
                                  ...current,
                                  [pool.id]: {
                                    ...(current[pool.id] || emptyCandidateForm),
                                    name: event.target.value
                                  }
                                }))
                              }
                              placeholder="Candidate name"
                              className="ui-field ui-field-panel"
                            />
                            <textarea
                              value={candidateDraft.description}
                              onChange={(event) =>
                                setCandidateDrafts((current) => ({
                                  ...current,
                                  [pool.id]: {
                                    ...(current[pool.id] || emptyCandidateForm),
                                    description: event.target.value
                                  }
                                }))
                              }
                              placeholder="Description"
                              rows={2}
                              className="ui-field ui-field-panel"
                            />
                            <input
                              value={candidateDraft.imageUrl}
                              onChange={(event) =>
                                setCandidateDrafts((current) => ({
                                  ...current,
                                  [pool.id]: {
                                    ...(current[pool.id] || emptyCandidateForm),
                                    imageUrl: event.target.value
                                  }
                                }))
                              }
                              placeholder="Image URL"
                              className="ui-field ui-field-panel"
                            />
                            <div className="flex flex-wrap gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  isEditingPoolCandidate
                                    ? handleCandidateEditSubmit(pool.id)
                                    : handleCreateCandidateInPool(pool.id)
                                }
                                disabled={
                                  isEditingPoolCandidate
                                    ? isActionPending(`save-candidate:${pool.id}`)
                                    : isActionPending(`create-candidate:${pool.id}`)
                                }
                                className="ui-button ui-button-primary"
                              >
                                {isEditingPoolCandidate
                                  ? isActionPending(`save-candidate:${pool.id}`)
                                    ? "Saving"
                                    : "Save Candidate"
                                  : isActionPending(`create-candidate:${pool.id}`)
                                    ? "Creating"
                                    : "Create"}
                              </button>
                              {isEditingPoolCandidate ? (
                                <button
                                  type="button"
                                  onClick={() => closeCandidateEditor(pool.id)}
                                  className="ui-button ui-button-muted"
                                >
                                  Cancel
                                </button>
                              ) : null}
                            </div>
                          </div>

                          <div
                            className={`space-y-3 border border-[var(--line)] bg-[var(--panel-3)] p-4 transition-opacity ${
                              imageSuggestionLoading[pool.id] ? "opacity-55" : "opacity-100"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="display-face text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-3)]">
                                Image Picks
                              </p>
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => handleSuggestImages(pool.id)}
                                  disabled={imageSuggestionLoading[pool.id]}
                                  className="display-face border border-[var(--accent-2)] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--accent-2)] transition hover:bg-[var(--accent-2)] hover:text-black disabled:opacity-60"
                                >
                                  {imageSuggestionLoading[pool.id] ? "Searching" : "Suggest"}
                                </button>
                                {candidateDraft.imageUrl ? (
                                  <button
                                    type="button"
                                    onClick={() => selectSuggestedImage(pool.id, "")}
                                    className="display-face text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]"
                                  >
                                    Clear
                                  </button>
                                ) : null}
                              </div>
                            </div>

                            {candidateDraft.imageUrl ? (
                              <div className="overflow-hidden border border-[var(--line)] bg-[var(--panel)]">
                                <div className="h-44 w-full bg-[var(--panel-2)]">
                                  <img
                                    src={proxiedImageUrl(candidateDraft.imageUrl)}
                                    alt={candidateDraft.name || "Selected image"}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                                <div className="px-3 py-3">
                                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--accent-2)]">
                                    Selected for this candidate
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="flex min-h-44 items-center justify-center border border-dashed border-[var(--line)] bg-[var(--panel)] px-4 py-6">
                                <p className="text-center text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                                  Add an image URL or ask for suggestions.
                                </p>
                              </div>
                            )}

                            {(imageSuggestions[pool.id] || []).length > 0 ? (
                              <div className="space-y-2">
                                <p className="display-face text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-2)]">
                                  Suggested Images
                                </p>
                                <div className="ui-scroll-subtle max-h-[26rem] overflow-y-auto pr-1">
                                  <div className="grid gap-3 sm:grid-cols-2">
                                  {(imageSuggestions[pool.id] || []).map((image) => {
                                    const selectedImageUrl = candidateDraft.imageUrl;

                                    return (
                                      <button
                                        key={image.id}
                                        type="button"
                                        onClick={() => selectSuggestedImage(pool.id, image.imageUrl)}
                                        className={`overflow-hidden border text-left transition ${
                                          selectedImageUrl === image.imageUrl
                                            ? "border-[var(--accent-3)] bg-[var(--panel)]"
                                            : "border-[var(--line)] bg-[var(--panel)] hover:border-[var(--accent-2)]"
                                        }`}
                                      >
                                        <SuggestionThumbnail
                                          imageUrl={image.thumbnailUrl}
                                          title={image.title}
                                        />
                                        <div className="px-3 py-3">
                                          <p className="line-clamp-2 text-xs uppercase tracking-[0.12em] text-[var(--ink)]">
                                            {image.title}
                                          </p>
                                          {image.source ? (
                                            <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                                              {image.source}
                                            </p>
                                          ) : null}
                                          {selectedImageUrl === image.imageUrl ? (
                                            <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-[var(--accent-3)]">
                                              Selected
                                            </p>
                                          ) : null}
                                        </div>
                                      </button>
                                    );
                                  })}
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-4">
                          <p className="display-face text-lg font-black uppercase tracking-[0.12em] text-[var(--accent-3)]">
                            In This Pool
                          </p>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {(poolDetails[pool.id]?.candidates || []).length === 0 ? (
                              <span className="text-sm text-[var(--muted)]">No candidates in this pool yet.</span>
                            ) : (
                              (poolDetails[pool.id]?.candidates || []).map((candidate) => (
                                <button
                                  key={candidate.id}
                                  type="button"
                                  onClick={() => openCandidateEditor(pool.id, candidate)}
                                  className="overflow-hidden border border-[var(--line)] bg-[var(--panel)] text-left transition hover:border-[var(--accent-2)]"
                                >
                                  {candidate.imageUrl ? (
                                    <div className="h-24 w-full bg-[var(--panel-3)]">
                                      <img
                                        src={proxiedImageUrl(candidate.imageUrl)}
                                        alt={candidate.name}
                                        className="h-full w-full object-cover"
                                      />
                                    </div>
                                  ) : null}
                                  <div className="px-3 py-3">
                                    <p className="display-face text-sm font-black">
                                      {candidate.name}
                                    </p>
                                    {candidate.description ? (
                                      <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                                        {candidate.description}
                                      </p>
                                    ) : null}
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setExpandedPoolId(pool.id)}
                        className="group grid w-full gap-4 border border-transparent p-5 text-left transition hover:border-[var(--accent-3)] hover:bg-[rgba(63,221,213,0.05)] focus-visible:border-[var(--accent-3)] focus-visible:bg-[rgba(63,221,213,0.05)] xl:grid-cols-[0.4fr_0.6fr] xl:items-start"
                      >
                        <div>
                          <h3 className="display-face text-2xl font-black transition group-hover:text-[var(--accent-3)] group-focus-visible:text-[var(--accent-3)]">
                            {pool.name}
                          </h3>
                          <p className="mt-2 text-sm uppercase tracking-[0.14em] text-[var(--accent-3)] transition group-hover:text-[var(--accent-2)] group-focus-visible:text-[var(--accent-2)]">
                            {pool.candidateCount} candidates
                          </p>
                          {pool.description ? (
                            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{pool.description}</p>
                          ) : null}
                        </div>
                        <div className="xl:self-start xl:pt-0">
                          <div className="flex flex-wrap gap-2">
                            {previewCandidates.map((candidate) => (
                              <span
                                key={candidate.id}
                                className="flex items-center gap-2 border border-[var(--line)] bg-[var(--panel)] px-3 py-2 transition group-hover:border-[var(--accent-2)] group-focus-visible:border-[var(--accent-2)]"
                              >
                                {candidate.imageUrl ? (
                                  <img
                                    src={proxiedImageUrl(candidate.imageUrl)}
                                    alt={candidate.name}
                                    className="h-7 w-7 rounded-sm object-cover"
                                  />
                                ) : null}
                                <span className="text-xs tracking-[0.08em] text-[var(--ink)]">
                                  {candidate.name}
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                      </button>
                    )}
                  </div>
                );
                })
              )}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {workspaceView === "tournaments" ? (
        <div className="space-y-3">
          <div className="flex justify-start">
            <button
              type="button"
              onClick={() => createDraftBracket()}
              disabled={isActionPending("create-tournament")}
              className="ui-button ui-button-compact ui-button-primary"
            >
              Add Bracket
            </button>
          </div>
          <SectionCard>
            <div className="space-y-0">
              {tournaments.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No brackets yet.</p>
              ) : (
                (() => {
                const firstDraftTournamentId =
                  tournaments.find((entry) => entry.status === "draft")?.id ?? null;
                const activeTournamentFocusId =
                  editingTournamentTitleId ??
                  (expandedDraftTournamentId !== "all" ? expandedDraftTournamentId : null);
                const shouldDimOtherTournaments = Boolean(activeTournamentFocusId);

                return tournaments.map((tournament) => {
                const bracketDraft = tournamentInlineDrafts[tournament.id] || {
                  title: tournament.title,
                  sourcePoolId: tournament.sourcePoolId || "",
                  sharingMode: tournament.sharingMode,
                  playStyle: tournament.playStyle,
                  resultMode: tournament.resultMode,
                  tieBreakMode: tournament.tieBreakMode
                };
                const trimmedBracketTitle = (bracketDraft.title || "").trim();
                const hasBracketName =
                  trimmedBracketTitle.length > 0 && trimmedBracketTitle !== "Untitled Bracket";
                const hasSourcePool = Boolean(bracketDraft.sourcePoolId);
                const activeShareLink =
                  tournamentShareLinks[tournament.id]?.find((item) => item.active) || null;
                const invitees = tournamentInvites[tournament.id] || [];
                const activeRoundVoteGoal = invitees[0]?.openMatchCount ?? 0;
                const completedInviteCount = invitees.filter(
                  (invite) => activeRoundVoteGoal > 0 && invite.votesCast >= activeRoundVoteGoal
                ).length;
                const rulesExpanded = Boolean(expandedBracketRules[tournament.id]);
                const isEditingTournamentTitle = editingTournamentTitleId === tournament.id;
                const selectedPoolMode =
                  poolSelectionMode[tournament.id] || (hasSourcePool ? "existing" : "existing");
                const isDraftExpanded =
                  tournament.status !== "draft"
                    ? true
                    : expandedDraftTournamentId === "all"
                      ? tournament.id === firstDraftTournamentId
                      : expandedDraftTournamentId === tournament.id;
                const isMutedTournament =
                  shouldDimOtherTournaments && activeTournamentFocusId !== tournament.id;
                const canStartBracket =
                  hasBracketName && hasSourcePool && tournament.entryCount > 0;
                const hasOpenVotes = (tournament.openVoteCount ?? 0) > 0;

                return (
                <div
                  key={tournament.id}
                  className={`border-b border-[var(--line)] bg-[var(--panel-2)] p-5 transition-opacity duration-150 last:border-b-0 ${
                    isMutedTournament ? "opacity-45" : "opacity-100"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      {tournament.status === "draft" && isDraftExpanded && isEditingTournamentTitle ? (
                        <InlineTitleField
                          autoFocus
                          value={bracketDraft.title}
                          onChange={(event) =>
                            setTournamentInlineDrafts((current) => ({
                              ...current,
                              [tournament.id]: {
                                ...bracketDraft,
                                title: event.target.value
                              }
                            }))
                          }
                          onBlur={() => {
                            const nextTitle = bracketDraft.title.trim();

                            if (!nextTitle) {
                              setTournamentInlineDrafts((current) => ({
                                ...current,
                                [tournament.id]: {
                                  ...bracketDraft,
                                  title: tournament.title
                                }
                              }));
                              setEditingTournamentTitleId(null);
                              return;
                            }

                            if (nextTitle !== tournament.title) {
                              updateTournamentInline(tournament.id, { title: nextTitle }, { silent: false });
                            }

                            setEditingTournamentTitleId(null);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.currentTarget.blur();
                            }

                            if (event.key === "Escape") {
                              setTournamentInlineDrafts((current) => ({
                                ...current,
                                [tournament.id]: {
                                  ...bracketDraft,
                                  title: tournament.title
                                }
                              }));
                              setEditingTournamentTitleId(null);
                            }
                          }}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (tournament.status === "draft") {
                              setExpandedDraftTournamentId(tournament.id);
                              setEditingTournamentTitleId(tournament.id);
                            }
                          }}
                          className={`-mx-3 block w-[calc(100%+1.5rem)] border border-transparent bg-transparent px-3 py-2 text-left ${
                            tournament.status === "draft"
                              ? "transition hover:border-[var(--line)] hover:bg-[var(--panel)]"
                              : ""
                          }`}
                        >
                          <span
                            style={{
                              fontFamily: '"Arial Narrow", Arial, Helvetica, sans-serif',
                              fontSize: "24px",
                              fontWeight: 900,
                              lineHeight: 1
                            }}
                          >
                            {tournament.title}
                          </span>
                        </button>
                      )}
                      {tournament.sourcePoolName ? (
                        <p className="mt-2 text-sm text-[var(--muted)]">
                          Pool: {tournament.sourcePoolName}
                        </p>
                      ) : null}
                    </div>
                    <span className="border border-[var(--accent-2)] px-3 py-1 text-xs uppercase tracking-[0.14em] text-[var(--accent-2)]">
                      {recentlySavedBrackets[tournament.id] ? "Saved" : tournament.status}
                    </span>
                  </div>
                  {tournament.status === "draft" ? (
                    isDraftExpanded ? (
                    <>
                    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] xl:items-start">
                      <div className="space-y-3">
                        <div className="space-y-3">
                          <div
                            className={`border p-4 transition ${
                              selectedPoolMode === "existing"
                                ? "border-[var(--accent-3)] bg-[rgba(52,211,196,0.08)]"
                                : "border-[var(--line)] bg-[var(--panel)]"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setPoolSelectionMode((current) => ({
                                  ...current,
                                  [tournament.id]: "existing"
                                }))
                              }
                              className="w-full text-left"
                            >
                              <div className="flex items-start gap-3">
                                <span
                                  className={`mt-1 h-6 w-6 rounded-full border ${
                                    selectedPoolMode === "existing"
                                      ? "border-[var(--accent-3)]"
                                      : "border-[var(--muted)]"
                                  }`}
                                >
                                  <span
                                    className={`m-1 block h-3 w-3 rounded-full ${
                                      selectedPoolMode === "existing"
                                        ? "bg-[var(--accent-3)]"
                                        : "bg-transparent"
                                    }`}
                                  />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="display-face text-base font-black">Use Existing Pool</p>
                                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                                    Pick your competitors from a known set of entries.
                                  </p>
                                </div>
                              </div>
                            </button>
                            {selectedPoolMode === "existing" ? (
                              <div className="mt-4 pl-9">
                                <select
                                  aria-label="Source Pool"
                                  value={bracketDraft.sourcePoolId}
                                  onChange={(event) => {
                                    const sourcePoolId = event.target.value;
                                    setTournamentInlineDrafts((current) => ({
                                      ...current,
                                      [tournament.id]: {
                                        ...bracketDraft,
                                        sourcePoolId
                                      }
                                    }));
                                    updateTournamentInline(
                                      tournament.id,
                                      {
                                        sourcePoolId: sourcePoolId || null
                                      },
                                      { silent: false }
                                    );
                                  }}
                                  className="ui-field ui-field-panel ui-field-select max-w-md"
                                >
                                  <option value="">Choose pool</option>
                                  {pools.map((pool) => (
                                    <option key={pool.id} value={pool.id}>
                                      {pool.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : null}
                          </div>
                          <div
                            className={`border p-4 transition ${
                              selectedPoolMode === "create"
                                ? "border-[var(--accent-3)] bg-[rgba(52,211,196,0.08)]"
                                : "border-[var(--line)] bg-[var(--panel)]"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setPoolSelectionMode((current) => ({
                                  ...current,
                                  [tournament.id]: "create"
                                }))
                              }
                              className="w-full text-left"
                            >
                              <div className="flex items-start gap-3">
                                <span
                                  className={`mt-1 h-6 w-6 rounded-full border ${
                                    selectedPoolMode === "create"
                                      ? "border-[var(--accent-3)]"
                                      : "border-[var(--muted)]"
                                  }`}
                                >
                                  <span
                                    className={`m-1 block h-3 w-3 rounded-full ${
                                      selectedPoolMode === "create"
                                        ? "bg-[var(--accent-3)]"
                                        : "bg-transparent"
                                    }`}
                                  />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="display-face text-base font-black">Create New Pool</p>
                                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                                    Build a new set of competitors from scratch and come back.
                                  </p>
                                </div>
                              </div>
                            </button>
                            {selectedPoolMode === "create" ? (
                              <div className="mt-4 pl-9">
                                <button
                                  type="button"
                                  onClick={() =>
                                    createPoolRecord({
                                      name: trimmedBracketTitle || "Untitled Pool",
                                      attachedTournamentId: tournament.id,
                                      switchToPools: true
                                    })
                                  }
                                  disabled={isActionPending(`create-pool-for-tournament:${tournament.id}`)}
                                  className="ui-button ui-button-accent"
                                >
                                  {isActionPending(`create-pool-for-tournament:${tournament.id}`)
                                    ? "Creating"
                                    : "Create New Pool"}
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 xl:self-start">
                        <select
                          aria-label="Sharing Mode"
                          value={bracketDraft.sharingMode}
                          onChange={(event) => {
                            const sharingMode = event.target.value;
                            setTournamentInlineDrafts((current) => ({
                              ...current,
                              [tournament.id]: {
                                ...bracketDraft,
                                sharingMode
                              }
                            }));
                            updateTournamentInline(tournament.id, { sharingMode }, { silent: false });
                          }}
                          className="ui-field ui-field-panel ui-field-select"
                        >
                          <option value="private">Don't Share</option>
                          <option value="with_friends">Share with Friends</option>
                        </select>

                        <div className="border border-[var(--line)] bg-[var(--panel)] p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="display-face text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent-3)]">
                                Bracket Rules
                              </p>
                              <p className="mt-2 text-sm uppercase tracking-[0.14em] text-[var(--muted)]">
                                {bracketDraft.playStyle.replace("_", " ")} {" • "}
                                {bracketDraft.resultMode.replace("_", " ")} {" • "}
                                {bracketDraft.tieBreakMode.replace("_", " ")}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedBracketRules((current) => ({
                                  ...current,
                                  [tournament.id]: !rulesExpanded
                                }))
                              }
                              className="display-face border border-[var(--line)] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent-2)]"
                            >
                              {rulesExpanded ? "Hide Rules" : "Edit Rules"}
                            </button>
                          </div>
                          {rulesExpanded ? (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-3)]">
                            <span>Bracket Style</span>
                            <button
                              type="button"
                              title="Fixed Bracket keeps the original tree. Reseed reorders survivors each round."
                              className="cursor-help border border-[var(--line)] px-2 py-0.5 text-[10px] text-[var(--muted)]"
                            >
                              ?
                            </button>
                          </div>
                          <select
                            aria-label="Bracket Style"
                            value={bracketDraft.playStyle}
                            onChange={(event) => {
                              const playStyle = event.target.value;
                              setTournamentInlineDrafts((current) => ({
                                ...current,
                                [tournament.id]: {
                                  ...bracketDraft,
                                  playStyle
                                }
                              }));
                              updateTournamentInline(tournament.id, { playStyle }, { silent: false });
                            }}
                            className="ui-field ui-field-panel ui-field-select"
                          >
                            <option value="fixed_bracket">Fixed Bracket</option>
                            <option value="reseed">Reseed</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-3)]">
                            <span>Result Mode</span>
                            <button
                              type="button"
                              title="Winner Only crowns a champion. Full Ranking keeps going until every place is set."
                              className="cursor-help border border-[var(--line)] px-2 py-0.5 text-[10px] text-[var(--muted)]"
                            >
                              ?
                            </button>
                          </div>
                          <select
                            aria-label="Result Mode"
                            value={bracketDraft.resultMode}
                            onChange={(event) => {
                              const resultMode = event.target.value;
                              setTournamentInlineDrafts((current) => ({
                                ...current,
                                [tournament.id]: {
                                  ...bracketDraft,
                                  resultMode
                                }
                              }));
                              updateTournamentInline(tournament.id, { resultMode }, { silent: false });
                            }}
                            className="ui-field ui-field-panel ui-field-select"
                          >
                            <option value="winner_only">Winner Only</option>
                            <option value="full_ranking">Full Ranking</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-3)]">
                            <span>Tie Break</span>
                            <button
                              type="button"
                              title="Decides who advances if a round is closed without a clear vote winner."
                              className="cursor-help border border-[var(--line)] px-2 py-0.5 text-[10px] text-[var(--muted)]"
                            >
                              ?
                            </button>
                          </div>
                          <select
                            aria-label="Tie Break"
                            value={bracketDraft.tieBreakMode}
                            onChange={(event) => {
                              const tieBreakMode = event.target.value;
                              setTournamentInlineDrafts((current) => ({
                                ...current,
                                [tournament.id]: {
                                  ...bracketDraft,
                                  tieBreakMode
                                }
                              }));
                              updateTournamentInline(tournament.id, { tieBreakMode }, { silent: false });
                            }}
                            className="ui-field ui-field-panel ui-field-select"
                          >
                            <option value="higher_seed_wins">Higher Seed Wins</option>
                            <option value="random">Random</option>
                          </select>
                        </div>
                      </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    {bracketDraft.sharingMode === "with_friends" ? (
                      <div className="mt-4 border border-[var(--line)] bg-[var(--panel)] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="display-face text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent-3)]">
                              Friends Lobby
                            </p>
                            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                              {activeShareLink
                                ? "Share this bracket with friends before it starts."
                                : "Preparing invite link..."}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => handleCopyShareLink(tournament.id)}
                              disabled={isActionPending(`share-link:${tournament.id}`)}
                              className="ui-button ui-button-accent"
                            >
                              {activeShareLink ? "Copy Link" : "Preparing"}
                            </button>
                          </div>
                        </div>
                        <div className="mt-3">
                          {invitees.length === 0 ? (
                            <p className="text-sm text-[var(--muted)]">No one is waiting yet.</p>
                          ) : (
                            <>
                              <p className="display-face text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-3)]">
                                Waiting On Start
                              </p>
                              <div className="mt-2 space-y-2">
                                {invitees.map((invite) => (
                                  <div
                                    key={invite.id}
                                    className="flex items-center justify-between gap-3 border border-[var(--line)] bg-[var(--panel-2)] px-4 py-4"
                                  >
                                    <div className="min-w-0">
                                      <p className="display-face truncate text-sm font-black">
                                        {invite.name || invite.email}
                                      </p>
                                      <p className="mt-1 truncate text-xs tracking-[0.08em] text-[var(--muted)]">
                                        {invite.email}
                                      </p>
                                    </div>
                                    <span className="display-face text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-2)]">
                                      {invite.status}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-4 flex flex-col gap-4 border-t border-[var(--line)] pt-4 xl:flex-row xl:items-end xl:justify-between">
                      {hasSourcePool ? (
                        <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                          <span>{tournament.sharingMode.replace("_", " ")}</span>
                          <span>•</span>
                          <span>{tournament.playStyle.replace("_", " ")}</span>
                          <span>•</span>
                          <span>{tournament.resultMode.replace("_", " ")}</span>
                          <span>•</span>
                          <span>{tournament.entryCount} entries</span>
                        </div>
                      ) : (
                        <div />
                      )}
                      <div className="flex flex-wrap gap-3 xl:justify-end">
                        {hasSourcePool ? (
                          <button
                            type="button"
                            onClick={() => openSeedingEditor(tournament)}
                            className="ui-button ui-button-accent"
                          >
                            Set Seeding
                          </button>
                        ) : null}
                        {hasSourcePool ? (
                          <button
                            type="button"
                            onClick={() => handleSyncTournamentWithPool(tournament.id)}
                            disabled={isActionPending(`sync-tournament:${tournament.id}`)}
                            className="ui-button ui-button-highlight"
                          >
                            {isActionPending(`sync-tournament:${tournament.id}`) ? "Syncing" : "Sync With Pool"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleStartTournament(tournament.id)}
                          disabled={!canStartBracket || isActionPending(`start-tournament:${tournament.id}`)}
                          className="ui-button ui-button-primary"
                        >
                          {isActionPending(`start-tournament:${tournament.id}`) ? "Starting" : "Start Bracket"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedDraftTournamentId(null)}
                          className="ui-button ui-button-muted"
                        >
                          Done Editing
                        </button>
                        <button
                          type="button"
                          onClick={() => handleArchiveTournament(tournament.id, tournament.title)}
                          disabled={isActionPending(`archive-tournament:${tournament.id}`)}
                          className="ui-button ui-button-muted"
                        >
                          {isActionPending(`archive-tournament:${tournament.id}`) ? "Archiving" : "Archive"}
                        </button>
                      </div>
                    </div>
                    </>
                    ) : (
                      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
                        <p className="text-sm uppercase tracking-[0.14em] text-[var(--muted)]">
                          {(tournament.sharingMode || "private").replaceAll("_", " ")} {" • "}
                          {(tournament.playStyle || "fixed_bracket").replaceAll("_", " ")} {" • "}
                          {(tournament.resultMode || "winner_only").replaceAll("_", " ")} {" • "}
                          {tournament.entryCount} entries
                        </p>
                        <button
                          type="button"
                          onClick={() => setExpandedDraftTournamentId(tournament.id)}
                          className="ui-button ui-button-accent"
                        >
                          Edit Draft
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartTournament(tournament.id)}
                          disabled={!canStartBracket || isActionPending(`start-tournament:${tournament.id}`)}
                          className="ui-button ui-button-primary"
                        >
                          {isActionPending(`start-tournament:${tournament.id}`) ? "Starting" : "Start Bracket"}
                        </button>
                      </div>
                    )
                  ) : tournament.status === "active" ? (
                    <div className="mt-4 space-y-4">
                      <div className="flex flex-wrap gap-3">
                        {hasOpenVotes ? (
                          <Link
                            href={`/vote?tournament=${tournament.id}&returnTo=create`}
                            className="cta-link ui-button ui-button-primary"
                          >
                            VOTE NOW
                          </Link>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="ui-button ui-button-primary"
                          >
                            NO OPEN MATCHES
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRerunTournament(tournament.id)}
                          disabled={isActionPending(`rerun-tournament:${tournament.id}`)}
                          className="ui-button ui-button-accent"
                        >
                          {isActionPending(`rerun-tournament:${tournament.id}`) ? "Creating" : "Rerun"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCloseCurrentRound(tournament.id)}
                          disabled={isActionPending(`close-round:${tournament.id}`)}
                          className="ui-button ui-button-muted"
                        >
                          {isActionPending(`close-round:${tournament.id}`)
                            ? "Closing Round"
                            : "Close Current Round"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleArchiveTournament(tournament.id, tournament.title)}
                          disabled={isActionPending(`archive-tournament:${tournament.id}`)}
                          className="ui-button ui-button-muted"
                        >
                          {isActionPending(`archive-tournament:${tournament.id}`) ? "Archiving" : "Archive"}
                        </button>
                      </div>
                      {tournament.sharingMode === "with_friends" ? (
                        <div className="border border-[var(--line)] bg-[var(--panel)] p-4">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <p className="display-face text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent-3)]">
                                Friends Progress
                              </p>
                              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                                {activeRoundVoteGoal > 0
                                  ? `${completedInviteCount}/${invitees.length} invited voters finished the current round.`
                                  : "No open matches are waiting in the current round."}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="display-face text-lg font-black text-[var(--accent-2)]">
                                {activeRoundVoteGoal > 0 ? `${completedInviteCount}/${invitees.length}` : "0/0"}
                              </p>
                              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                                Round complete
                              </p>
                            </div>
                          </div>
                          {invitees.length > 0 ? (
                            <div className="mt-3 space-y-2">
                              {invitees.map((invite) => {
                                const isDone =
                                  invite.openMatchCount > 0 && invite.votesCast >= invite.openMatchCount;

                                return (
                                  <div
                                    key={invite.id}
                                    className="flex items-center justify-between gap-3 border border-[var(--line)] bg-[var(--panel-2)] px-4 py-4"
                                  >
                                    <div className="min-w-0">
                                      <p className="display-face truncate text-sm font-black">
                                        {invite.name || invite.email}
                                      </p>
                                      <p className="mt-1 truncate text-xs tracking-[0.08em] text-[var(--muted)]">
                                        {invite.email}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="display-face text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-2)]">
                                        {invite.votesCast}/{invite.openMatchCount} votes
                                      </p>
                                      <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                                        {isDone ? "Ready" : "Waiting"}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="mt-3 text-sm text-[var(--muted)]">No invited voters have joined yet.</p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : tournament.status === "complete" ? (
                    <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                      <div className="min-w-0 space-y-3">
                        {tournament.winnerName ? (
                          <p className="display-face text-lg font-black text-[var(--accent-3)]">
                            Winner: {tournament.winnerName}
                            {tournament.winnerSeed ? ` (Seed ${tournament.winnerSeed})` : ""}
                          </p>
                        ) : null}
                        {hasSourcePool ? (
                          <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                            <span>{tournament.sharingMode.replace("_", " ")}</span>
                            <span>•</span>
                            <span>{tournament.playStyle.replace("_", " ")}</span>
                            <span>•</span>
                            <span>{tournament.resultMode.replace("_", " ")}</span>
                            <span>•</span>
                            <span>{tournament.tieBreakMode.replace("_", " ")}</span>
                            <span>•</span>
                            <span>{tournament.entryCount} entries</span>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-3 lg:justify-end">
                          <Link
                            href={`/results/${tournament.id}`}
                            className="ui-button ui-button-accent"
                          >
                            Results
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleRerunTournament(tournament.id)}
                            disabled={isActionPending(`rerun-tournament:${tournament.id}`)}
                            className="ui-button ui-button-accent"
                          >
                            {isActionPending(`rerun-tournament:${tournament.id}`) ? "Creating" : "Rerun"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleArchiveTournament(tournament.id, tournament.title)}
                            disabled={isActionPending(`archive-tournament:${tournament.id}`)}
                            className="ui-button ui-button-muted"
                          >
                            {isActionPending(`archive-tournament:${tournament.id}`) ? "Archiving" : "Archive"}
                          </button>
                      </div>
                    </div>
                  ) : null}
                  {tournament.status !== "complete" && hasSourcePool && !isDraftExpanded ? (
                  <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                    <span>{tournament.sharingMode.replace("_", " ")}</span>
                    <span>•</span>
                    <span>{tournament.playStyle.replace("_", " ")}</span>
                    <span>•</span>
                    <span>{tournament.resultMode.replace("_", " ")}</span>
                    <span>•</span>
                    <span>{tournament.entryCount} entries</span>
                  </div>
                  ) : null}
                  </div>
                );
                });
                })()
              )}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {isPoolModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg border border-[var(--line)] bg-[var(--panel)]">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-4">
              <h2 className="display-face text-2xl font-black uppercase tracking-[0.1em]">New Pool</h2>
              <button
                type="button"
                onClick={() => {
                  setIsPoolModalOpen(false);
                  setPoolForm(emptyPoolForm);
                }}
                className="display-face text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-2)]"
              >
                Close
              </button>
            </div>
            <div className="px-5 py-5">
              <form className="space-y-3" onSubmit={handlePoolSubmit}>
                <input
                  value={poolForm.name}
                  onChange={(event) =>
                    setPoolForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Pool name"
                  className="ui-field ui-field-modal"
                />
                <textarea
                  value={poolForm.description}
                  onChange={(event) =>
                    setPoolForm((current) => ({ ...current, description: event.target.value }))
                  }
                  placeholder="Pool description"
                  rows={3}
                  className="ui-field ui-field-modal"
                />
                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={isPending || isActionPending("create-pool")}
                    className="ui-button ui-button-accent-fill"
                  >
                    {isActionPending("create-pool") ? "Adding" : "Add Pool"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPoolModalOpen(false);
                      setPoolForm(emptyPoolForm);
                    }}
                    className="ui-button ui-button-muted"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {isTournamentModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-2xl border border-[var(--line)] bg-[var(--panel)]">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-4">
              <h2 className="display-face text-2xl font-black uppercase tracking-[0.1em]">
                New Bracket
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsTournamentModalOpen(false);
                  setTournamentForm(emptyTournamentForm);
                }}
                className="display-face text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-2)]"
              >
                Close
              </button>
            </div>
            <div className="px-5 py-5">
              <form className="space-y-3" onSubmit={handleTournamentSubmit}>
                <input
                  value={tournamentForm.title}
                  onChange={(event) =>
                    setTournamentForm((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="Bracket title"
                  className="ui-field ui-field-modal"
                />
                <select
                  value={tournamentForm.sourcePoolId}
                  onChange={(event) =>
                    setTournamentForm((current) => ({ ...current, sourcePoolId: event.target.value }))
                  }
                  className="ui-field ui-field-modal ui-field-select"
                >
                  <option value="">Choose source pool</option>
                  {pools.map((pool) => (
                    <option key={pool.id} value={pool.id}>
                      {pool.name}
                    </option>
                  ))}
                </select>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="block">
                    <select
                      aria-label="Sharing Mode"
                      value={tournamentForm.sharingMode}
                      onChange={(event) =>
                        setTournamentForm((current) => ({
                          ...current,
                          sharingMode: event.target.value
                        }))
                      }
                      className="ui-field ui-field-modal ui-field-select"
                    >
                      <option value="private">Don't Share</option>
                      <option value="with_friends">Share with Friends</option>
                    </select>
                  </div>
                  <div className="block space-y-2">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-3)]">
                      <span className="pointer-events-none">Bracket Style</span>
                      <button
                        type="button"
                        title="Fixed Bracket keeps the original tree. Reseed reorders survivors each round."
                        className="cursor-help border border-[var(--line)] px-2 py-0.5 text-[10px] text-[var(--muted)]"
                      >
                        ?
                      </button>
                    </div>
                    <select
                      aria-label="Bracket Style"
                      value={tournamentForm.playStyle}
                      onChange={(event) =>
                        setTournamentForm((current) => ({ ...current, playStyle: event.target.value }))
                      }
                      className="ui-field ui-field-modal ui-field-select"
                    >
                      <option value="fixed_bracket">Fixed Bracket</option>
                      <option value="reseed">Reseed</option>
                    </select>
                  </div>
                  <div className="block space-y-2">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-3)]">
                      <span className="pointer-events-none">Result Mode</span>
                      <button
                        type="button"
                        title="Winner Only crowns a champion. Full Ranking keeps going until every place is set."
                        className="cursor-help border border-[var(--line)] px-2 py-0.5 text-[10px] text-[var(--muted)]"
                      >
                        ?
                      </button>
                    </div>
                    <select
                      aria-label="Result Mode"
                      value={tournamentForm.resultMode}
                      onChange={(event) =>
                        setTournamentForm((current) => ({ ...current, resultMode: event.target.value }))
                      }
                      className="ui-field ui-field-modal ui-field-select"
                    >
                      <option value="winner_only">Winner Only</option>
                      <option value="full_ranking">Full Ranking</option>
                    </select>
                  </div>
                  <div className="block space-y-2">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-3)]">
                      <span className="pointer-events-none">Tie Break</span>
                      <button
                        type="button"
                        title="Decides who advances if a round is closed without a clear vote winner."
                        className="cursor-help border border-[var(--line)] px-2 py-0.5 text-[10px] text-[var(--muted)]"
                      >
                        ?
                      </button>
                    </div>
                    <select
                      aria-label="Tie Break"
                      value={tournamentForm.tieBreakMode}
                      onChange={(event) =>
                        setTournamentForm((current) => ({
                          ...current,
                          tieBreakMode: event.target.value
                        }))
                      }
                      className="ui-field ui-field-modal ui-field-select"
                    >
                      <option value="higher_seed_wins">Higher Seed Wins</option>
                      <option value="random">Random</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={isPending || isActionPending("create-tournament")}
                    className="ui-button ui-button-primary"
                  >
                    {isActionPending("create-tournament") ? "Creating" : "Create Bracket"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTournamentModalOpen(false);
                      setTournamentForm(emptyTournamentForm);
                    }}
                    className="ui-button ui-button-muted"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {editingPool ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg border border-[var(--line)] bg-[var(--panel)]">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-4">
              <h2 className="display-face text-2xl font-black uppercase tracking-[0.1em]">
                Edit Pool
              </h2>
              <button
                type="button"
                onClick={() => {
                  setEditingPool(null);
                  setPoolEditForm(emptyPoolForm);
                }}
                className="display-face text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-2)]"
              >
                Close
              </button>
            </div>
            <div className="px-5 py-5">
              <form className="space-y-3" onSubmit={handlePoolEditSubmit}>
                <input
                  value={poolEditForm.name}
                  onChange={(event) =>
                    setPoolEditForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Pool name"
                  className="ui-field ui-field-modal"
                />
                <textarea
                  value={poolEditForm.description}
                  onChange={(event) =>
                    setPoolEditForm((current) => ({
                      ...current,
                      description: event.target.value
                    }))
                  }
                  placeholder="Pool description"
                  rows={3}
                  className="ui-field ui-field-modal"
                />
                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={isActionPending("save-pool")}
                    className="ui-button ui-button-accent-fill"
                  >
                    {isActionPending("save-pool") ? "Saving" : "Save Pool"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPool(null);
                      setPoolEditForm(emptyPoolForm);
                    }}
                    className="ui-button ui-button-muted"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {seedingTournament ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 px-4 py-6">
          <div className="mx-auto flex max-h-[calc(100vh-3rem)] w-full max-w-2xl flex-col border border-[var(--line)] bg-[var(--panel)]">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-4">
              <div>
                <h2 className="display-face text-2xl font-black uppercase tracking-[0.1em]">
                  Set Seeding
                </h2>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--accent-3)]">
                  {seedingTournament.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSeedingTournament(null);
                  setSeedingEntries([]);
                  setDraggingEntryId(null);
                }}
                className="display-face text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-2)]"
              >
                Close
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-5">
              {seedingLoading ? (
                <p className="text-sm text-[var(--muted)]">Loading entries…</p>
              ) : (
                <form className="space-y-4" onSubmit={handleSeedingSubmit}>
                  <p className="text-sm leading-6 text-[var(--muted)]">
                    Drag entries into seed order. The top item becomes seed 1.
                  </p>
                  <div className="space-y-2">
                    {seedingEntries.map((entry, index) => (
                      <div
                        key={entry.id}
                        draggable
                        onDragStart={() => setDraggingEntryId(entry.id)}
                        onDragEnd={() => setDraggingEntryId(null)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => handleSeedDrop(index)}
                        className={`flex cursor-move items-center gap-3 border px-3 py-3 transition ${
                          draggingEntryId === entry.id
                            ? "border-[var(--accent-3)] bg-[var(--panel-3)]"
                            : "border-[var(--line)] bg-[var(--panel-2)] hover:border-[var(--accent-2)]"
                        }`}
                      >
                        <span className="display-face w-12 text-lg font-black uppercase text-[var(--accent-2)]">
                          {index + 1}
                        </span>
                        {entry.candidateImageUrl ? (
                          <img
                            src={proxiedImageUrl(entry.candidateImageUrl)}
                            alt={entry.candidateName}
                            className="h-12 w-12 rounded-sm object-cover"
                          />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <p className="display-face truncate text-sm font-black uppercase">
                            {entry.candidateName}
                          </p>
                          {entry.candidateDescription ? (
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--muted)]">
                              {entry.candidateDescription}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={savingSeeding || seedingEntries.length < 2}
                      className="ui-button ui-button-accent-fill"
                    >
                      {savingSeeding ? "Saving" : "Save Seeding"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSeedingTournament(null);
                        setSeedingEntries([]);
                        setDraggingEntryId(null);
                      }}
                      className="ui-button ui-button-muted"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}

function FlashMessages({ errorMessage, successMessage }) {
  if (!errorMessage && !successMessage) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-2 sm:left-auto sm:right-4 sm:w-full sm:max-w-sm">
      {errorMessage ? (
        <p className="pointer-events-auto border border-[var(--accent)] bg-[var(--panel-3)] px-4 py-3 text-sm text-[var(--accent-2)] shadow-[0_14px_38px_rgba(0,0,0,0.35)]">
          {errorMessage}
        </p>
      ) : null}
      {successMessage ? (
        <p className="pointer-events-auto border border-[var(--accent-3)] bg-[var(--panel-3)] px-4 py-3 text-sm text-[var(--accent-3)] shadow-[0_14px_38px_rgba(0,0,0,0.35)]">
          {successMessage}
        </p>
      ) : null}
    </div>
  );
}
