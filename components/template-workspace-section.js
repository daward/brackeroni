"use client";

import { useEffect, useMemo, useState } from "react";

function createStandardSlots(slotCount, tag = null) {
  return Array.from({ length: slotCount }, (_, index) => ({
    seed: index + 1,
    subSeed: 0,
    tag,
    templateSlot: index
  }));
}

function createBlankTemplateDraft() {
  return {
    id: null,
    name: "",
    description: "",
    subBrackets: [
      {
        name: "Main bracket",
        tag: null,
        slotCount: 16,
        feedOrder: 1,
        displayOrder: 0,
        slots: createStandardSlots(16)
      }
    ]
  };
}

function cloneTemplate(template) {
  if (!template) {
    return createBlankTemplateDraft();
  }

  return {
    id: template.isBuiltIn ? null : template.id,
    name: template.isBuiltIn ? "" : template.name || "",
    description: template.description || "",
    subBrackets: (template.subBrackets || []).map((subBracket, subBracketIndex) => ({
      name: subBracket.name,
      tag: subBracket.tag || null,
      slotCount: subBracket.slotCount,
      feedOrder: subBracket.feedOrder,
      displayOrder: Number.isInteger(subBracket.displayOrder) ? subBracket.displayOrder : subBracketIndex,
      slots: (subBracket.slots || []).map((slot, slotIndex) => ({
        seed: slot.seed,
        subSeed: slot.subSeed || 0,
        tag: slot.tag || null,
        templateSlot: Number.isInteger(slot.templateSlot) ? slot.templateSlot : slotIndex
      }))
    }))
  };
}

function normalizeSlotCount(subBracket, slotCount) {
  const nextCount = Math.max(2, Math.min(128, slotCount || 2));
  const currentSlots = [...(subBracket.slots || [])].sort(
    (left, right) => left.templateSlot - right.templateSlot
  );
  const nextSlots = currentSlots.slice(0, nextCount).map((slot, index) => ({
    ...slot,
    templateSlot: index
  }));

  while (nextSlots.length < nextCount) {
    const index = nextSlots.length;
    nextSlots.push({
      seed: index + 1,
      subSeed: 0,
      tag: subBracket.tag || null,
      templateSlot: index
    });
  }

  return {
    ...subBracket,
    slotCount: nextCount,
    slots: nextSlots
  };
}

function buildTemplatePayload(draft) {
  return {
    name: (draft.name || "Custom structure").trim(),
    description: draft.description.trim() || null,
    subBrackets: draft.subBrackets.map((subBracket, subBracketIndex) => ({
      name: subBracket.name.trim(),
      tag: subBracket.tag?.trim() || null,
      slotCount: subBracket.slotCount,
      feedOrder: subBracket.feedOrder,
      displayOrder: subBracketIndex,
      slots: [...subBracket.slots]
        .sort((left, right) => left.templateSlot - right.templateSlot)
        .map((slot, slotIndex) => ({
          seed: slot.seed,
          subSeed: slot.subSeed || 0,
          tag: slot.tag?.trim() || null,
          templateSlot: slotIndex
        }))
    }))
  };
}

export function TemplateWorkspaceSection({
  templateLibrary,
  selectedTemplateId,
  setSelectedTemplateId,
  onCreateTemplate,
  onUpdateTemplate,
  isActionPending,
  embedded = false
}) {
  const builtInTemplates = templateLibrary?.builtIn || [];
  const userTemplates = templateLibrary?.user || [];
  const allTemplates = useMemo(() => [...builtInTemplates, ...userTemplates], [builtInTemplates, userTemplates]);
  const isCreatingNewTemplate = !selectedTemplateId || selectedTemplateId === "new";
  const selectedTemplate =
    isCreatingNewTemplate
      ? null
      : allTemplates.find((template) => template.id === selectedTemplateId) || null;
  const [draft, setDraft] = useState(() =>
    isCreatingNewTemplate ? createBlankTemplateDraft() : cloneTemplate(selectedTemplate)
  );
  const [playInForm, setPlayInForm] = useState({
    open: false,
    subBracketIndex: 0,
    seed: 16
  });
  const [saveFormOpen, setSaveFormOpen] = useState(false);

  useEffect(() => {
    setDraft(isCreatingNewTemplate ? createBlankTemplateDraft() : cloneTemplate(selectedTemplate));
    setPlayInForm((current) => ({
      ...current,
      open: false,
      subBracketIndex: 0
    }));
  }, [isCreatingNewTemplate, selectedTemplate]);

  const canSave = (draft.subBrackets || []).length > 0;

  function updateDraft(patch) {
    setDraft((current) => ({
      ...current,
      ...patch
    }));
  }

  function updateSubBracket(subBracketIndex, patch) {
    setDraft((current) => ({
      ...current,
      subBrackets: current.subBrackets.map((subBracket, index) =>
        index === subBracketIndex ? { ...subBracket, ...patch } : subBracket
      )
    }));
  }

  function addSubBracket() {
    setDraft((current) => ({
      ...current,
      subBrackets: [
        ...current.subBrackets,
        {
          name: `Sub-bracket ${current.subBrackets.length + 1}`,
          tag: null,
          slotCount: 16,
          feedOrder: current.subBrackets.length + 1,
          displayOrder: current.subBrackets.length,
          slots: createStandardSlots(16)
        }
      ]
    }));
  }

  function removeSubBracket(subBracketIndex) {
    setDraft((current) => ({
      ...current,
      subBrackets: current.subBrackets
        .filter((_, index) => index !== subBracketIndex)
        .map((subBracket, index) => ({
          ...subBracket,
          displayOrder: index
        }))
    }));
  }

  function addPlayInGame(subBracketIndex, seed) {
    setDraft((current) => ({
      ...current,
      subBrackets: current.subBrackets.map((subBracket, index) => {
        if (index !== subBracketIndex) {
          return subBracket;
        }

        const nextSubSeed =
          Math.max(
            0,
            ...subBracket.slots
              .filter((slot) => slot.seed === seed)
              .map((slot) => (Number.isInteger(slot.subSeed) ? slot.subSeed : 0))
          ) + 1;

        return {
          ...subBracket,
          slots: [
            ...subBracket.slots,
            {
              seed,
              subSeed: nextSubSeed,
              tag: subBracket.tag || null,
              templateSlot: subBracket.slots.length
            }
          ]
        };
      })
    }));
  }

  async function handleSave() {
    if (!canSave) {
      return;
    }

    const payload = buildTemplatePayload(draft);

    if (draft.id) {
      await onUpdateTemplate(draft.id, payload);
      return;
    }

    await onCreateTemplate(payload);
  }

  async function handleArchive() {
    if (!draft.id) {
      return;
    }

    await onUpdateTemplate(draft.id, {
      ...buildTemplatePayload(draft),
      archive: true
    });
  }

  if (embedded) {
    return (
      <section className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label className="space-y-2">
            <span className="label-caps text-[var(--accent)]">Load a saved structure</span>
            <select
              value={selectedTemplateId || "new"}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
              className="ui-field ui-field-panel ui-field-select"
            >
              <option value="new">Start from scratch</option>
              {builtInTemplates.length > 0 ? (
                <optgroup label="Built in">
                  {builtInTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {userTemplates.length > 0 ? (
                <optgroup label="Saved structures">
                  {userTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
          </label>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={addSubBracket} className="ui-button ui-button-muted">
              Add Sub-bracket
            </button>
            <button
              type="button"
              onClick={() =>
                setPlayInForm((current) => ({
                  ...current,
                  open: !current.open,
                  subBracketIndex: Math.min(current.subBracketIndex, Math.max(draft.subBrackets.length - 1, 0))
                }))
              }
              className="ui-button ui-button-muted"
            >
              Add Play-in Game
            </button>
            <button
              type="button"
              onClick={() => setSaveFormOpen((current) => !current)}
              className="ui-button ui-button-muted"
            >
              Save Structure
            </button>
          </div>
        </div>

        <div className="border border-[var(--line)] bg-[var(--panel)] px-4 py-3">
          <p className="display-face text-sm font-black uppercase text-[var(--text)]">
            {selectedTemplate?.name || "Working structure"}
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            {(draft.subBrackets || []).length} sub-brackets
          </p>
        </div>

        {playInForm.open ? (
          <div className="border border-[var(--line)] bg-[var(--panel)] p-4">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_140px_auto] md:items-end">
              <label className="space-y-2">
                <span className="label-caps text-[var(--accent)]">Sub-bracket</span>
                <select
                  value={playInForm.subBracketIndex}
                  onChange={(event) =>
                    setPlayInForm((current) => ({
                      ...current,
                      subBracketIndex: Number(event.target.value)
                    }))
                  }
                  className="ui-field ui-field-panel ui-field-select"
                >
                  {draft.subBrackets.map((subBracket, index) => (
                    <option key={`${subBracket.name}-${index}`} value={index}>
                      {subBracket.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="label-caps text-[var(--accent)]">Seed</span>
                <input
                  type="number"
                  min="1"
                  max="128"
                  value={playInForm.seed}
                  onChange={(event) =>
                    setPlayInForm((current) => ({
                      ...current,
                      seed: Math.max(1, Number(event.target.value) || 1)
                    }))
                  }
                  className="ui-field ui-field-panel"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  addPlayInGame(playInForm.subBracketIndex, playInForm.seed);
                  setPlayInForm((current) => ({ ...current, open: false }));
                }}
                className="ui-button ui-button-accent"
              >
                Add Play-in Game
              </button>
            </div>
          </div>
        ) : null}

        {saveFormOpen ? (
          <div className="border border-[var(--line)] bg-[var(--panel)] p-4">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <label className="space-y-2">
                <span className="label-caps text-[var(--accent)]">Save this structure as</span>
                <input
                  value={draft.name}
                  onChange={(event) => updateDraft({ name: event.target.value })}
                  className="ui-field ui-field-panel"
                  placeholder="Structure name"
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!canSave || isActionPending("template-save")}
                  className="ui-button ui-button-accent"
                >
                  Save Structure
                </button>
                {draft.id ? (
                  <button
                    type="button"
                    onClick={handleArchive}
                    disabled={isActionPending(`template-archive:${draft.id}`)}
                    className="ui-button ui-button-muted"
                  >
                    Archive
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        <div className="space-y-4">
          {draft.subBrackets.map((subBracket, subBracketIndex) => {
            const playInSeeds = [...new Set(
              (subBracket.slots || [])
                .filter((slot) => (slot.subSeed || 0) > 0)
                .map((slot) => slot.seed)
            )].sort((left, right) => left - right);

            return (
              <section key={`${subBracketIndex}-${subBracket.name}`} className="border border-[var(--line)] bg-[var(--panel)] p-4">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_140px_120px_120px_auto] lg:items-end">
                  <label className="space-y-2">
                    <span className="label-caps text-[var(--accent)]">Sub-bracket name</span>
                    <input
                      value={subBracket.name}
                      onChange={(event) => updateSubBracket(subBracketIndex, { name: event.target.value })}
                      className="ui-field ui-field-panel"
                      placeholder="East"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="label-caps text-[var(--accent)]">Tag</span>
                    <input
                      value={subBracket.tag || ""}
                      onChange={(event) => updateSubBracket(subBracketIndex, { tag: event.target.value || null })}
                      className="ui-field ui-field-panel"
                      placeholder="East"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="label-caps text-[var(--accent)]">Slots</span>
                    <input
                      type="number"
                      min="2"
                      max="128"
                      value={subBracket.slotCount}
                      onChange={(event) =>
                        updateSubBracket(
                          subBracketIndex,
                          normalizeSlotCount(subBracket, Number(event.target.value))
                        )
                      }
                      className="ui-field ui-field-panel"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="label-caps text-[var(--accent)]">Feed order</span>
                    <input
                      type="number"
                      min="1"
                      max="64"
                      value={subBracket.feedOrder}
                      onChange={(event) =>
                        updateSubBracket(subBracketIndex, {
                          feedOrder: Math.max(1, Number(event.target.value) || 1)
                        })
                      }
                      className="ui-field ui-field-panel"
                    />
                  </label>
                  <div className="flex justify-end">
                    {(draft.subBrackets || []).length > 1 ? (
                      <button type="button" onClick={() => removeSubBracket(subBracketIndex)} className="ui-button ui-button-muted">
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                  Seeds 1-{subBracket.slotCount}
                  {playInSeeds.length > 0 ? ` · Play-ins at seeds ${playInSeeds.join(", ")}` : " · No play-ins yet"}
                </p>
              </section>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="border border-[var(--line)] bg-[var(--panel)] p-5">
      <p className="label-caps text-[var(--accent)]">Templates</p>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        This component is only meant to be embedded in seeding right now.
      </p>
    </section>
  );
}
