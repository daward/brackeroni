"use client";

import { Fragment, useEffect, useState } from "react";
import { CandidateManagerPanel } from "@/components/candidate-manager-panel";
import { PoolManagementPanel } from "@/components/pool-management-panel";
import { parseCandidateTagText } from "@/lib/candidate-tags";
import { suggestImages } from "@/lib/client-api/create-workspace";

const STEPS = ["Contenders", "Structure", "Matchups", "Seeding", "Access", "Review"];

const RESULT_MODE_DETAILS = {
  winner_only: {
    option: "Crown one winner — simple elimination",
    title: "Crown one winner",
    description: "A familiar knockout bracket. Once a champion is decided, the bracket is complete.",
    note: "Best default when you only need the winner."
  },
  full_ranking: {
    option: "Rank everyone — traditional bracket, more voting",
    title: "Rank everyone",
    description: "The bracket continues after first place so every contender can receive a final position.",
    note: "Expect substantially more matchups and votes than a winner-only bracket."
  },
  partial_ranking: {
    option: "Rank the top half — recognize leaders, save voting",
    title: "Rank the top half",
    description: "The strongest half receives explicit placements; the remaining contenders are ordered by performance.",
    note: "A good middle ground when the podium matters more than the complete order."
  },
  fast_full_rank: {
    option: "Rank everyone faster — Swiss rounds, not a knockout bracket",
    title: "Rank everyone faster",
    description: "Uses Swiss-style rounds to produce a full ranking with fewer late-stage matchups.",
    note: "This is not a traditional elimination bracket: pairings evolve from each contender’s results."
  }
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

export function BracketCreationWizard({ pools, creating, onCancel, onCreate, onCreatePoolWorkspace, initialPoolId = "", initialConfig = null, fullPage = false }) {
  const [step, setStep] = useState(0);
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
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--accent-3)]">New bracket</p>
            <h2 className="display-face mt-1 text-2xl font-black uppercase tracking-[0.08em]">Set it up</h2>
          </div>
          <button type="button" onClick={onCancel} className="display-face text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-2)]">{fullPage ? "← Back to Brackets" : "Close"}</button>
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
              <div>
                <h3 className="display-face text-xl font-black uppercase">Choose your contenders</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Start from an existing pool, or make a new candidate set without leaving setup.</p>
              </div>
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
              {sourceMode === "existing" ? (
                pools.length ? (
                  <label className="block space-y-2">
                    <span className="ui-section-kicker">Pool</span>
                    <select value={sourcePoolId} onChange={(event) => setSourcePoolId(event.target.value)} className="ui-field ui-field-panel ui-field-select">
                      {pools.map((pool) => <option key={pool.id} value={pool.id}>{pool.name} ({pool.candidateCount} candidates)</option>)}
                    </select>
                  </label>
                ) : <p className="border border-dashed border-[var(--line)] p-4 text-sm text-[var(--muted)]">You don’t have a pool yet. Create one below to get started.</p>
              ) : onCreatePoolWorkspace ? null : (
                <LocalPoolBuilder poolName={poolName} onPoolNameChange={setPoolName} candidates={candidates} onCandidatesChange={setCandidates} />
              )}
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-5">
              <div><h3 className="display-face text-2xl font-black uppercase">Choose the bracket structure</h3><p className="mt-2 text-base leading-7 text-[var(--muted)]">Decide how each round is paired and whether you need a winner or a ranking.</p></div>
              <div className="space-y-2"><p className="ui-section-kicker">Matchups each round</p><VersusChoice value={playStyle} onChange={setPlayStyle} choices={[{ value: "fixed_bracket", title: "Keep the bracket fixed", description: "The original tournament tree stays intact throughout." }, { value: "reseed", title: "Reseed each round", description: "The highest seed faces the lowest remaining seed." }]} /></div>
              <div className="space-y-2"><label className="block space-y-2"><span className="ui-section-kicker">What should the bracket decide?</span><select value={resultMode} onChange={(event) => setResultMode(event.target.value)} className="ui-field ui-field-panel ui-field-select">{Object.entries(RESULT_MODE_DETAILS).map(([mode, detail]) => <option key={mode} value={mode}>{detail.option}</option>)}</select></label><div className="border border-[var(--line)] bg-[rgba(255,255,255,0.025)] p-4"><p className="display-face text-base font-black uppercase">{resultModeDetail.title}</p><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{resultModeDetail.description}</p><p className="mt-3 text-xs leading-5 text-[var(--accent-2)]">{resultModeDetail.note}</p></div></div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-5">
              <div><h3 className="display-face text-2xl font-black uppercase">Resolve each matchup</h3><p className="mt-2 text-base leading-7 text-[var(--muted)]">Choose whether this bracket follows its voters or records outcomes from somewhere else.</p></div>
              <div className="space-y-2"><p className="ui-section-kicker">Winner of each matchup</p><VersusChoice value={advancementMode} onChange={setAdvancementMode} choices={[{ value: "vote_winner", title: "Highest vote total", description: "Best for most brackets: the contender with the most votes advances." }, { value: "manual_winner", title: "I’ll choose", description: "Follow real-life outcomes, such as a sporting event, and record the winner as it happens." }]} /></div>
              {advancementMode === "vote_winner" ? <div className="space-y-2"><p className="ui-section-kicker">If there’s a tie</p><VersusChoice value={tieBreakMode} onChange={setTieBreakMode} choices={[{ value: "higher_seed_wins", title: "Higher seed advances", description: "Use the starting order as the tie-breaker." }, { value: "random", title: "Pick at random", description: "Break a tied vote with a random draw." }]} /></div> : null}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-5">
              <div><h3 className="display-face text-2xl font-black uppercase">Set the starting order</h3><p className="mt-2 text-base leading-7 text-[var(--muted)]">Choose whether to keep the pool order or arrange seeds and play-ins before the bracket begins.</p></div>
              <VersusChoice value={seedingMode} onChange={setSeedingMode} choices={[{ value: "pool_order", title: "Use pool order", description: "Candidates enter in the same order as the selected pool." }, { value: "custom", title: "Customize seeds", description: "Open the seed editor next to arrange entries and add play-ins." }]} />
            </div>
          ) : null}

          {step === 4 ? <div className="space-y-5"><div><h3 className="display-face text-2xl font-black uppercase">Who can take part?</h3><p className="mt-2 text-base leading-7 text-[var(--muted)]">You can change this later, but choosing now makes the next step clear.</p></div><div className="space-y-2"><label className="flex gap-3 border border-[var(--line)] p-4"><input type="radio" checked={audienceMode === "private"} onChange={() => setAudienceMode("private")} /><span><strong>Private</strong><span className="mt-1 block text-sm text-[var(--muted)]">Only you can see and run this bracket.</span></span></label><label className="flex gap-3 border border-[var(--line)] p-4"><input type="radio" checked={audienceMode === "friends"} onChange={() => setAudienceMode("friends")} /><span><strong>Share with friends</strong><span className="mt-1 block text-sm text-[var(--muted)]">Invite people with a private link.</span></span></label><label className="flex gap-3 border border-[var(--line)] p-4"><input type="radio" checked={audienceMode === "public"} onChange={() => setAudienceMode("public")} /><span><strong>Public</strong><span className="mt-1 block text-sm text-[var(--muted)]">Anyone can discover and vote on it.</span></span></label></div></div> : null}

          {step === 5 ? <div className="space-y-5"><div><h3 className="display-face text-2xl font-black uppercase">Ready to create</h3><p className="mt-2 text-base leading-7 text-[var(--muted)]">This creates a draft. You can fine-tune candidates and advanced rules before starting it.</p></div><label className="block space-y-2"><span className="ui-section-kicker">Bracket name</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`${selectedName || "Untitled"} Bracket`} className="ui-field ui-field-panel" /></label><dl className="divide-y divide-[var(--line)] border border-[var(--line)]"><div className="flex justify-between gap-4 p-3"><dt className="text-[var(--muted)]">Contenders</dt><dd className="text-right">{selectedName || "New pool"} · {selectedCount}</dd></div><div className="flex justify-between gap-4 p-3"><dt className="text-[var(--muted)]">Format</dt><dd className="text-right">{playStyle === "reseed" ? "Reseed" : "Fixed"} · {resultModeDetail.title}</dd></div><div className="flex justify-between gap-4 p-3"><dt className="text-[var(--muted)]">Seeding</dt><dd>{seedingMode === "custom" ? "Customize next" : "Pool order"}</dd></div><div className="flex justify-between gap-4 p-3"><dt className="text-[var(--muted)]">Winner</dt><dd>{advancementMode === "vote_winner" ? "Vote decides" : "You decide"}</dd></div><div className="flex justify-between gap-4 p-3"><dt className="text-[var(--muted)]">Access</dt><dd>{audienceMode === "friends" ? "Friends" : audienceMode === "public" ? "Public" : "Private"}</dd></div></dl></div> : null}
          {error ? <p className="mt-4 text-sm text-[var(--accent-2)]">{error}</p> : null}
        </div>

        <footer className={fullPage ? "bracket-setup-actions" : "flex items-center justify-between gap-3 border-t border-[var(--line)] px-5 py-4"}><button type="button" onClick={step === 0 ? onCancel : () => setStep((current) => current - 1)} className="ui-button ui-button-muted">{step === 0 ? (fullPage ? "Back to Brackets" : "Cancel") : "Back"}</button>{step < STEPS.length - 1 ? <button type="button" onClick={goNext} className="ui-button ui-button-primary">Continue</button> : <button type="button" onClick={handleCreate} disabled={creating} className="ui-button ui-button-primary">{creating ? "Creating" : "Create bracket"}</button>}</footer>
      </section>
    </div>
  );
}
