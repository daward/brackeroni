"use client";

import { Fragment, useEffect, useState } from "react";
import { Gauge, Globe2, ListOrdered, LockKeyhole, Medal, Plus, Trophy, Users } from "lucide-react";
import { CandidateManagerPanel } from "@/components/pools/candidates";
import { ContentCard } from "@/components/shared";
import { PoolManagementPanel } from "@/components/pools/shared";
import { parseCandidateTagText } from "@/lib/candidate-tags";
import { getPool, listPools, suggestImages } from "@/lib/client-api/create-workspace";
import { useInfiniteScroll } from "@/components/shared";

const STEPS = ["Contenders", "Structure", "Matchups", "Seeding", "Access", "Review"];
const WIZARD_POOL_PAGE_SIZE = 24;

const RESULT_MODE_DETAILS = {
  winner_only: {
    option: "Crown one winner - simple elimination",
    title: "Crown one winner",
    description: "A familiar knockout bracket. Once a champion is decided, the bracket is complete.",
    note: "Best default when you only need the winner."
  },
  full_ranking: {
    option: "Rank everyone - traditional bracket, more voting",
    title: "Rank everyone",
    description: "The bracket continues after first place so every contender receives a final position.",
    note: "Best when the complete order matters, not just the champion."
  },
  partial_ranking: {
    option: "Rank the top half - recognize leaders, save voting",
    title: "Rank the top half",
    description: "The strongest half receives explicit placements; the remaining contenders are ordered by performance.",
    note: "Best when the leaders matter more than the complete order."
  },
  fast_full_rank: {
    option: "Rank everyone faster - Swiss rounds, not a knockout bracket",
    title: "Rank everyone faster",
    description: "Uses Swiss-style rounds: contenders keep appearing in later rounds instead of dropping out, producing a full ranking with fewer matchups.",
    note: "Best when you want a complete ranking without a long elimination bracket."
  },
  parallel_full_ranking: {
    option: "Rank together - everyone votes through their own matchups",
    title: "Rank together",
    description: "Each participant works through their own set of matchups. Their completed rankings combine into one group result.",
    note: "Best for group decisions where everyone should weigh in independently."
  }
};

const RESULT_MODE_ICONS = {
  winner_only: Trophy,
  full_ranking: ListOrdered,
  partial_ranking: Medal,
  fast_full_rank: Gauge,
  parallel_full_ranking: Users
};
const emptyCandidate = { name: "", description: "", imageUrl: "", tagsText: "" };

function LocalPoolBuilder({ poolName, onPoolNameChange, candidates, onCandidatesChange }) {
  const [poolDescription, setPoolDescription] = useState("");
  const [poolVisibility, setPoolVisibility] = useState("private");
  const [candidateDraft, setCandidateDraft] = useState(emptyCandidate);
  const [editingCandidateId, setEditingCandidateId] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [imageSuggestions, setImageSuggestions] = useState([]);
  const [imageSuggestionLoading, setImageSuggestionLoading] = useState(false);

  useEffect(() => {
    const candidateName = candidateDraft.name.trim();

    if (!isEditorOpen || candidateName.length < 2) {
      return undefined;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setImageSuggestionLoading(true);
      try {
        const data = await suggestImages(candidateName);
        if (active) {
          setImageSuggestions(data.items || []);
        }
      } catch {
        if (active) {
          setImageSuggestions([]);
        }
      } finally {
        if (active) {
          setImageSuggestionLoading(false);
        }
      }
    }, 700);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [candidateDraft.name, isEditorOpen]);

  function closeEditor() {
    setCandidateDraft(emptyCandidate);
    setEditingCandidateId(null);
    setIsEditorOpen(false);
  }

  function saveCandidate() {
    const name = candidateDraft.name.trim();
    if (!name) return;
    const item = { id: editingCandidateId || `draft-${crypto.randomUUID()}`, name, description: candidateDraft.description.trim() || null, imageUrl: candidateDraft.imageUrl.trim() || null, tags: parseCandidateTagText(candidateDraft.tagsText) };
    onCandidatesChange(editingCandidateId ? candidates.map((candidate) => candidate.id === editingCandidateId ? item : candidate) : [...candidates, item]);
    closeEditor();
  }

  async function handleSuggestImages() {
    if (candidateDraft.name.trim().length < 2) return;
    setImageSuggestionLoading(true);
    try {
      const data = await suggestImages(candidateDraft.name.trim());
      setImageSuggestions(data.items || []);
    } finally {
      setImageSuggestionLoading(false);
    }
  }

  function importCandidates() {
    const existingNames = new Set(candidates.map((candidate) => candidate.name.toLowerCase()));
    const additions = importText.split(/\r?\n|,/).map((name) => name.trim()).filter((name) => name && !existingNames.has(name.toLowerCase())).map((name) => ({ id: `draft-${crypto.randomUUID()}`, name, description: null, imageUrl: null, tags: [] }));
    onCandidatesChange([...candidates, ...additions]);
    setImportText("");
    setIsImportOpen(false);
  }

  const draftPool = { name: poolName, description: poolDescription, visibility: poolVisibility };
  const pool = { name: poolName || "Untitled Pool", candidateCount: candidates.length, visibility: poolVisibility };

  const editor = { isOpen: isEditorOpen, isEditing: Boolean(editingCandidateId), draft: candidateDraft, imageSuggestions, imageSuggestionLoading, description: "", onDraftChange: (field, value) => setCandidateDraft((current) => ({ ...current, [field]: value })), onSubmit: saveCandidate, onClose: closeEditor, onSuggestImages: handleSuggestImages, onClearImage: () => setCandidateDraft((current) => ({ ...current, imageUrl: "" })), onSelectSuggestedImage: (imageUrl) => setCandidateDraft((current) => ({ ...current, imageUrl })) };
  const actions = { onCreate: () => { setCandidateDraft(emptyCandidate); setEditingCandidateId(null); setImageSuggestions([]); setIsEditorOpen(true); }, onImport: () => setIsImportOpen(true), onEdit: (candidate) => { setCandidateDraft({ name: candidate.name, description: candidate.description || "", imageUrl: candidate.imageUrl || "", tagsText: (candidate.tags || []).join(", ") }); setEditingCandidateId(candidate.id); setImageSuggestions([]); setIsEditorOpen(true); }, onRemove: (candidate) => onCandidatesChange(candidates.filter((item) => item.id !== candidate.id)) };
  return <PoolManagementPanel pool={pool} draft={draftPool} presentation={{ title: { placeholder: "Name this pool" }, summary: { visibility: false } }} onDraftChange={(patch) => { if (typeof patch.name === "string") onPoolNameChange(patch.name); if (typeof patch.description === "string") setPoolDescription(patch.description); if (typeof patch.visibility === "string") setPoolVisibility(patch.visibility); }} className="space-y-5 py-5"><p className="text-sm leading-6 text-[var(--muted)]">Build this pool here. It will be saved with the bracket only when you finish setup.</p>{isImportOpen ? <div className="border border-[var(--line)] p-4"><label className="block space-y-2"><span className="ui-section-kicker">Paste candidates</span><textarea value={importText} onChange={(event) => setImportText(event.target.value)} rows={6} placeholder="One contender per line" className="ui-field ui-field-panel resize-y" /></label><div className="mt-3 flex gap-3"><button type="button" onClick={importCandidates} className="ui-button ui-button-primary">Add candidates</button><button type="button" onClick={() => setIsImportOpen(false)} className="ui-button ui-button-muted">Cancel</button></div></div> : null}<CandidateManagerPanel collection={{ candidates, hasNextPage: false, isLoadingMore: false, loadMore: null }} editor={editor} actions={actions} tagManagement={{ showControl: false }} view={{ listHeading: "Candidates in this new pool", listEmptyMessage: "Add candidates individually or import a list to build this pool." }} /></PoolManagementPanel>;
}

function VersusChoice({ value, choices, onChange }) {
  return (
    <div className="grid items-stretch gap-2 sm:grid-cols-[minmax(0,1fr)_2.75rem_minmax(0,1fr)] sm:gap-3">
      {choices.map((choice, index) => (
        <Fragment key={choice.value}>
          {index > 0 ? (
            <div className="flex items-center justify-center py-1 sm:py-0">
              <span className="display-face flex h-9 w-9 items-center justify-center rounded-full border border-[var(--accent-2)] bg-[var(--panel-3)] text-xs font-black uppercase text-[var(--accent-2)]">VS</span>
            </div>
          ) : null}
          <ContentCard
            as="button"
            type="button"
            aria-pressed={value === choice.value}
            onClick={() => onChange(choice.value)}
            interactive
            selected={value === choice.value}
            selectedTone="yellow"
            className="p-4 text-left"
          >
            <span className="display-face block text-base font-black uppercase leading-tight">{choice.title}</span>
            <span className="mt-2 block text-sm leading-5 text-[var(--muted)]">{choice.description}</span>
          </ContentCard>
        </Fragment>
      ))}
    </div>
  );
}

function ChoiceCards({ value, choices, onChange }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {choices.map((choice) => {
        const Icon = choice.icon;

        return (
        <ContentCard
          as="button"
          key={choice.value}
          type="button"
          aria-pressed={value === choice.value}
          onClick={() => onChange(choice.value)}
          interactive
          selected={value === choice.value}
          className="min-h-36 p-4 text-left"
        >
          <span className="flex items-center gap-2">
            {Icon ? <Icon aria-hidden="true" size={18} strokeWidth={2} className="shrink-0 text-[var(--accent-2)]" /> : null}
            <span className="display-face text-base font-black uppercase leading-tight">{choice.title}</span>
          </span>
          <span className="ui-copy mt-3 block text-sm leading-6 text-[var(--muted)]">{choice.description}</span>
        </ContentCard>
        );
      })}
    </div>
  );
}
function WizardQuestion({ children }) {
  return <p className="display-face text-sm font-black uppercase tracking-[0.18em] text-[var(--accent-3)]">{children}</p>;
}
function ReviewItem({ icon: Icon, label, value, detail }) {
  return (
    <div className="min-h-32 border border-[var(--line)] p-4">
      <span className="flex items-center gap-2 text-[var(--accent-3)]">
        <Icon aria-hidden="true" size={17} strokeWidth={2} />
        <span className="ui-section-kicker">{label}</span>
      </span>
      <p className="display-face mt-4 text-lg font-black uppercase leading-tight text-[var(--ink)]">{value}</p>
      {detail ? <p className="ui-copy mt-2 text-sm leading-5 text-[var(--muted)]">{detail}</p> : null}
    </div>
  );
}
function ResultModeTile({ mode, title, detail, selected, onSelect, className = "", disabled = false }) {
  const Icon = RESULT_MODE_ICONS[mode] || Trophy;

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={() => onSelect(mode)}
      className={`flex min-h-44 flex-col border p-4 text-left transition ${
        selected
          ? "border-[var(--accent-3)] bg-[rgba(52,211,196,0.06)]"
          : "border-[var(--line)] hover:border-[var(--line-strong)] hover:bg-[rgba(255,255,255,0.02)]"
      } ${className}`}
    >
      <span className="flex items-center gap-2">
        <Icon aria-hidden="true" size={18} strokeWidth={2} className="shrink-0 text-[var(--accent-2)]" />
        <span className="display-face text-base font-black uppercase leading-tight">{title}</span>
      </span>
      <span className="ui-copy mt-3 text-sm leading-6 text-[var(--muted)]">{detail.description}</span>
      <span className="ui-copy mt-auto pt-4 text-sm leading-6 tracking-normal text-[var(--accent-2)]">{detail.note}</span>
    </button>
  );
}

function ResultModeChoices({ value, onChange }) {
  const isRanking = value !== "winner_only";
  const chooseRanking = () => onChange(isRanking ? value : "full_ranking");

  return (
    <div className="space-y-6">
      <div className="grid items-stretch gap-2 sm:grid-cols-[minmax(0,1fr)_2.75rem_minmax(0,1fr)] sm:gap-3">
        <ResultModeTile
          mode="winner_only"
          title="One winner"
          detail={{
            description: "A familiar knockout bracket that ends when one champion remains.",
            note: "Best when only the final pick matters."
          }}
          selected={!isRanking}
          onSelect={onChange}
        />
        <div className="flex items-center justify-center py-1 sm:py-0">
          <span className="display-face flex h-9 w-9 items-center justify-center rounded-full border border-[var(--accent-2)] bg-[var(--panel-3)] text-xs font-black uppercase text-[var(--accent-2)]">VS</span>
        </div>
        <ResultModeTile
          mode="full_ranking"
          title="A ranking"
          detail={{
            description: "Order contenders beyond first place, from the whole field or only its leaders.",
            note: "Choose this when the result should be more than a champion."
          }}
          selected={isRanking}
          onSelect={chooseRanking}
        />
      </div>

      <div className={`space-y-3 border-t border-[var(--line)] pt-5 transition-opacity ${isRanking ? "opacity-100" : "opacity-40"}`} aria-disabled={!isRanking}>
          <p className="display-face text-sm font-black uppercase tracking-[0.18em] text-[var(--accent-3)]">
            How should the ranking work?
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ResultModeTile
              mode="full_ranking"
              title="Traditional bracket"
              detail={RESULT_MODE_DETAILS.full_ranking}
              selected={value === "full_ranking"}
              onSelect={onChange}
              disabled={!isRanking}
            />
            <ResultModeTile
              mode="fast_full_rank"
              title="Faster rounds"
              detail={RESULT_MODE_DETAILS.fast_full_rank}
              selected={value === "fast_full_rank"}
              onSelect={onChange}
              disabled={!isRanking}
            />
            <ResultModeTile
              mode="parallel_full_ranking"
              title="Independent rankings"
              detail={RESULT_MODE_DETAILS.parallel_full_ranking}
              selected={value === "parallel_full_ranking"}
              onSelect={onChange}
              disabled={!isRanking}
            />
            <ResultModeTile
              mode="partial_ranking"
              title="Rank the top half"
              detail={RESULT_MODE_DETAILS.partial_ranking}
              selected={value === "partial_ranking"}
              onSelect={onChange}
              disabled={!isRanking}
            />
          </div>
      </div>
    </div>
  );
}
export function BracketCreationWizard({ pools, creating, onCancel, onCreate, onCreatePoolWorkspace, initialPoolId = "", initialConfig = null, initialStep = 0, fullPage = false }) {
  const [step, setStep] = useState(initialStep);
  const [sourceMode, setSourceMode] = useState(initialConfig?.sourcePoolId || initialPoolId || pools.length ? "existing" : "new");
  const [sourcePoolId, setSourcePoolId] = useState(initialConfig?.sourcePoolId || initialPoolId || pools[0]?.id || "");
  const [availablePools, setAvailablePools] = useState(pools);
  const [poolPage, setPoolPage] = useState(1);
  const [hasMorePools, setHasMorePools] = useState(pools.length >= WIZARD_POOL_PAGE_SIZE);
  const [loadingMorePools, setLoadingMorePools] = useState(false);
  const [poolName, setPoolName] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [title, setTitle] = useState(initialConfig?.title || "");
  const [playStyle, setPlayStyle] = useState(initialConfig?.playStyle || "fixed_bracket");
  const [resultMode, setResultMode] = useState(initialConfig?.resultMode || "winner_only");
  const [advancementMode, setAdvancementMode] = useState(initialConfig?.advancementMode || "vote_winner");
  const [tieBreakMode, setTieBreakMode] = useState(initialConfig?.tieBreakMode || "higher_seed_wins");
  const [seedingMode, setSeedingMode] = useState("pool_order");
  const [customSeedEntries, setCustomSeedEntries] = useState([]);
  const [customSeedLoading, setCustomSeedLoading] = useState(false);
  const [draggingSeedCandidateId, setDraggingSeedCandidateId] = useState(null);
  const [audienceMode, setAudienceMode] = useState(initialConfig?.audienceMode || "private");
  const [error, setError] = useState("");
  const selectedPool = availablePools.find((pool) => pool.id === sourcePoolId) || null;
  const resultModeDetail = RESULT_MODE_DETAILS[resultMode];

  useEffect(() => {
    setAvailablePools((current) => {
      const knownIds = new Set(current.map((pool) => pool.id));
      const additions = pools.filter((pool) => !knownIds.has(pool.id));
      return additions.length ? [...current, ...additions] : current;
    });
  }, [pools]);

  async function loadMorePools() {
    if (loadingMorePools || !hasMorePools) return;

    const nextPage = poolPage;
    setLoadingMorePools(true);
    try {
      const data = await listPools({
        limit: WIZARD_POOL_PAGE_SIZE,
        offset: nextPage * WIZARD_POOL_PAGE_SIZE
      });
      const nextPools = data.items || [];
      setAvailablePools((current) => {
        const existingIds = new Set(current.map((pool) => pool.id));
        return [...current, ...nextPools.filter((pool) => !existingIds.has(pool.id))];
      });
      setPoolPage(nextPage + 1);
      setHasMorePools(Boolean(data.meta?.hasNextPage));
    } catch {
      setError("We couldn't load more pools. Please try again.");
    } finally {
      setLoadingMorePools(false);
    }
  }

  async function chooseSeedingMode(mode) {
    setSeedingMode(mode);
    if (mode !== "custom" || customSeedEntries.length) return;

    if (sourceMode === "new") {
      setCustomSeedEntries(candidates);
      return;
    }

    if (!selectedPool) return;

    setCustomSeedLoading(true);
    try {
      const data = await getPool(selectedPool.id);
      setCustomSeedEntries(data.item?.candidates || []);
    } catch {
      setError("We couldn't load this pool's contenders for seeding.");
    } finally {
      setCustomSeedLoading(false);
    }
  }

  function moveCustomSeedEntry(candidateId, targetCandidateId) {
    if (!candidateId || !targetCandidateId || candidateId === targetCandidateId) return;

    setCustomSeedEntries((current) => {
      const sourceIndex = current.findIndex((candidate) => candidate.id === candidateId);
      const targetIndex = current.findIndex((candidate) => candidate.id === targetCandidateId);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  const poolLoadSentinelRef = useInfiniteScroll({
    enabled: sourceMode === "existing" && hasMorePools,
    loading: loadingMorePools,
    pageKey: poolPage,
    onLoadMore: loadMorePools
  });

  function goNext() {
    if (step === 0) {
      if (sourceMode === "existing" && !selectedPool) {
        setError("Choose a pool to continue.");
        return;
      }
      if (sourceMode === "existing" && (selectedPool?.candidateCount ?? 0) < 2) {
        setError("Add at least two candidates to this pool before creating a bracket.");
        return;
      }
      if (sourceMode === "new" && !poolName.trim()) {
        setError("Give the new pool a name.");
        return;
      }
      if (sourceMode === "new" && candidates.length < 2) {
        setError("Add at least two candidates to continue.");
        return;
      }
    }
    if (step === 3 && seedingMode === "custom" && customSeedEntries.length < 2) {
      setError("Wait for the contenders to load before continuing.");
      return;
    }
    setError("");
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  async function handleCreate() {
    if (sourceMode === "existing" && (selectedPool?.candidateCount ?? 0) < 2) {
      setStep(0);
      setError("Add at least two candidates to this pool before creating a bracket.");
      return;
    }
    if (sourceMode === "new" && candidates.length < 2) {
      setStep(0);
      setError("Add at least two candidates to this pool before creating a bracket.");
      return;
    }

    setError("");
    const created = await onCreate({
      title: title.trim(),
      source: sourceMode === "existing"
        ? { type: "existing", pool: selectedPool }
        : { type: "new", name: poolName.trim(), candidates: seedingMode === "custom" ? customSeedEntries : candidates },
      playStyle,
      resultMode,
      advancementMode,
      tieBreakMode,
      seedingMode,
      seedCandidateIds: sourceMode === "existing" && seedingMode === "custom" ? customSeedEntries.map((candidate) => candidate.id) : null,
      audienceMode
    });

    if (!created) {
      setError("We couldn't create that bracket. Please try again.");
    }
  }

  const selectedCount = sourceMode === "existing" ? selectedPool?.candidateCount ?? 0 : candidates.length;
  const selectedName = sourceMode === "existing" ? selectedPool?.name : poolName.trim();

  return (
    <div className={fullPage ? "bracket-setup-page" : "fixed inset-0 z-50 bg-black/70 px-4 py-4 sm:flex sm:items-center sm:justify-center"}>
      <section className={`mx-auto flex w-full flex-col overflow-hidden ${fullPage ? "bracket-setup-shell" : "max-h-full max-w-2xl border border-[var(--line-strong)] bg-[var(--panel)] shadow-[0_24px_80px_rgba(0,0,0,0.55)]"}`}>
        <header className={fullPage ? "bracket-setup-header" : "flex items-start justify-between gap-4 border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-4"}>
          <div>
            <h1 className="display-face text-2xl font-black uppercase tracking-[0.06em] sm:text-3xl">New bracket</h1>
          </div>
          <button type="button" onClick={onCancel} className="display-face text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-2)]">{fullPage ? "Back to Brackets" : "Close"}</button>
        </header>

        <div className={fullPage ? "bracket-setup-steps" : "flex border-b border-[var(--line)]"}>
          {STEPS.map((label, index) => {
            const isReachable = index <= step;
            const className = `display-face min-w-0 flex-1 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-[0.12em] sm:text-[11px] ${
              index === step
                ? "border-b-2 border-[var(--accent-2)] text-[var(--ink)]"
                : index < step
                  ? "text-[var(--accent-3)] hover:bg-[rgba(52,211,196,0.06)]"
                  : "cursor-default text-[var(--muted)]"
            }`;

            return (
              <button
                key={label}
                type="button"
                disabled={!isReachable}
                aria-current={index === step ? "step" : undefined}
                onClick={() => isReachable && setStep(index)}
                className={className}
              >
                <span className="hidden sm:inline">{index + 1}. </span>{label}
              </button>
            );
          })}
        </div>

        <div className={fullPage ? "bracket-setup-content" : "min-h-0 flex-1 overflow-y-auto px-5 py-5"}>
          {step === 0 ? (
            <div className="space-y-10">
              {sourceMode === "existing" ? (
                  <div className="space-y-3">
                    <WizardQuestion>Where will your contenders come from?</WizardQuestion>
                    <p className="ui-copy text-sm leading-6 text-[var(--muted)]">Start with a saved pool, or create a new one for this bracket.</p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <button
                        type="button"
                        onClick={() => onCreatePoolWorkspace ? onCreatePoolWorkspace() : setSourceMode("new")}
                        className="min-h-28 border border-[var(--accent-2)] bg-[rgba(255,216,77,0.07)] p-4 text-left transition hover:bg-[rgba(255,216,77,0.13)]"
                      >
                        <Plus aria-hidden="true" size={22} strokeWidth={3} className="text-[var(--accent-2)]" />
                        <span className="display-face mt-5 block text-base font-black uppercase leading-tight text-[var(--ink)]">Create a new pool</span>
                        <span className="ui-copy mt-2 block text-sm leading-5 text-[var(--muted)]">Add or import contenders without leaving setup.</span>
                      </button>
                      {availablePools.map((pool) => {
                        const selected = sourcePoolId === pool.id;

                        return (
                          <button
                            key={pool.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => {
                              if ((pool.candidateCount ?? 0) < 2) {
                                setError("Add at least two candidates to this pool before creating a bracket.");
                                return;
                              }
                              setSourcePoolId(pool.id);
                              setError("");
                              setStep(1);
                            }}
                            className={`min-h-28 border p-4 text-left transition ${
                              selected
                                ? "border-[var(--accent-2)] bg-[rgba(255,216,77,0.07)]"
                                : "border-[var(--line)] hover:border-[var(--accent-3)] hover:bg-[rgba(52,211,196,0.04)]"
                            }`}
                          >
                            <span className="display-face block text-base font-black uppercase leading-tight text-[var(--ink)]">{pool.name}</span>
                            <span className="ui-section-kicker mt-3 block text-[var(--accent-3)]">{pool.candidateCount} {pool.candidateCount === 1 ? "candidate" : "candidates"}</span>
                            {pool.description ? <span className="ui-copy mt-2 line-clamp-2 block text-sm leading-5 text-[var(--muted)]">{pool.description}</span> : null}
                          </button>
                        );
                      })}
                    </div>
                    {hasMorePools ? (
                      <div ref={poolLoadSentinelRef} className="h-px" aria-live="polite">
                        {loadingMorePools ? <span className="sr-only">Loading more pools</span> : null}
                      </div>
                    ) : null}
                  </div>
              ) : onCreatePoolWorkspace ? null : (
                <div className="space-y-4">
                  {availablePools.length ? (
                    <button type="button" onClick={() => setSourceMode("existing")} className="ui-button ui-button-muted">← Choose a saved pool</button>
                  ) : null}
                  <LocalPoolBuilder poolName={poolName} onPoolNameChange={setPoolName} candidates={candidates} onCandidatesChange={setCandidates} />
                </div>
              )}
            </div>
          ) : null}
          {step === 1 ? (
            <div className="space-y-10">
              <div className="space-y-3">
                <WizardQuestion>How will we select matchups?</WizardQuestion>
                <VersusChoice value={playStyle} onChange={setPlayStyle} choices={[{ value: "fixed_bracket", title: "Keep the bracket fixed", description: "The original tournament tree stays intact throughout." }, { value: "reseed", title: "Reseed each round", description: "The highest seed faces the lowest remaining seed." }]} />
              </div>
              <div className="space-y-3">
                <WizardQuestion>What should the bracket decide?</WizardQuestion>
                <ResultModeChoices value={resultMode} onChange={setResultMode} />
              </div>
            </div>
          ) : null}
          {step === 2 ? (
            <div className="space-y-10">
              <div className="space-y-3">
                <WizardQuestion>How will each matchup be decided?</WizardQuestion>
                <VersusChoice
                  value={advancementMode}
                  onChange={setAdvancementMode}
                  choices={[
                    { value: "vote_winner", title: "Highest vote total", description: "Best for most brackets: the contender with the most votes advances." },
                    { value: "manual_winner", title: "I'll choose", description: "Follow real-life outcomes, such as a sporting event, and record the winner as it happens." }
                  ]}
                />
              </div>
              {advancementMode === "vote_winner" ? (
                <div className="space-y-3">
                  <WizardQuestion>How should a tie be resolved?</WizardQuestion>
                  <VersusChoice
                    value={tieBreakMode}
                    onChange={setTieBreakMode}
                    choices={[
                      { value: "higher_seed_wins", title: "Higher seed advances", description: "Use the starting order as the tie-breaker." },
                      { value: "random", title: "Pick at random", description: "Break a tied vote with a random draw." }
                    ]}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
          {step === 3 ? (
            <div className="space-y-10">
              <div className="space-y-3">
                <WizardQuestion>How should entries be seeded?</WizardQuestion>
                <VersusChoice value={seedingMode} onChange={chooseSeedingMode} choices={[{ value: "pool_order", title: "Use pool order", description: "Candidates enter in the same order as the selected pool." }, { value: "custom", title: "Customize seeds", description: "Arrange the seed order here before creating the bracket." }]} />
              </div>
              {seedingMode === "custom" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <WizardQuestion>Put contenders in seed order</WizardQuestion>
                    <p className="ui-copy text-sm leading-6 text-[var(--muted)]">Drag a contender onto another to place it before that seed.</p>
                  </div>
                  {customSeedLoading ? <p className="ui-copy text-sm text-[var(--muted)]">Loading contenders…</p> : null}
                  {!customSeedLoading && customSeedEntries.length ? (
                    <ol className="grid gap-2 sm:grid-cols-2">
                      {customSeedEntries.map((candidate, index) => (
                        <li
                          key={candidate.id}
                          draggable
                          onDragStart={() => setDraggingSeedCandidateId(candidate.id)}
                          onDragEnd={() => setDraggingSeedCandidateId(null)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => {
                            moveCustomSeedEntry(draggingSeedCandidateId, candidate.id);
                            setDraggingSeedCandidateId(null);
                          }}
                          className={`flex min-h-16 cursor-move items-center gap-3 border px-3 py-3 transition ${draggingSeedCandidateId === candidate.id ? "border-[var(--accent-3)] bg-[rgba(52,211,196,0.06)]" : "border-[var(--line)] hover:border-[var(--accent-2)]"}`}
                        >
                          <span className="display-face w-8 shrink-0 text-lg font-black text-[var(--accent-2)]">{index + 1}</span>
                          <span className="display-face min-w-0 truncate text-base font-black uppercase text-[var(--ink)]">{candidate.name}</span>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
          {step === 4 ? (
            <div className="space-y-10">
              <div className="space-y-3">
                <WizardQuestion>Who can take part?</WizardQuestion>
                <ChoiceCards
                  value={audienceMode}
                  onChange={setAudienceMode}
                  choices={[
                    { value: "private", title: "Private", description: "Only you can see and run this bracket.", icon: LockKeyhole },
                    { value: "friends", title: "Share with friends", description: "Invite people with a private link.", icon: Users },
                    { value: "public", title: "Public", description: "Anyone can discover and vote on it.", icon: Globe2 }
                  ]}
                />
              </div>
            </div>
          ) : null}
          {step === 5 ? (
            <div className="space-y-10">
              <label className="block space-y-3">
                <WizardQuestion>What should this bracket be called?</WizardQuestion>
                <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`${selectedName || "Untitled"} Bracket`} className="ui-field border-[var(--accent-3)] bg-[rgba(52,211,196,0.06)] px-5 py-4 display-face text-3xl font-black uppercase" />
              </label>
              <div className="space-y-3">
                <WizardQuestion>Your chosen settings</WizardQuestion>
                <div className="grid gap-3 sm:grid-cols-2">
                <ReviewItem icon={Users} label="Contenders" value={selectedName || "New pool"} detail={`${selectedCount} contenders`} />
                <ReviewItem icon={Gauge} label="Format" value={playStyle === "reseed" ? "Reseed each round" : "Keep the bracket fixed"} detail={resultModeDetail.title} />
                <ReviewItem icon={ListOrdered} label="Seeding" value={seedingMode === "custom" ? "Custom seed order" : "Pool order"} detail={seedingMode === "custom" ? "Seed order set in this wizard." : "Candidates begin in their pool order."} />
                <ReviewItem icon={Trophy} label="Winner" value={advancementMode === "vote_winner" ? "Highest vote total" : "You'll choose"} detail={advancementMode === "vote_winner" ? "Votes decide each matchup." : "Record real-world outcomes yourself."} />
                  <ReviewItem icon={audienceMode === "public" ? Globe2 : audienceMode === "friends" ? Users : LockKeyhole} label="Access" value={audienceMode === "friends" ? "Share with friends" : audienceMode} detail={audienceMode === "private" ? "Only you can see and run it." : audienceMode === "friends" ? "Invite people with a private link." : "Anyone can discover and vote."} />
                </div>
              </div>
            </div>
          ) : null}
          {error ? <p className="mt-4 text-sm text-[var(--accent-2)]">{error}</p> : null}
        </div>

        <footer className={fullPage ? "bracket-setup-actions" : "flex items-center justify-between gap-3 border-t border-[var(--line)] px-5 py-4"}><button type="button" onClick={step === 0 ? onCancel : () => setStep((current) => current - 1)} className="ui-button ui-button-muted">{step === 0 ? (fullPage ? "Back to Brackets" : "Cancel") : "Back"}</button>{step < STEPS.length - 1 && !(step === 0 && sourceMode === "existing") ? <button type="button" onClick={goNext} className="ui-button ui-button-primary">Continue</button> : step === STEPS.length - 1 ? <button type="button" onClick={handleCreate} disabled={creating} className="ui-button ui-button-primary">{creating ? "Creating" : "Create bracket"}</button> : null}</footer>
      </section>
    </div>
  );
}
