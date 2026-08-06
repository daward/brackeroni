"use client";

import { Fragment, useEffect, useState } from "react";
import { Gauge, Globe2, ListOrdered, LockKeyhole, Medal, Trophy, Users } from "lucide-react";
import { CandidateManagerPanel } from "@/components/candidate-manager-panel";
import { PoolManagementPanel } from "@/components/pool-management-panel";
import { parseCandidateTagText } from "@/lib/candidate-tags";
import { suggestImages } from "@/lib/client-api/create-workspace";

const STEPS = ["Contenders", "Structure", "Matchups", "Seeding", "Access", "Review"];

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

  return <PoolManagementPanel pool={pool} draft={draftPool} titlePlaceholder="Name this pool" showVisibility={false} onDraftChange={(patch) => { if (typeof patch.name === "string") onPoolNameChange(patch.name); if (typeof patch.description === "string") setPoolDescription(patch.description); if (typeof patch.visibility === "string") setPoolVisibility(patch.visibility); }} className="space-y-5 py-5"><p className="text-sm leading-6 text-[var(--muted)]">Build this pool here. It will be saved with the bracket only when you finish setup.</p>{isImportOpen ? <div className="border border-[var(--line)] p-4"><label className="block space-y-2"><span className="ui-section-kicker">Paste candidates</span><textarea value={importText} onChange={(event) => setImportText(event.target.value)} rows={6} placeholder="One contender per line" className="ui-field ui-field-panel resize-y" /></label><div className="mt-3 flex gap-3"><button type="button" onClick={importCandidates} className="ui-button ui-button-primary">Add candidates</button><button type="button" onClick={() => setIsImportOpen(false)} className="ui-button ui-button-muted">Cancel</button></div></div> : null}<CandidateManagerPanel poolId="local-draft" candidateDraft={candidateDraft} isCandidateEditorOpen={isEditorOpen} isEditingCandidate={Boolean(editingCandidateId)} candidates={candidates} imageSuggestions={imageSuggestions} imageSuggestionLoading={imageSuggestionLoading} onDraftChange={(field, value) => setCandidateDraft((current) => ({ ...current, [field]: value }))} onCreateCandidate={() => { setCandidateDraft(emptyCandidate); setEditingCandidateId(null); setImageSuggestions([]); setIsEditorOpen(true); }} onImportCandidates={() => setIsImportOpen(true)} onSubmit={saveCandidate} onCloseEditor={closeEditor} onSuggestImages={handleSuggestImages} onClearImage={() => setCandidateDraft((current) => ({ ...current, imageUrl: "" }))} onSelectSuggestedImage={(imageUrl) => setCandidateDraft((current) => ({ ...current, imageUrl }))} onEditCandidate={(candidate) => { setCandidateDraft({ name: candidate.name, description: candidate.description || "", imageUrl: candidate.imageUrl || "", tagsText: (candidate.tags || []).join(", ") }); setEditingCandidateId(candidate.id); setImageSuggestions([]); setIsEditorOpen(true); }} onRemoveCandidate={(candidate) => onCandidatesChange(candidates.filter((item) => item.id !== candidate.id))} candidateEditorDescription="" listHeading="Candidates in this new pool" listEmptyMessage="Add candidates individually or import a list to build this pool." /></PoolManagementPanel>;
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
          <button
            type="button"
            aria-pressed={value === choice.value}
            onClick={() => onChange(choice.value)}
            className={`border p-4 text-left transition ${
              value === choice.value
                ? "border-[var(--accent-2)] bg-[rgba(255,216,77,0.08)]"
                : "border-[var(--line)] hover:border-[var(--line-strong)] hover:bg-[rgba(255,255,255,0.02)]"
            }`}
          >
            <span className="display-face block text-base font-black uppercase leading-tight">{choice.title}</span>
            <span className="mt-2 block text-sm leading-5 text-[var(--muted)]">{choice.description}</span>
          </button>
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
        <button
          key={choice.value}
          type="button"
          aria-pressed={value === choice.value}
          onClick={() => onChange(choice.value)}
          className={`min-h-36 border p-4 text-left transition ${
            value === choice.value
              ? "border-[var(--accent-3)] bg-[rgba(52,211,196,0.06)]"
              : "border-[var(--line)] hover:border-[var(--line-strong)] hover:bg-[rgba(255,255,255,0.02)]"
          }`}
        >
          <span className="flex items-center gap-2">
            {Icon ? <Icon aria-hidden="true" size={18} strokeWidth={2} className="shrink-0 text-[var(--accent-2)]" /> : null}
            <span className="display-face text-base font-black uppercase leading-tight">{choice.title}</span>
          </span>
          <span className="ui-copy mt-3 block text-sm leading-6 text-[var(--muted)]">{choice.description}</span>
        </button>
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
      <div className="grid gap-3 sm:grid-cols-2">
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
  const [poolName, setPoolName] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [title, setTitle] = useState(initialConfig?.title || "");
  const [playStyle, setPlayStyle] = useState(initialConfig?.playStyle || "fixed_bracket");
  const [resultMode, setResultMode] = useState(initialConfig?.resultMode || "winner_only");
  const [advancementMode, setAdvancementMode] = useState(initialConfig?.advancementMode || "vote_winner");
  const [tieBreakMode, setTieBreakMode] = useState(initialConfig?.tieBreakMode || "higher_seed_wins");
  const [seedingMode, setSeedingMode] = useState("pool_order");
  const [audienceMode, setAudienceMode] = useState(initialConfig?.audienceMode || "private");
  const [error, setError] = useState("");
  const selectedPool = pools.find((pool) => pool.id === sourcePoolId) || null;
  const resultModeDetail = RESULT_MODE_DETAILS[resultMode];

  function goNext() {
    if (step === 0) {
      if (sourceMode === "existing" && !selectedPool) {
        setError("Choose a pool to continue.");
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
    setError("");
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  async function handleCreate() {
    setError("");
    const created = await onCreate({
      title: title.trim(),
      source: sourceMode === "existing"
        ? { type: "existing", pool: selectedPool }
        : { type: "new", name: poolName.trim(), candidates },
      playStyle,
      resultMode,
      advancementMode,
      tieBreakMode,
      seedingMode,
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
            <div className="space-y-5">
              <div className="space-y-3">
                <WizardQuestion>How are you starting?</WizardQuestion>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={() => setSourceMode("existing")} className={`border p-4 text-left transition ${sourceMode === "existing" ? "border-[var(--accent-2)] bg-[rgba(255,216,77,0.07)]" : "border-[var(--line)] hover:border-[var(--line-strong)]"}`}>
                    <p className="display-face font-black uppercase">Use a pool</p>
                    <p className="mt-2 text-sm text-[var(--muted)]">Choose from your saved candidate sets.</p>
                  </button>
                  <button type="button" onClick={() => onCreatePoolWorkspace ? onCreatePoolWorkspace() : setSourceMode("new")} className={`border p-4 text-left transition ${sourceMode === "new" ? "border-[var(--accent-2)] bg-[rgba(255,216,77,0.07)]" : "border-[var(--line)] hover:border-[var(--line-strong)]"}`}>
                    <p className="display-face font-black uppercase">Create a pool</p>
                    <p className="mt-2 text-sm text-[var(--muted)]">Open the full pool builder to import and manage candidates.</p>
                  </button>
                </div>
              </div>
              {sourceMode === "existing" ? (
                pools.length ? (
                  <label className="block space-y-2">
                    <span className="ui-section-kicker">Pool</span>
                    <select value={sourcePoolId} onChange={(event) => setSourcePoolId(event.target.value)} className="ui-field ui-field-panel ui-field-select">
                      {pools.map((pool) => <option key={pool.id} value={pool.id}>{pool.name} ({pool.candidateCount} candidates)</option>)}
                    </select>
                  </label>
                ) : <p className="border border-dashed border-[var(--line)] p-4 text-sm text-[var(--muted)]">You don't have a pool yet. Create one below to get started.</p>
              ) : onCreatePoolWorkspace ? null : (
                <LocalPoolBuilder poolName={poolName} onPoolNameChange={setPoolName} candidates={candidates} onCandidatesChange={setCandidates} />
              )}
            </div>
          ) : null}
          {step === 1 ? (
            <div className="space-y-5">
              <div className="space-y-3">
                <WizardQuestion>What should the bracket decide?</WizardQuestion>
                <ResultModeChoices value={resultMode} onChange={setResultMode} />
              </div>
              <div className="space-y-3">
                <WizardQuestion>Matchups each round</WizardQuestion>
                <VersusChoice value={playStyle} onChange={setPlayStyle} choices={[{ value: "fixed_bracket", title: "Keep the bracket fixed", description: "The original tournament tree stays intact throughout." }, { value: "reseed", title: "Reseed each round", description: "The highest seed faces the lowest remaining seed." }]} />
              </div>
            </div>
          ) : null}
          {step === 2 ? (
            <div className="space-y-5">
              <div className="space-y-3">
                <p className="display-face text-sm font-black uppercase tracking-[0.18em] text-[var(--accent-3)]">Winner of each matchup</p>
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
                  <p className="display-face text-sm font-black uppercase tracking-[0.18em] text-[var(--accent-3)]">If there's a tie</p>
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
            <div className="space-y-5">
              <div className="space-y-3">
                <WizardQuestion>How should entries be seeded?</WizardQuestion>
                <VersusChoice value={seedingMode} onChange={setSeedingMode} choices={[{ value: "pool_order", title: "Use pool order", description: "Candidates enter in the same order as the selected pool." }, { value: "custom", title: "Customize seeds", description: "Open the seed editor next to arrange entries and add play-ins." }]} />
              </div>
            </div>
          ) : null}
          {step === 4 ? (
            <div className="space-y-5">
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
            <div className="space-y-6">
              <label className="block space-y-3">
                <WizardQuestion>Name your bracket</WizardQuestion>
                <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`${selectedName || "Untitled"} Bracket`} className="ui-field border-[var(--accent-3)] bg-[rgba(52,211,196,0.06)] px-5 py-4 display-face text-3xl font-black uppercase" />
              </label>
              <div className="space-y-3">
                <WizardQuestion>Your chosen settings</WizardQuestion>
                <div className="grid gap-3 sm:grid-cols-2">
                <ReviewItem icon={Users} label="Contenders" value={selectedName || "New pool"} detail={`${selectedCount} contenders`} />
                <ReviewItem icon={Gauge} label="Format" value={playStyle === "reseed" ? "Reseed each round" : "Keep the bracket fixed"} detail={resultModeDetail.title} />
                <ReviewItem icon={ListOrdered} label="Seeding" value={seedingMode === "custom" ? "Customize next" : "Pool order"} detail={seedingMode === "custom" ? "Arrange entries and play-ins after creation." : "Candidates begin in their pool order."} />
                <ReviewItem icon={Trophy} label="Winner" value={advancementMode === "vote_winner" ? "Highest vote total" : "You'll choose"} detail={advancementMode === "vote_winner" ? "Votes decide each matchup." : "Record real-world outcomes yourself."} />
                  <ReviewItem icon={audienceMode === "public" ? Globe2 : audienceMode === "friends" ? Users : LockKeyhole} label="Access" value={audienceMode === "friends" ? "Share with friends" : audienceMode} detail={audienceMode === "private" ? "Only you can see and run it." : audienceMode === "friends" ? "Invite people with a private link." : "Anyone can discover and vote."} />
                </div>
              </div>
            </div>
          ) : null}
          {error ? <p className="mt-4 text-sm text-[var(--accent-2)]">{error}</p> : null}
        </div>

        <footer className={fullPage ? "bracket-setup-actions" : "flex items-center justify-between gap-3 border-t border-[var(--line)] px-5 py-4"}><button type="button" onClick={step === 0 ? onCancel : () => setStep((current) => current - 1)} className="ui-button ui-button-muted">{step === 0 ? (fullPage ? "Back to Brackets" : "Cancel") : "Back"}</button>{step < STEPS.length - 1 ? <button type="button" onClick={goNext} className="ui-button ui-button-primary">Continue</button> : <button type="button" onClick={handleCreate} disabled={creating} className="ui-button ui-button-primary">{creating ? "Creating" : "Create bracket"}</button>}</footer>
      </section>
    </div>
  );
}
