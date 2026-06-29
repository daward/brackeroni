"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ResilientRemoteImage } from "@/components/resilient-remote-image";
import { SectionCard } from "@/components/section-card";

const emptyCandidateForm = {
  name: "",
  description: "",
  imageUrl: ""
};

const emptyPoolForm = {
  name: "",
  description: "",
  visibility: "private"
};

const emptyPoolImportForm = {
  name: "",
  description: "",
  visibility: "private",
  text: ""
};

const emptyTournamentForm = {
  title: "",
  sourcePoolId: "",
  sharingMode: "private",
  visibility: "private",
  votingAccess: "signed_in_only",
  playStyle: "fixed_bracket",
  resultMode: "winner_only",
  tieBreakMode: "higher_seed_wins"
};

function describePoolVisibility(visibility) {
  if (visibility === "public_listed") {
    return "Published";
  }

  if (visibility === "public_unlisted") {
    return "Published Unlisted";
  }

  return "Private Draft";
}

function PoolPublishWarning({ visibility }) {
  if (visibility === "private") {
    return null;
  }

  return (
    <p className="border border-[var(--accent-2)] bg-[var(--panel-2)] px-4 py-3 text-xs leading-6 text-[var(--accent-2)]">
      Publishing locks this pool. After it is published, only an admin can change its contents or
      settings.
    </p>
  );
}

function describeTournamentVisibility(visibility) {
  if (visibility === "public_listed") {
    return "Public";
  }

  if (visibility === "public_unlisted") {
    return "Public Unlisted";
  }

  return "Private Draft";
}

function getTournamentAudienceMode({ sharingMode, visibility }) {
  if (visibility === "public_listed") {
    return "public_listed";
  }

  if (visibility === "public_unlisted") {
    return "public_unlisted";
  }

  if (sharingMode === "with_friends") {
    return "with_friends";
  }

  return "private";
}

function describeTournamentAudienceMode({ sharingMode, visibility }) {
  const audienceMode = getTournamentAudienceMode({ sharingMode, visibility });

  if (audienceMode === "with_friends") {
    return "Friends";
  }

  if (audienceMode === "public_listed") {
    return "Public";
  }

  if (audienceMode === "public_unlisted") {
    return "Public Unlisted";
  }

  return "Private";
}

function getTournamentAudiencePatch(audienceMode) {
  if (audienceMode === "with_friends") {
    return {
      sharingMode: "with_friends",
      visibility: "private"
    };
  }

  if (audienceMode === "public_listed") {
    return {
      sharingMode: "private",
      visibility: "public_listed"
    };
  }

  if (audienceMode === "public_unlisted") {
    return {
      sharingMode: "private",
      visibility: "public_unlisted"
    };
  }

  return {
    sharingMode: "private",
    visibility: "private"
  };
}

function TournamentPublishWarning({ visibility }) {
  if (visibility === "private") {
    return null;
  }

  return (
    <p className="border border-[var(--accent-2)] bg-[var(--panel-2)] px-4 py-3 text-xs leading-6 text-[var(--accent-2)]">
      Public brackets stay editable until you start them. Starting the bracket publishes it and
      locks further create changes.
    </p>
  );
}

function buildPoolImportPrompt(poolName) {
  const trimmedName = poolName.trim();
  const subject = trimmedName ? `"${trimmedName}"` : "the target pool";

  return [
    `Extract a candidate pool for ${subject}.`,
    "Be exhaustive rather than selective.",
    "If the source is a bulleted or numbered list, treat each distinct bullet or list item as a candidate unless it is clearly not one.",
    "Return distinct candidate names only when they are directly supported by the source text.",
    "Prefer canonical names over aliases.",
    "Do not invent candidates or fill gaps with guesses.",
    "If the same candidate appears more than once, include it once.",
    "Keep rationale and excerpt very short so the full list can fit in the response."
  ].join(" ");
}

function normalizeImageMatchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isStrongSuggestedImageMatch(candidateName, suggestion) {
  const normalizedCandidateName = normalizeImageMatchText(candidateName);
  const normalizedTitle = normalizeImageMatchText(suggestion?.title);

  if (!normalizedCandidateName || !normalizedTitle) {
    return false;
  }

  if (
    normalizedTitle === normalizedCandidateName ||
    normalizedTitle.includes(normalizedCandidateName)
  ) {
    return true;
  }

  const nameTokens = normalizedCandidateName.split(/\s+/).filter(Boolean);

  if (nameTokens.length === 0) {
    return false;
  }

  const matchedTokenCount = nameTokens.filter((token) => normalizedTitle.includes(token)).length;
  const isTrustedSource =
    suggestion?.source === "Wikipedia" || suggestion?.source === "Wikimedia Commons";

  return isTrustedSource && matchedTokenCount === nameTokens.length;
}

function formatBracketDate(value) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
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

function CandidatePreviewChips({ candidates, limit = 4 }) {
  const previewCandidates = candidates.slice(0, limit);
  const remainingCount = Math.max(candidates.length - previewCandidates.length, 0);

  return (
    <div className="flex flex-wrap gap-2">
      {previewCandidates.map((candidate) => (
        <span
          key={candidate.id}
          className="flex items-center gap-2 border border-[var(--line)] bg-[var(--panel)] px-3 py-2"
        >
          {candidate.imageUrl ? (
            <ResilientRemoteImage
              src={candidate.imageUrl}
              alt={candidate.name}
              className="h-7 w-7 rounded-sm object-cover"
            />
          ) : null}
          <span className="text-xs tracking-[0.08em] text-[var(--ink)]">{candidate.name}</span>
        </span>
      ))}
      {remainingCount > 0 ? (
        <span className="border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-xs tracking-[0.08em] text-[var(--muted)]">
          +{remainingCount} more
        </span>
      ) : null}
    </div>
  );
}

function CandidateManagerPanel({
  poolId,
  candidateDraft,
  isCandidateEditorOpen,
  isEditingCandidate,
  readOnly = false,
  candidates,
  imageSuggestions,
  imageSuggestionLoading,
  onDraftChange,
  onCreateCandidate,
  onSubmit,
  onCloseEditor,
  onSuggestImages,
  onClearImage,
  onSelectSuggestedImage,
  onEditCandidate,
  onRemoveCandidate,
  isCreatePending,
  isSavePending,
  removingCandidateId = null,
  listHeading = "In This Pool",
  listEmptyMessage = "No candidates in this pool yet."
}) {
  return (
    <>
      <div className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="display-face text-lg font-black uppercase tracking-[0.12em] text-[var(--accent-3)]">
            {listHeading}
          </p>
          {!readOnly ? (
            <button
              type="button"
              onClick={onCreateCandidate}
              className="ui-button ui-button-accent"
            >
              Add Candidate
            </button>
          ) : null}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {candidates.length === 0 ? (
            <span className="text-sm text-[var(--muted)]">{listEmptyMessage}</span>
          ) : (
            candidates.map((candidate) => (
              <div
                key={candidate.id}
                className={`group relative flex flex-col overflow-hidden border border-[var(--line)] bg-[var(--panel)] ${
                  candidate.imageUrl ? "min-h-[16rem]" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (!readOnly) {
                      onEditCandidate(candidate);
                    }
                  }}
                  className="flex h-full w-full flex-1 flex-col text-left transition hover:border-[var(--accent-2)]"
                >
                  {candidate.imageUrl ? (
                    <div className="h-40 w-full bg-[var(--panel-3)]">
                      <ResilientRemoteImage
                        src={candidate.imageUrl}
                        alt={candidate.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="flex flex-1 flex-col px-3 py-3">
                    <p className="display-face text-sm font-black">{candidate.name}</p>
                    {candidate.description ? (
                      <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                        {candidate.description}
                      </p>
                    ) : null}
                  </div>
                </button>
                {!readOnly ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemoveCandidate(candidate);
                    }}
                    aria-label={`Remove ${candidate.name}`}
                    title={`Remove ${candidate.name}`}
                    disabled={readOnly || removingCandidateId === candidate.id}
                    className={`absolute right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-[rgba(10,10,10,0.86)] text-[var(--muted)] opacity-0 transition hover:border-[var(--accent)] hover:text-[var(--accent)] group-hover:opacity-100 group-focus-within:opacity-100 disabled:opacity-60 ${
                      candidate.imageUrl ? "bottom-3" : "top-3"
                    }`}
                  >
                    {removingCandidateId === candidate.id ? (
                      <span className="text-[10px] uppercase tracking-[0.12em]">...</span>
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
                        <path d="M4 7h16" />
                        <path d="M9 7V4h6v3" />
                        <path d="M7 7l1 13h8l1-13" />
                        <path d="M10 11v5" />
                        <path d="M14 11v5" />
                      </svg>
                    )}
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>

      {isCandidateEditorOpen && !readOnly ? (
        <div className="fixed inset-0 z-40 bg-black/70">
          <button
            type="button"
            aria-label="Close candidate editor"
            onClick={onCloseEditor}
            className="absolute inset-0 cursor-default"
          />
          <div className="absolute inset-y-0 right-0 flex w-full max-w-[42rem] flex-col border-l border-[var(--line)] bg-[var(--panel)] shadow-[0_0_40px_rgba(0,0,0,0.45)]">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-4">
              <div>
                <p className="display-face text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-2)]">
                  {isEditingCandidate ? "Edit Candidate" : "Create Candidate"}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Update the candidate and keep the full list in place behind the drawer.
                </p>
              </div>
              <button
                type="button"
                onClick={onCloseEditor}
                className="display-face text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]"
              >
                Close
              </button>
            </div>

            <div className="ui-scroll-subtle flex-1 overflow-y-auto px-5 py-5">
              <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-3 border border-[var(--line)] bg-[var(--panel-3)] p-4">
                  <input
                    value={candidateDraft.name}
                    disabled={readOnly}
                    onChange={(event) => onDraftChange("name", event.target.value)}
                    placeholder="Candidate name"
                    className="ui-field ui-field-panel"
                  />
                  <textarea
                    value={candidateDraft.description}
                    disabled={readOnly}
                    onChange={(event) => onDraftChange("description", event.target.value)}
                    placeholder="Description"
                    rows={5}
                    className="ui-field ui-field-panel"
                  />
                  <input
                    value={candidateDraft.imageUrl}
                    disabled={readOnly}
                    onChange={(event) => onDraftChange("imageUrl", event.target.value)}
                    placeholder="Image URL"
                    className="ui-field ui-field-panel"
                  />
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={onSubmit}
                      disabled={readOnly || (isEditingCandidate ? isSavePending : isCreatePending)}
                      className="ui-button ui-button-primary"
                    >
                      {isEditingCandidate
                        ? isSavePending
                          ? "Saving"
                          : "Save Candidate"
                        : isCreatePending
                          ? "Creating"
                          : "Create Candidate"}
                    </button>
                    <button
                      type="button"
                      onClick={onCloseEditor}
                      className="ui-button ui-button-muted"
                    >
                      Cancel
                    </button>
                  </div>
                  {candidateDraft.imageUrl ? (
                    <div className="overflow-hidden border border-[var(--line)] bg-[var(--panel)]">
                      <div className="h-56 w-full bg-[var(--panel-2)]">
                        <ResilientRemoteImage
                          src={candidateDraft.imageUrl}
                          alt={candidateDraft.name || "Selected image"}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-56 items-center justify-center border border-dashed border-[var(--line)] bg-[var(--panel)] px-4 py-6">
                      <p className="text-center text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                        Select an image to preview it here.
                      </p>
                    </div>
                  )}
                </div>

                <div
                  className={`space-y-3 border border-[var(--line)] bg-[var(--panel-3)] p-4 transition-opacity ${
                    imageSuggestionLoading ? "opacity-55" : "opacity-100"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="display-face text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-3)]">
                      Image Picks
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={onSuggestImages}
                        disabled={readOnly || imageSuggestionLoading}
                        className="display-face border border-[var(--accent-2)] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--accent-2)] transition hover:bg-[var(--accent-2)] hover:text-black disabled:opacity-60"
                      >
                        {imageSuggestionLoading ? "Searching" : "Suggest"}
                      </button>
                      {candidateDraft.imageUrl ? (
                        <button
                          type="button"
                          onClick={onClearImage}
                          className="display-face text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]"
                        >
                          Clear
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {imageSuggestions.length > 0 ? (
                    <div className="space-y-2">
                      <p className="display-face text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-2)]">
                        Suggested Images
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {imageSuggestions.map((image) => {
                          const selectedImageUrl = candidateDraft.imageUrl;

                          return (
                            <button
                              key={image.id}
                              type="button"
                              disabled={readOnly}
                              onClick={() => onSelectSuggestedImage(image.imageUrl)}
                              aria-label={image.title || "Suggested image"}
                              title={image.title || "Suggested image"}
                              className={`overflow-hidden border transition ${
                                selectedImageUrl === image.imageUrl
                                  ? "border-[var(--accent-3)] bg-[var(--panel)]"
                                  : "border-[var(--line)] bg-[var(--panel)] hover:border-[var(--accent-2)]"
                              }`}
                            >
                              <div className="relative h-40 w-full bg-[var(--panel-2)]">
                                <ResilientRemoteImage
                                  src={image.thumbnailUrl || image.imageUrl}
                                  alt={image.title || "Suggested image"}
                                  className="h-full w-full object-cover"
                                />
                                {selectedImageUrl === image.imageUrl ? (
                                  <div className="absolute inset-x-0 bottom-0 bg-[rgba(0,0,0,0.72)] px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-3)]">
                                    Selected
                                  </div>
                                ) : null}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function CreatePanels() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pools, setPools] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [poolDetails, setPoolDetails] = useState({});
  const [expandedPoolId, setExpandedPoolId] = useState(null);
  const [isPoolModalOpen, setIsPoolModalOpen] = useState(false);
  const [isPoolImportModalOpen, setIsPoolImportModalOpen] = useState(false);
  const [isTournamentModalOpen, setIsTournamentModalOpen] = useState(false);
  const [editingPool, setEditingPool] = useState(null);
  const [poolEditForm, setPoolEditForm] = useState(emptyPoolForm);
  const [seedingTournament, setSeedingTournament] = useState(null);
  const [seedingEntries, setSeedingEntries] = useState([]);
  const [seedingLoading, setSeedingLoading] = useState(false);
  const [savingSeeding, setSavingSeeding] = useState(false);
  const [draggingEntryId, setDraggingEntryId] = useState(null);
  const [candidateEditor, setCandidateEditor] = useState(null);
  const [candidateDrafts, setCandidateDrafts] = useState({});
  const [imageSuggestions, setImageSuggestions] = useState({});
  const [imageSuggestionLoading, setImageSuggestionLoading] = useState({});
  const [imageSuggestionQuery, setImageSuggestionQuery] = useState({});
  const [poolForm, setPoolForm] = useState(emptyPoolForm);
  const [poolImportForm, setPoolImportForm] = useState(emptyPoolImportForm);
  const [tournamentForm, setTournamentForm] = useState(emptyTournamentForm);
  const [poolInlineDrafts, setPoolInlineDrafts] = useState({});
  const [openPoolMergeMenuId, setOpenPoolMergeMenuId] = useState(null);
  const [tournamentInlineDrafts, setTournamentInlineDrafts] = useState({});
  const [workspaceView, setWorkspaceView] = useState("tournaments");
  const [tournamentStageView, setTournamentStageView] = useState("draft");
  const [expandedDraftTournamentId, setExpandedDraftTournamentId] = useState("all");
  const [managedEntrantsTournamentId, setManagedEntrantsTournamentId] = useState(null);
  const [poolMenuTournamentId, setPoolMenuTournamentId] = useState(null);
  const [editingTournamentTitleId, setEditingTournamentTitleId] = useState(null);
  const [expandedBracketRules, setExpandedBracketRules] = useState({});
  const [recentlySavedBrackets, setRecentlySavedBrackets] = useState({});
  const [tournamentInvites, setTournamentInvites] = useState({});
  const [tournamentShareLinks, setTournamentShareLinks] = useState({});
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [pendingActions, setPendingActions] = useState({});
  const [isPending, startTransition] = useTransition();
  const tournamentCardRefs = useRef({});
  const poolCardRefs = useRef({});
  const actionSearchParamsHandledRef = useRef({
    favoritePoolId: null,
    makeBracketFromPoolId: null
  });

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
        .filter((tournament) => tournament.status === "draft" || tournament.status === "active")
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
      managedEntrantsTournamentId &&
      !tournaments.some((tournament) => tournament.id === managedEntrantsTournamentId)
    ) {
      setManagedEntrantsTournamentId(null);
    }

    if (poolMenuTournamentId && !tournaments.some((tournament) => tournament.id === poolMenuTournamentId)) {
      setPoolMenuTournamentId(null);
    }

    if (
      expandedDraftTournamentId !== "all" &&
      !tournaments.some((tournament) => tournament.id === expandedDraftTournamentId)
    ) {
      setExpandedDraftTournamentId("all");
    }
  }, [editingTournamentTitleId, expandedDraftTournamentId, managedEntrantsTournamentId, poolMenuTournamentId, tournaments]);

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
    const requestedView = searchParams?.get("view");

    if (requestedView === "pools" || requestedView === "tournaments") {
      setWorkspaceView(requestedView);
    }
  }, [searchParams]);

  useEffect(() => {
    if (workspaceView !== "tournaments") {
      return;
    }

    const missingLinks = tournaments.filter(
      (tournament) =>
        (tournament.status === "draft" || tournament.status === "active") &&
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
    if (workspaceView !== "tournaments") {
      return;
    }

    const requestedStage = searchParams?.get("stage");
    const requestedTournamentId = searchParams?.get("tournament");

    if (requestedStage === "draft" || requestedStage === "active" || requestedStage === "complete") {
      setTournamentStageView(requestedStage);
    }

    if (!requestedTournamentId) {
      return;
    }

    const requestedTournament = tournaments.find((tournament) => tournament.id === requestedTournamentId);
    if (!requestedTournament) {
      return;
    }

    if (requestedTournament.status === "draft") {
      setTournamentStageView("draft");
      setExpandedDraftTournamentId(requestedTournament.id);
    } else if (requestedTournament.status === "active") {
      setTournamentStageView("active");
    } else if (requestedTournament.status === "complete") {
      setTournamentStageView("complete");
    }

    const timer = setTimeout(() => {
      tournamentCardRefs.current[requestedTournament.id]?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 50);

    return () => clearTimeout(timer);
  }, [workspaceView, tournaments, searchParams]);

  useEffect(() => {
    if (workspaceView !== "pools") {
      return;
    }

    const requestedPoolId = searchParams?.get("pool");
    if (!requestedPoolId) {
      return;
    }

    const requestedPool = pools.find((pool) => pool.id === requestedPoolId);
    if (!requestedPool) {
      return;
    }

    setExpandedPoolId(requestedPool.id);

    const timer = setTimeout(() => {
      poolCardRefs.current[requestedPool.id]?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 50);

    return () => clearTimeout(timer);
  }, [workspaceView, pools, searchParams]);

  useEffect(() => {
    const requestedFavoritePoolId = searchParams?.get("favoritePool");

    if (!requestedFavoritePoolId) {
      return;
    }

    if (actionSearchParamsHandledRef.current.favoritePoolId === requestedFavoritePoolId) {
      return;
    }

    actionSearchParamsHandledRef.current.favoritePoolId = requestedFavoritePoolId;
    beginAction(`favorite-pool:${requestedFavoritePoolId}`);
    setErrorMessage("");
    setSuccessMessage("");

    startTransition(async () => {
      try {
        const response = await fetch(`/api/pools/${requestedFavoritePoolId}/favorite`, {
          method: "POST"
        });
        const data = await response.json();

        if (!response.ok) {
          actionSearchParamsHandledRef.current.favoritePoolId = null;
          setErrorMessage(data.error?.message || "Failed to add pool to favorites.");
          return;
        }

        await loadWorkspace();
        setWorkspaceView("pools");
        setExpandedPoolId(data.item.id);
        setSuccessMessage(`Added ${data.item.name} to your pools.`);
        router.replace(`/create?view=pools&pool=${data.item.id}`);
      } catch (error) {
        actionSearchParamsHandledRef.current.favoritePoolId = null;
        setErrorMessage(error.message || "Failed to add pool to favorites.");
      } finally {
        endAction(`favorite-pool:${requestedFavoritePoolId}`);
      }
    });
  }, [router, searchParams, startTransition]);

  useEffect(() => {
    const requestedPoolId = searchParams?.get("makeBracketFromPool");

    if (!requestedPoolId || pools.length === 0) {
      return;
    }

    if (actionSearchParamsHandledRef.current.makeBracketFromPoolId === requestedPoolId) {
      return;
    }

    const requestedPool = pools.find((pool) => pool.id === requestedPoolId);
    if (!requestedPool) {
      return;
    }

    actionSearchParamsHandledRef.current.makeBracketFromPoolId = requestedPoolId;

    startTransition(async () => {
      const createdBracket = await createDraftBracketFromPool(requestedPool);

      if (!createdBracket?.id) {
        actionSearchParamsHandledRef.current.makeBracketFromPoolId = null;
        return;
      }

      router.replace(`/create?view=tournaments&stage=draft&tournament=${createdBracket.id}`);
    });
  }, [pools, router, searchParams, startTransition]);

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
      if (candidateEditor?.poolId === poolId) {
        setCandidateEditor(null);
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

  async function handleRemoveCandidateFromPool(poolId, candidate) {
    const confirmed = window.confirm(`Remove "${candidate.name}" from this pool?`);

    if (!confirmed) {
      return;
    }

    const actionKey = `remove-candidate:${poolId}:${candidate.id}`;
    if (isActionPending(actionKey)) {
      return;
    }

    beginAction(actionKey);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/pools/${poolId}/candidates`, {
        method: "DELETE",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          candidateId: candidate.id
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to remove candidate from pool.");
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
              sourcePoolId: poolId
            })
          });
        })
      );

      if (candidateEditor?.poolId === poolId && candidateEditor.candidateId === candidate.id) {
        closeCandidateEditor(poolId);
      }

      setSuccessMessage("Candidate removed from pool.");
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
          description: poolForm.description || null,
          visibility: poolForm.visibility
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

  function closePoolImportModal() {
    setIsPoolImportModalOpen(false);
    setPoolImportForm(emptyPoolImportForm);
  }

  async function handlePoolImportSubmit(event) {
    event.preventDefault();
    const actionKey = "import-pool";

    if (isActionPending(actionKey)) {
      return;
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
          name: poolImportForm.name,
          description: poolImportForm.description || null,
          visibility: poolImportForm.visibility,
          source: {
            type: "extract",
            prompt: buildPoolImportPrompt(poolImportForm.name),
            text: poolImportForm.text
          }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to import pool.");
        return;
      }

      setExpandedPoolId(data.item?.id ?? null);
      closePoolImportModal();
      setSuccessMessage("Pool imported.");
      await loadWorkspace();
    } finally {
      endAction(actionKey);
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
          description,
          visibility: "private"
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

  async function createDraftBracketFromPool(pool) {
    if (isActionPending("create-tournament")) {
      return null;
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
          title: `${pool.name} Bracket`,
          description: null,
          sourcePoolId: pool.id,
          sharingMode: "private",
          playStyle: "fixed_bracket",
          resultMode: "winner_only",
          tieBreakMode: "higher_seed_wins"
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to create bracket from pool.");
        return null;
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
      setSuccessMessage(`Draft bracket created from ${pool.name}.`);
      await loadWorkspace();
      return data.item;
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

  async function handleMergePool(poolId, sourcePoolId) {
    if (!sourcePoolId) {
      setErrorMessage("Choose a source pool to merge.");
      return;
    }

    const actionKey = `merge-pool:${poolId}`;
    if (isActionPending(actionKey)) {
      return;
    }

    beginAction(actionKey);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/pools/${poolId}/merge`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ sourcePoolId })
      });
      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to merge pools.");
        return;
      }

      setOpenPoolMergeMenuId(null);
      setSuccessMessage("Pool merged.");
      await loadWorkspace();
    } finally {
      endAction(actionKey);
    }
  }

  function openPoolEditor(pool) {
    setEditingPool(pool);
    setPoolEditForm({
      name: pool.name || "",
      description: pool.description || "",
      visibility: pool.visibility || "private"
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
    const nextVisibility = draft.visibility || pool.visibility || "private";

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

    if (
      nextName === pool.name &&
      nextDescription === (pool.description || "") &&
      nextVisibility === (pool.visibility || "private")
    ) {
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
          description: nextDescription || null,
          visibility: nextVisibility
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
          description: data.item?.description ?? nextDescription,
          visibility: data.item?.visibility ?? nextVisibility
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

  async function handleAutoFillMissingImages(pool) {
    const actionKey = `auto-fill-images:${pool.id}`;
    if (isActionPending(actionKey)) {
      return;
    }

    const candidates = poolDetails[pool.id]?.candidates || [];
    const missingImageCandidates = candidates.filter((candidate) => !candidate.imageUrl);

    if (missingImageCandidates.length === 0) {
      setSuccessMessage("This pool already has images for every candidate.");
      return;
    }

    beginAction(actionKey);
    setErrorMessage("");
    setSuccessMessage("");

    let appliedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    try {
      for (const candidate of missingImageCandidates) {
        try {
          const response = await fetch(
            `/api/image-suggestions?q=${encodeURIComponent(candidate.name)}`,
            {
              cache: "no-store"
            }
          );
          const data = await response.json();

          if (!response.ok) {
            failedCount += 1;
            continue;
          }

          const bestSuggestion = (data.items || []).find((item) =>
            isStrongSuggestedImageMatch(candidate.name, item)
          );

          if (!bestSuggestion?.imageUrl) {
            skippedCount += 1;
            continue;
          }

          const saveResponse = await fetch(`/api/candidates/${candidate.id}`, {
            method: "PATCH",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify({
              imageUrl: bestSuggestion.imageUrl
            })
          });

          if (!saveResponse.ok) {
            failedCount += 1;
            continue;
          }

          appliedCount += 1;
        } catch {
          failedCount += 1;
        }
      }

      if (appliedCount > 0) {
        await loadWorkspace();
      }

      setSuccessMessage(
        `Filled ${appliedCount} missing image${appliedCount === 1 ? "" : "s"}. ` +
          `${skippedCount} skipped.${failedCount > 0 ? ` ${failedCount} failed.` : ""}`
      );
    } finally {
      endAction(actionKey);
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

      setTournamentStageView("active");
      setExpandedDraftTournamentId(null);
      if (data.item) {
        setTournaments((current) =>
          current.map((tournament) => (tournament.id === tournamentId ? data.item : tournament))
        );
      }
      setSuccessMessage("Bracket started.");
      await loadWorkspace();
      setTimeout(() => {
        tournamentCardRefs.current[tournamentId]?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }, 50);
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

      const rerunId = data.item?.id || null;
      setWorkspaceView("tournaments");
      setTournamentStageView("draft");
      if (rerunId) {
        setExpandedDraftTournamentId(rerunId);
        setEditingTournamentTitleId(null);
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
    setCandidateEditor({
      candidateId: candidate.id,
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

  }

  function openCandidateCreator(poolId) {
    setExpandedPoolId(poolId);
    setCandidateEditor({
      candidateId: null,
      poolId
    });
    setCandidateDrafts((current) => ({
      ...current,
      [poolId]: emptyCandidateForm
    }));
    setImageSuggestions((current) => ({
      ...current,
      [poolId]: []
    }));
    setImageSuggestionQuery((current) => ({
      ...current,
      [poolId]: ""
    }));
    setErrorMessage("");
    setSuccessMessage("");
  }

  function closeCandidateEditor(poolId) {
    setCandidateEditor((current) => (current?.poolId === poolId ? null : current));
    setCandidateDrafts((current) => ({
      ...current,
      [poolId]: emptyCandidateForm
    }));
  }

  function updateCandidateDraft(poolId, field, value) {
    setCandidateDrafts((current) => ({
      ...current,
      [poolId]: {
        ...(current[poolId] || emptyCandidateForm),
        [field]: value
      }
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
          description: poolEditForm.description || null,
          visibility: poolEditForm.visibility
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
    if (!candidateEditor || candidateEditor.poolId !== poolId || !candidateEditor.candidateId) {
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

      const response = await fetch(`/api/candidates/${candidateEditor.candidateId}`, {
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

      if (data.item?.status === "complete") {
        router.replace(`/results/${tournamentId}`);
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
                ? "border-l-4 border-[var(--accent-2)] bg-[var(--panel)] md:border-b-2 md:border-l-0"
                : "border-l-4 border-transparent bg-[var(--panel)] hover:bg-[var(--panel-2)] md:border-b-2"
            }`}
          >
            <p className="display-face text-lg font-black uppercase">Brackets ({tournaments.length})</p>
            <p
              className="mt-2 text-xs uppercase tracking-[0.14em] text-[var(--muted)]"
            >
              Build brackets and manage rounds
            </p>
          </button>
          <button
            type="button"
            onClick={() => setWorkspaceView("pools")}
            className={`px-5 py-4 text-left transition ${
              workspaceView === "pools"
                ? "border-l-4 border-[var(--accent-2)] bg-[var(--panel)] md:border-b-2 md:border-l-0"
                : "border-l-4 border-transparent bg-[var(--panel)] hover:bg-[var(--panel-2)] md:border-b-2"
            }`}
          >
            <p className="display-face text-lg font-black uppercase">Pools ({pools.length})</p>
            <p
              className="mt-2 text-xs uppercase tracking-[0.14em] text-[var(--muted)]"
            >
              Build and edit candidate sets
            </p>
          </button>
        </div>
      </section>

      {workspaceView === "pools" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap justify-start gap-3">
            <button
              type="button"
              onClick={() => createPoolRecord()}
              disabled={isActionPending("create-pool")}
              className="ui-button ui-button-compact ui-button-primary"
            >
              Add Pool
            </button>
            <button
              type="button"
              onClick={() => setIsPoolImportModalOpen(true)}
              disabled={isActionPending("import-pool")}
              className="ui-button ui-button-compact ui-button-muted"
            >
              {isActionPending("import-pool") ? "Importing" : "Import Pool"}
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
                const missingPoolImageCount = previewCandidates.filter(
                  (candidate) => !candidate.imageUrl
                ).length;
                const inlinePoolDraft = poolInlineDrafts[pool.id] || {
                  name: pool.name,
                  description: pool.description || "",
                  visibility: pool.visibility || "private"
                };
                const candidateDraft = candidateDrafts[pool.id] || emptyCandidateForm;
                const isCandidateEditorOpen = candidateEditor?.poolId === pool.id;
                const isEditingPoolCandidate =
                  candidateEditor?.poolId === pool.id && Boolean(candidateEditor?.candidateId);
                const poolIsReadOnly = Boolean(pool.isReadOnly);
                return (
                  <div
                    key={pool.id}
                    ref={(node) => {
                      poolCardRefs.current[pool.id] = node;
                    }}
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
                                    description: current[pool.id]?.description ?? pool.description ?? "",
                                    visibility: current[pool.id]?.visibility ?? pool.visibility ?? "private"
                                  }
                                }))
                              }
                            />
                            <p className="mt-2 text-sm uppercase tracking-[0.14em] text-[var(--accent-3)]">
                              {pool.candidateCount} candidates
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                              {describePoolVisibility(pool.visibility)}
                              {poolIsReadOnly ? " • locked" : ""}
                            </p>
                            <textarea
                              value={inlinePoolDraft.description}
                              disabled={poolIsReadOnly}
                              onChange={(event) =>
                                setPoolInlineDrafts((current) => ({
                                  ...current,
                                  [pool.id]: {
                                    name: current[pool.id]?.name ?? pool.name,
                                    description: event.target.value,
                                    visibility: current[pool.id]?.visibility ?? pool.visibility ?? "private"
                                  }
                                }))
                              }
                              rows={2}
                              placeholder="Pool description"
                              className="mt-3 -mx-3 block w-[calc(100%+1.5rem)] border border-[var(--line)] bg-[var(--panel)] px-3 py-3 text-sm leading-6 text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent-3)]"
                            />
                            {!poolIsReadOnly ? (
                              <select
                                value={inlinePoolDraft.visibility}
                                onChange={(event) =>
                                  setPoolInlineDrafts((current) => ({
                                    ...current,
                                    [pool.id]: {
                                      name: current[pool.id]?.name ?? pool.name,
                                      description: current[pool.id]?.description ?? pool.description ?? "",
                                      visibility: event.target.value
                                    }
                                  }))
                                }
                                className="mt-3 w-full max-w-xs border border-[var(--line)] bg-[var(--panel)] px-3 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent-3)]"
                              >
                                <option value="private">Private Draft</option>
                                <option value="public_listed">Publish</option>
                                <option value="public_unlisted">Publish Unlisted</option>
                              </select>
                            ) : null}
                          </div>
                          <div className="flex w-36 flex-col items-stretch gap-2">
                            <button
                              type="button"
                              onClick={() => createDraftBracketFromPool(pool)}
                              disabled={isActionPending("create-tournament")}
                              className="ui-button ui-button-primary ui-button-stack"
                            >
                              {isActionPending("create-tournament") ? "Creating" : "Start Bracket"}
                            </button>
                            <button
                              type="button"
                              onClick={() => savePoolInline(pool.id)}
                              disabled={poolIsReadOnly || isActionPending(`update-pool:${pool.id}`)}
                              className="ui-button ui-button-accent ui-button-stack"
                            >
                              {isActionPending(`update-pool:${pool.id}`) ? "Saving" : "Save Pool"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAutoFillMissingImages(pool)}
                              disabled={
                                poolIsReadOnly ||
                                missingPoolImageCount === 0 ||
                                isActionPending(`auto-fill-images:${pool.id}`)
                              }
                              className="ui-button ui-button-muted ui-button-stack"
                            >
                              {isActionPending(`auto-fill-images:${pool.id}`)
                                ? "Filling Images"
                                : "Fill Images"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleArchivePool(pool.id, pool.name)}
                              disabled={poolIsReadOnly || isActionPending(`archive-pool:${pool.id}`)}
                              className="ui-button ui-button-muted ui-button-stack"
                            >
                              {isActionPending(`archive-pool:${pool.id}`) ? "Archiving" : "Archive"}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setOpenPoolMergeMenuId((current) =>
                                  current === pool.id ? null : pool.id
                                )
                              }
                              disabled={poolIsReadOnly}
                              className="ui-button ui-button-muted ui-button-stack"
                            >
                              {openPoolMergeMenuId === pool.id ? "Close Merge" : "Merge"}
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
                        <div className="relative">
                          {openPoolMergeMenuId === pool.id ? (
                            <div className="absolute right-0 top-0 z-20 w-64 border border-[var(--line)] bg-[var(--panel)] p-2 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                              <div className="max-h-72 overflow-y-auto">
                                {pools
                                  .filter((candidatePool) => candidatePool.id !== pool.id)
                                  .map((candidatePool) => (
                                    <button
                                      key={candidatePool.id}
                                      type="button"
                                      onClick={() => handleMergePool(pool.id, candidatePool.id)}
                                      disabled={isActionPending(`merge-pool:${pool.id}`)}
                                      className="flex w-full items-center justify-between gap-3 border-b border-[var(--line)] px-3 py-3 text-left transition hover:bg-[var(--panel-3)] last:border-b-0 disabled:opacity-60"
                                    >
                                      <span className="min-w-0">
                                        <span className="block truncate text-sm">
                                          {candidatePool.name}
                                        </span>
                                        <span className="mt-1 block text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                                          {candidatePool.candidateCount} candidates
                                        </span>
                                      </span>
                                      <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--accent-3)]">
                                        {isActionPending(`merge-pool:${pool.id}`) ? "Merging" : "Merge"}
                                      </span>
                                    </button>
                                  ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                        <CandidateManagerPanel
                          poolId={pool.id}
                          candidateDraft={candidateDraft}
                          isCandidateEditorOpen={isCandidateEditorOpen}
                          isEditingCandidate={isEditingPoolCandidate}
                          candidates={poolDetails[pool.id]?.candidates || []}
                          readOnly={poolIsReadOnly}
                          imageSuggestions={imageSuggestions[pool.id] || []}
                          imageSuggestionLoading={Boolean(imageSuggestionLoading[pool.id])}
                          onDraftChange={(field, value) => updateCandidateDraft(pool.id, field, value)}
                          onCreateCandidate={() => openCandidateCreator(pool.id)}
                          onSubmit={() =>
                            isEditingPoolCandidate
                              ? handleCandidateEditSubmit(pool.id)
                              : handleCreateCandidateInPool(pool.id)
                          }
                          onCloseEditor={() => closeCandidateEditor(pool.id)}
                          onSuggestImages={() => handleSuggestImages(pool.id)}
                          onClearImage={() => selectSuggestedImage(pool.id, "")}
                          onSelectSuggestedImage={(imageUrl) => selectSuggestedImage(pool.id, imageUrl)}
                          onEditCandidate={(candidate) => openCandidateEditor(pool.id, candidate)}
                          onRemoveCandidate={(candidate) => handleRemoveCandidateFromPool(pool.id, candidate)}
                          isCreatePending={isActionPending(`create-candidate:${pool.id}`)}
                          isSavePending={isActionPending(`save-candidate:${pool.id}`)}
                          removingCandidateId={
                            poolDetails[pool.id]?.candidates?.find((candidate) =>
                              isActionPending(`remove-candidate:${pool.id}:${candidate.id}`)
                            )?.id || null
                          }
                        />
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
                          <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                            {describePoolVisibility(pool.visibility)}
                          </p>
                          {pool.description ? (
                            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{pool.description}</p>
                          ) : null}
                        </div>
                        <div className="xl:self-start xl:pt-0">
                          <CandidatePreviewChips candidates={previewCandidates} />
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
          <div className="flex flex-wrap gap-2">
            {[
              {
                key: "draft",
                label: "Drafts",
                count: tournaments.filter((tournament) => tournament.status === "draft").length
              },
              {
                key: "active",
                label: "Live",
                count: tournaments.filter((tournament) => tournament.status === "active").length
              },
              {
                key: "complete",
                label: "Completed",
                count: tournaments.filter((tournament) => tournament.status === "complete").length
              }
            ].map((view) => {
              const isActiveView = tournamentStageView === view.key;

              return (
                <button
                  key={view.key}
                  type="button"
                  onClick={() => setTournamentStageView(view.key)}
                  className={`ui-button ${isActiveView ? "ui-button-primary" : "ui-button-muted"}`}
                >
                  {view.label} ({view.count})
                </button>
              );
            })}
          </div>
          <SectionCard>
            <div className="space-y-0">
              {(() => {
                const firstDraftTournamentId =
                  tournaments.find((entry) => entry.status === "draft")?.id ?? null;
                const visibleTournaments = tournaments.filter((tournament) => {
                  if (tournamentStageView === "draft") {
                    return tournament.status === "draft";
                  }

                  if (tournamentStageView === "active") {
                    return tournament.status === "active";
                  }

                  return tournament.status === "complete";
                });
                const activeTournamentFocusId =
                  editingTournamentTitleId ??
                  (expandedDraftTournamentId !== "all" ? expandedDraftTournamentId : null);
                const shouldDimOtherTournaments = Boolean(activeTournamentFocusId);

                if (visibleTournaments.length === 0) {
                  return (
                    <div className="p-5">
                      {tournamentStageView === "draft" ? (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm text-[var(--muted)]">No draft brackets yet.</p>
                          <button
                            type="button"
                            onClick={() => createDraftBracket()}
                            disabled={isActionPending("create-tournament")}
                            className="ui-button ui-button-compact ui-button-primary"
                          >
                            Add Bracket
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm text-[var(--muted)]">
                          {tournamentStageView === "active"
                            ? "No live brackets."
                            : "No completed brackets."}
                        </p>
                      )}
                    </div>
                  );
                }

                return (
                  <>
                    {tournamentStageView === "draft" ? (
                      <div className="flex justify-end border-b border-[var(--line)] bg-[var(--panel)] px-5 py-4">
                        <button
                          type="button"
                          onClick={() => createDraftBracket()}
                          disabled={isActionPending("create-tournament")}
                          className="ui-button ui-button-compact ui-button-primary"
                        >
                          Add Bracket
                        </button>
                      </div>
                    ) : null}
                    {visibleTournaments.map((tournament) => {
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
                const linkedPoolCandidates = hasSourcePool
                  ? (poolDetails[bracketDraft.sourcePoolId]?.candidates || [])
                  : [];
                const selectedPoolCandidateCount = hasSourcePool
                  ? (poolDetails[bracketDraft.sourcePoolId]?.candidates || []).length
                  : 0;
                const activeShareLink =
                  tournamentShareLinks[tournament.id]?.find((item) => item.active) || null;
                const invitees = tournamentInvites[tournament.id] || [];
                const activeRoundVoteGoal = tournament.activeRoundOpenMatchCount ?? invitees[0]?.openMatchCount ?? 0;
                const completedInviteCount = invitees.filter(
                  (invite) => activeRoundVoteGoal > 0 && invite.votesCast >= activeRoundVoteGoal
                ).length;
                const creatorVotesCast = Math.max(activeRoundVoteGoal - (tournament.openVoteCount ?? 0), 0);
                const creatorIsDone = activeRoundVoteGoal > 0 && creatorVotesCast >= activeRoundVoteGoal;
                const rulesExpanded = Boolean(expandedBracketRules[tournament.id]);
                const isEditingTournamentTitle = editingTournamentTitleId === tournament.id;
                const isDraftExpanded =
                  tournament.status !== "draft"
                    ? true
                    : expandedDraftTournamentId === "all"
                      ? tournament.id === firstDraftTournamentId
                      : expandedDraftTournamentId === tournament.id;
                const isMutedTournament =
                  shouldDimOtherTournaments && activeTournamentFocusId !== tournament.id;
                const isManagingEntrants = managedEntrantsTournamentId === tournament.id;
                const isPoolMenuOpen = poolMenuTournamentId === tournament.id;
                const isPublishedTournament =
                  tournament.status !== "draft" && tournament.visibility !== "private";
                const canStartBracket =
                  hasBracketName &&
                  hasSourcePool &&
                  Math.max(tournament.entryCount ?? 0, selectedPoolCandidateCount) > 0;
                const hasOpenVotes = (tournament.openVoteCount ?? 0) > 0;

                return (
                <div
                  key={tournament.id}
                  ref={(node) => {
                    if (node) {
                      tournamentCardRefs.current[tournament.id] = node;
                    } else {
                      delete tournamentCardRefs.current[tournament.id];
                    }
                  }}
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
                            if (tournament.status === "draft" && !isPublishedTournament) {
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
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--muted)]">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            recentlySavedBrackets[tournament.id]
                              ? "bg-[var(--accent-3)]"
                              : tournament.status === "active"
                                ? "bg-[var(--accent-3)]"
                                : tournament.status === "complete"
                                  ? "bg-[var(--accent-2)]"
                                  : "bg-[var(--muted)]"
                          }`}
                          aria-hidden="true"
                        />
                        <span>{recentlySavedBrackets[tournament.id] ? "Saved" : tournament.status}</span>
                      </span>
                      <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-3)]">
                        {describeTournamentAudienceMode(tournament)}
                      </p>
                      {tournament.status === "complete" && tournament.completedAt ? (
                        <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                          {formatBracketDate(tournament.completedAt)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {tournament.status === "draft" ? (
                    isDraftExpanded ? (
                    <>
                    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] xl:items-stretch">
                        <div className="border border-[var(--line)] bg-[var(--panel)] p-4">
                          <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-3)]">
                            Bracket Access
                          </p>
                          <select
                            aria-label="Bracket Access"
                            value={getTournamentAudienceMode(bracketDraft)}
                            disabled={isPublishedTournament}
                            onChange={(event) => {
                              const nextAudienceMode = event.target.value;
                              const audiencePatch = getTournamentAudiencePatch(nextAudienceMode);
                              setTournamentInlineDrafts((current) => ({
                                ...current,
                                [tournament.id]: {
                                  ...bracketDraft,
                                  ...audiencePatch
                                }
                              }));
                              updateTournamentInline(tournament.id, audiencePatch, { silent: false });
                            }}
                            className="ui-field ui-field-panel ui-field-select"
                          >
                            <option value="private">Private</option>
                            <option value="with_friends">Friends</option>
                            <option value="public_listed">Public</option>
                            <option value="public_unlisted">Public Unlisted</option>
                          </select>
                        </div>

                        <div className="border border-[var(--line)] bg-[var(--panel)] p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                                {bracketDraft.playStyle.replace("_", " ")} {" / "}
                                {bracketDraft.resultMode.replace("_", " ")} {" / "}
                                {bracketDraft.tieBreakMode.replace("_", " ")}
                              </p>
                              {isPublishedTournament ? (
                                <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-2)]">
                                  Published brackets are locked in create.
                                </p>
                              ) : null}
                            </div>
                            {!isPublishedTournament ? (
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
                            ) : null}
                          </div>
                          {rulesExpanded && !isPublishedTournament ? (
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
                            <option value="fast_full_rank">Fast Full Rank</option>
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
                    <div className="mt-4 border border-[var(--line)] bg-[var(--panel)] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--accent-3)]">
                            {hasSourcePool
                              ? `Pool: ${tournament.sourcePoolName || "Linked Pool"}`
                              : "Pool"}
                          </p>
                          {!hasSourcePool ? (
                            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                              This bracket does not have entrants yet.
                            </p>
                          ) : null}
                        </div>
                        <div className="relative flex flex-wrap gap-3">
                          {hasSourcePool ? (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setManagedEntrantsTournamentId((current) =>
                                    current === tournament.id ? null : tournament.id
                                  )
                                }
                                disabled={isPublishedTournament}
                                className="ui-button ui-button-accent"
                              >
                                {isManagingEntrants ? "Close Entrants" : "Manage Candidates"}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setPoolMenuTournamentId((current) =>
                                    current === tournament.id ? null : tournament.id
                                  )
                                }
                                disabled={isPublishedTournament}
                                className="ui-button ui-button-muted"
                              >
                                Pick Pool
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSyncTournamentWithPool(tournament.id)}
                                disabled={isPublishedTournament || isActionPending(`sync-tournament:${tournament.id}`)}
                                className="ui-button ui-button-muted"
                              >
                                {isActionPending(`sync-tournament:${tournament.id}`) ? "Syncing" : "Sync With Pool"}
                              </button>
                              {isPoolMenuOpen ? (
                                <div className="absolute right-0 top-full z-20 mt-2 w-64 border border-[var(--line)] bg-[var(--panel)] p-2 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                                  <div className="max-h-72 overflow-y-auto">
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (isPublishedTournament) {
                                          return;
                                        }
                                        setPoolMenuTournamentId(null);
                                        const createdPool = await createPoolRecord({
                                          name: trimmedBracketTitle || "Untitled Pool",
                                          attachedTournamentId: tournament.id,
                                          switchToPools: false
                                        });

                                        if (createdPool) {
                                          setTournamentInlineDrafts((current) => ({
                                            ...current,
                                            [tournament.id]: {
                                              ...bracketDraft,
                                              sourcePoolId: createdPool.id
                                            }
                                          }));
                                          setManagedEntrantsTournamentId(tournament.id);
                                        }
                                      }}
                                      className="flex w-full items-center justify-between gap-3 border-b border-[var(--line)] px-3 py-3 text-left transition hover:bg-[var(--panel-3)]"
                                    >
                                      <span className="min-w-0">
                                        <span className="block truncate text-sm">New Pool</span>
                                        <span className="mt-1 block text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                                          Create a fresh pool for this bracket
                                        </span>
                                      </span>
                                    </button>
                                    {pools.map((pool) => {
                                      const isCurrentPool = pool.id === bracketDraft.sourcePoolId;

                                      return (
                                        <button
                                          key={pool.id}
                                          type="button"
                                          onClick={() => {
                                            setPoolMenuTournamentId(null);
                                          setTournamentInlineDrafts((current) => ({
                                            ...current,
                                            [tournament.id]: {
                                              ...bracketDraft,
                                              sourcePoolId: pool.id
                                            }
                                          }));
                                          if (!isPublishedTournament) {
                                            updateTournamentInline(
                                              tournament.id,
                                              {
                                                sourcePoolId: pool.id
                                              },
                                              { silent: false }
                                            );
                                          }
                                        }}
                                          className={`flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition ${
                                            isCurrentPool
                                              ? "bg-[var(--panel-3)] text-[var(--accent-3)]"
                                              : "hover:bg-[var(--panel-3)]"
                                          }`}
                                        >
                                          <span className="min-w-0">
                                            <span className="block truncate text-sm">{pool.name}</span>
                                            <span className="mt-1 block text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                                              {pool.candidateCount} candidates
                                            </span>
                                          </span>
                                          {isCurrentPool ? (
                                            <span className="text-[11px] uppercase tracking-[0.14em]">Current</span>
                                          ) : null}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => openSeedingEditor(tournament)}
                                disabled={isPublishedTournament}
                                className="ui-button ui-button-muted"
                              >
                                Set Seeding
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setPoolMenuTournamentId((current) =>
                                    current === tournament.id ? null : tournament.id
                                  )
                                }
                                disabled={isPublishedTournament}
                                className="ui-button ui-button-muted"
                              >
                                Pick Pool
                              </button>
                              {isPoolMenuOpen ? (
                                <div className="absolute right-0 top-full z-20 mt-2 w-64 border border-[var(--line)] bg-[var(--panel)] p-2 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                                  <div className="max-h-72 overflow-y-auto">
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (isPublishedTournament) {
                                          return;
                                        }
                                        setPoolMenuTournamentId(null);
                                        const createdPool = await createPoolRecord({
                                          name: trimmedBracketTitle || "Untitled Pool",
                                          attachedTournamentId: tournament.id,
                                          switchToPools: false
                                        });

                                        if (createdPool) {
                                          setTournamentInlineDrafts((current) => ({
                                            ...current,
                                            [tournament.id]: {
                                              ...bracketDraft,
                                              sourcePoolId: createdPool.id
                                            }
                                          }));
                                          setManagedEntrantsTournamentId(tournament.id);
                                        }
                                      }}
                                      disabled={
                                        isPublishedTournament ||
                                        isActionPending(`create-pool-for-tournament:${tournament.id}`)
                                      }
                                      className="flex w-full items-center justify-between gap-3 border-b border-[var(--line)] px-3 py-3 text-left transition hover:bg-[var(--panel-3)] disabled:opacity-60"
                                    >
                                      <span className="min-w-0">
                                        <span className="block truncate text-sm">
                                          {isActionPending(`create-pool-for-tournament:${tournament.id}`)
                                            ? "Creating Pool"
                                            : "New Pool"}
                                        </span>
                                        <span className="mt-1 block text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                                          Create a fresh pool for this bracket
                                        </span>
                                      </span>
                                    </button>
                                    {pools.map((pool) => (
                                      <button
                                        key={pool.id}
                                        type="button"
                                        onClick={() => {
                                          setPoolMenuTournamentId(null);
                                          setTournamentInlineDrafts((current) => ({
                                            ...current,
                                            [tournament.id]: {
                                              ...bracketDraft,
                                              sourcePoolId: pool.id
                                            }
                                          }));
                                          if (!isPublishedTournament) {
                                            updateTournamentInline(
                                              tournament.id,
                                              {
                                                sourcePoolId: pool.id
                                              },
                                              { silent: false }
                                            );
                                          }
                                        }}
                                        className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition hover:bg-[var(--panel-3)]"
                                      >
                                        <span className="min-w-0">
                                          <span className="block truncate text-sm">{pool.name}</span>
                                          <span className="mt-1 block text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                                            {pool.candidateCount} candidates
                                          </span>
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                            </>
                          )}
                        </div>
                      </div>
                      {isManagingEntrants && hasSourcePool ? (
                        <CandidateManagerPanel
                          poolId={bracketDraft.sourcePoolId}
                          candidateDraft={candidateDrafts[bracketDraft.sourcePoolId] || emptyCandidateForm}
                          isCandidateEditorOpen={candidateEditor?.poolId === bracketDraft.sourcePoolId}
                          isEditingCandidate={
                            candidateEditor?.poolId === bracketDraft.sourcePoolId &&
                            Boolean(candidateEditor?.candidateId)
                          }
                          readOnly={isPublishedTournament}
                          candidates={linkedPoolCandidates}
                          imageSuggestions={imageSuggestions[bracketDraft.sourcePoolId] || []}
                          imageSuggestionLoading={Boolean(imageSuggestionLoading[bracketDraft.sourcePoolId])}
                          onDraftChange={(field, value) =>
                            updateCandidateDraft(bracketDraft.sourcePoolId, field, value)
                          }
                          onCreateCandidate={() => openCandidateCreator(bracketDraft.sourcePoolId)}
                          onSubmit={() =>
                            candidateEditor?.poolId === bracketDraft.sourcePoolId &&
                            candidateEditor?.candidateId
                              ? handleCandidateEditSubmit(bracketDraft.sourcePoolId)
                              : handleCreateCandidateInPool(bracketDraft.sourcePoolId)
                          }
                          onCloseEditor={() => closeCandidateEditor(bracketDraft.sourcePoolId)}
                          onSuggestImages={() => handleSuggestImages(bracketDraft.sourcePoolId)}
                          onClearImage={() => selectSuggestedImage(bracketDraft.sourcePoolId, "")}
                          onSelectSuggestedImage={(imageUrl) =>
                            selectSuggestedImage(bracketDraft.sourcePoolId, imageUrl)
                          }
                          onEditCandidate={(candidate) =>
                            openCandidateEditor(bracketDraft.sourcePoolId, candidate)
                          }
                          onRemoveCandidate={(candidate) =>
                            handleRemoveCandidateFromPool(bracketDraft.sourcePoolId, candidate)
                          }
                          isCreatePending={isActionPending(`create-candidate:${bracketDraft.sourcePoolId}`)}
                          isSavePending={isActionPending(`save-candidate:${bracketDraft.sourcePoolId}`)}
                          removingCandidateId={
                            linkedPoolCandidates.find((candidate) =>
                              isActionPending(`remove-candidate:${bracketDraft.sourcePoolId}:${candidate.id}`)
                            )?.id || null
                          }
                          listHeading="In This Bracket"
                          listEmptyMessage="No entrants in this bracket yet."
                        />
                      ) : null}
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
                      <div />
                      <div className="flex flex-wrap gap-3 xl:justify-end">
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
                          {describeTournamentAudienceMode(tournament)} {" / "}
                          {(tournament.playStyle || "fixed_bracket").replaceAll("_", " ")} {" / "}
                          {(tournament.resultMode || "winner_only").replaceAll("_", " ")} {" / "}
                          {tournament.entryCount} entries
                        </p>
                        {!isPublishedTournament ? (
                          <button
                            type="button"
                            onClick={() => setExpandedDraftTournamentId(tournament.id)}
                            className="ui-button ui-button-accent"
                          >
                            Edit Draft
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
                      </div>
                    )
                  ) : tournament.status === "active" ? (
                    <div className="mt-4 grid gap-4 xl:grid-cols-[14rem_minmax(0,1fr)] xl:items-start">
                      <div className="flex flex-col gap-3">
                        {hasOpenVotes ? (
                          <Link
                            href={`/vote?tournament=${tournament.id}&returnTo=create`}
                            className="cta-link ui-button ui-button-primary w-full"
                          >
                            Vote Now
                          </Link>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="ui-button ui-button-primary w-full"
                          >
                            No Open Matches
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCloseCurrentRound(tournament.id)}
                          disabled={isActionPending(`close-round:${tournament.id}`)}
                          className="ui-button ui-button-muted w-full"
                        >
                          {isActionPending(`close-round:${tournament.id}`)
                            ? "Closing Round"
                            : "Close Current Round"}
                        </button>
                        {tournament.sharingMode === "with_friends" ? (
                          <button
                            type="button"
                            onClick={() => handleCopyShareLink(tournament.id)}
                            disabled={isActionPending(`share-link:${tournament.id}`)}
                            className="ui-button ui-button-accent w-full"
                          >
                            {activeShareLink ? "Copy Link" : "Preparing"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleRerunTournament(tournament.id)}
                          disabled={isActionPending(`rerun-tournament:${tournament.id}`)}
                          className="ui-button ui-button-accent w-full"
                        >
                          {isActionPending(`rerun-tournament:${tournament.id}`) ? "Creating" : "Rerun"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleArchiveTournament(tournament.id, tournament.title)}
                          disabled={isActionPending(`archive-tournament:${tournament.id}`)}
                          className="ui-button ui-button-muted w-full"
                        >
                          {isActionPending(`archive-tournament:${tournament.id}`) ? "Archiving" : "Archive"}
                        </button>
                      </div>
                      <div>
                        <div className="border border-[var(--line)] bg-[var(--panel)] p-4">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--accent-3)]">
                                Current Round
                              </p>
                              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                                {tournament.activeRoundNumber
                                  ? `Round ${tournament.activeRoundNumber}`
                                  : "Waiting for the next round to open."}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="display-face text-lg font-black text-[var(--accent-2)]">
                                {activeRoundVoteGoal}
                              </p>
                              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                                {activeRoundVoteGoal === 1 ? "Open match" : "Open matches"}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center justify-between gap-3 border border-[var(--line)] bg-[var(--panel-2)] px-4 py-4">
                              <div className="min-w-0">
                                <p className="display-face truncate text-sm font-black">You</p>
                                <p className="mt-1 truncate text-xs tracking-[0.08em] text-[var(--muted)]">
                                  Creator
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="display-face text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-2)]">
                                  {creatorVotesCast}/{activeRoundVoteGoal} votes
                                </p>
                                <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                                  {creatorIsDone ? "Ready" : "Waiting"}
                                </p>
                              </div>
                            </div>
                            {tournament.sharingMode === "with_friends" ? (
                              invitees.length > 0 ? (
                                invitees.map((invite) => {
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
                                })
                              ) : (
                                <p className="text-sm text-[var(--muted)]">No invited voters have joined yet.</p>
                              )
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                          <span>{describeTournamentAudienceMode(tournament)}</span>
                          <span>•</span>
                          <span>{tournament.playStyle.replace("_", " ")}</span>
                          <span>•</span>
                          <span>{tournament.resultMode.replace("_", " ")}</span>
                          <span>•</span>
                          <span>{tournament.tieBreakMode.replace("_", " ")}</span>
                        </div>
                      </div>
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
                            <span>{describeTournamentAudienceMode(tournament)}</span>
                            <span>/</span>
                            <span>{tournament.playStyle.replace("_", " ")}</span>
                            <span>/</span>
                            <span>{tournament.resultMode.replace("_", " ")}</span>
                            <span>/</span>
                            <span>{tournament.tieBreakMode.replace("_", " ")}</span>
                            <span>/</span>
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
                    <span>{describeTournamentAudienceMode(tournament)}</span>
                    <span>/</span>
                    <span>{tournament.playStyle.replace("_", " ")}</span>
                    <span>/</span>
                    <span>{tournament.resultMode.replace("_", " ")}</span>
                    <span>/</span>
                    <span>{tournament.entryCount} entries</span>
                  </div>
                  ) : null}
                  </div>
                );
                })}
                  </>
                );
              })()}
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
                <select
                  value={poolForm.visibility}
                  onChange={(event) =>
                    setPoolForm((current) => ({ ...current, visibility: event.target.value }))
                  }
                  className="ui-field ui-field-modal ui-field-select"
                >
                  <option value="private">Private Draft</option>
                  <option value="public_listed">Publish</option>
                  <option value="public_unlisted">Publish Unlisted</option>
                </select>
                <PoolPublishWarning visibility={poolForm.visibility} />
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

      {isPoolImportModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-2xl border border-[var(--line)] bg-[var(--panel)]">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-4">
              <div>
                <h2 className="display-face text-2xl font-black uppercase tracking-[0.1em]">
                  Import Pool
                </h2>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                  Paste source text and seed a pool with extracted candidates
                </p>
              </div>
              <button
                type="button"
                onClick={closePoolImportModal}
                className="display-face text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-2)]"
              >
                Close
              </button>
            </div>
            <div className="px-5 py-5">
              <form className="space-y-4" onSubmit={handlePoolImportSubmit}>
                <input
                  value={poolImportForm.name}
                  onChange={(event) =>
                    setPoolImportForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Pool name"
                  className="ui-field ui-field-modal"
                />
                <textarea
                  value={poolImportForm.description}
                  onChange={(event) =>
                    setPoolImportForm((current) => ({
                      ...current,
                      description: event.target.value
                    }))
                  }
                  placeholder="Pool description"
                  rows={2}
                  className="ui-field ui-field-modal"
                />
                <select
                  value={poolImportForm.visibility}
                  onChange={(event) =>
                    setPoolImportForm((current) => ({
                      ...current,
                      visibility: event.target.value
                    }))
                  }
                  className="ui-field ui-field-modal ui-field-select"
                >
                  <option value="private">Private Draft</option>
                  <option value="public_listed">Publish</option>
                  <option value="public_unlisted">Publish Unlisted</option>
                </select>
                <PoolPublishWarning visibility={poolImportForm.visibility} />
                <div className="space-y-2">
                  <p className="display-face text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-3)]">
                    Source Text
                  </p>
                  <textarea
                    value={poolImportForm.text}
                    onChange={(event) =>
                      setPoolImportForm((current) => ({ ...current, text: event.target.value }))
                    }
                    placeholder="Paste the source text, notes, article excerpt, or scraped content here."
                    rows={14}
                    className="ui-field ui-field-modal"
                  />
                  <p className="text-xs leading-5 text-[var(--muted)]">
                    The importer will extract distinct candidate names from this text and create
                    a seeded pool.
                  </p>
                </div>
                <div className="border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3">
                  <p className="text-sm leading-6 text-[var(--muted)]">
                    Or use a bookmarklet to build a pool from a web page.{" "}
                    <Link href="/tools/import" className="text-[var(--accent-3)] underline">
                      Set up page import
                    </Link>
                    .
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={isPending || isActionPending("import-pool")}
                    className="ui-button ui-button-accent-fill"
                  >
                    {isActionPending("import-pool") ? "Importing" : "Build Pool"}
                  </button>
                  <button
                    type="button"
                    onClick={closePoolImportModal}
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
                  <div className="block space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--accent-3)]">
                      Bracket Access
                    </p>
                    <select
                      aria-label="Bracket Access"
                      value={getTournamentAudienceMode(tournamentForm)}
                      onChange={(event) => {
                        const audiencePatch = getTournamentAudiencePatch(event.target.value);
                        setTournamentForm((current) => ({
                          ...current,
                          ...audiencePatch
                        }));
                      }}
                      className="ui-field ui-field-modal ui-field-select"
                    >
                      <option value="private">Private</option>
                      <option value="with_friends">Friends</option>
                      <option value="public_listed">Public</option>
                      <option value="public_unlisted">Public Unlisted</option>
                    </select>
                  </div>
                  <div className="block">
                    <select
                      aria-label="Voting Access"
                      value={tournamentForm.votingAccess}
                      onChange={(event) =>
                        setTournamentForm((current) => ({
                          ...current,
                          votingAccess: event.target.value
                        }))
                      }
                      className="ui-field ui-field-modal ui-field-select"
                    >
                      <option value="signed_in_only">Signed-In Voting</option>
                      <option value="anyone">Anyone Can Vote</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <TournamentPublishWarning visibility={tournamentForm.visibility} />
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
                      <option value="fast_full_rank">Fast Full Rank</option>
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
                <select
                  value={poolEditForm.visibility}
                  onChange={(event) =>
                    setPoolEditForm((current) => ({ ...current, visibility: event.target.value }))
                  }
                  className="ui-field ui-field-modal ui-field-select"
                >
                  <option value="private">Private Draft</option>
                  <option value="public_listed">Publish</option>
                  <option value="public_unlisted">Publish Unlisted</option>
                </select>
                <PoolPublishWarning visibility={poolEditForm.visibility} />
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
                <p className="text-sm text-[var(--muted)]">Loading entriesâ€¦</p>
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
                          <ResilientRemoteImage
                            src={entry.candidateImageUrl}
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
