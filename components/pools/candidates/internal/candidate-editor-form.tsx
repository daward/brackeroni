import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { CandidateEditorDrawer } from "./candidate-editor-drawer";
import { ResilientRemoteImage, SideDrawerBody } from "@/components/shared";
import styles from "./candidate-editor-form.module.css";
import type { CandidateEditor } from "../types";

export function CandidateEditorForm({ editor }: { editor: CandidateEditor & { readOnly: boolean } }) {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const nameErrorId = useId();
  const [nameError, setNameError] = useState("");
  const {
    isOpen,
    isEditing,
    readOnly,
    draft,
    imageSuggestions,
    imageSuggestionLoading,
    isCreatePending,
    isSavePending,
    description,
    onDraftChange,
    onSubmit,
    onClose,
    onSuggestImages,
    onClearImage,
    onSelectSuggestedImage
  } = editor;
  useEffect(() => {
    if (!isOpen || readOnly) return;

    setNameError("");
    nameInputRef.current?.focus();
  }, [isOpen, readOnly]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.name.trim()) {
      setNameError("Enter a candidate name before saving.");
      nameInputRef.current?.focus();
      return;
    }

    onSubmit();
  }

  function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
    if (nameError && event.target.value.trim()) setNameError("");
    onDraftChange("name", event.target.value);
  }

  if (!isOpen || readOnly) {
    return null;
  }

  return (
    <CandidateEditorDrawer isOpen isEditing={isEditing} description={description} onClose={onClose}>
      <SideDrawerBody>
        <div className={styles.layout}>
          <form className={styles.formPanel} onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="candidate-name">Candidate name</label>
            <input ref={nameInputRef} id="candidate-name" value={draft.name} onChange={handleNameChange} placeholder="Candidate name" aria-invalid={Boolean(nameError)} aria-describedby={nameError ? nameErrorId : undefined} aria-required="true" className="ui-field ui-field-panel" />
            {nameError ? <p id={nameErrorId} role="alert" className={styles.validationMessage}>{nameError}</p> : null}
            <label className="sr-only" htmlFor="candidate-description">Description</label>
            <textarea id="candidate-description" value={draft.description} onChange={(event) => onDraftChange("description", event.target.value)} placeholder="Description" rows={5} className="ui-field ui-field-panel" />
            <label className="sr-only" htmlFor="candidate-image-url">Image URL</label>
            <input id="candidate-image-url" value={draft.imageUrl} onChange={(event) => onDraftChange("imageUrl", event.target.value)} placeholder="Image URL" className="ui-field ui-field-panel" />
            <label className="sr-only" htmlFor="candidate-tags">Tags, comma-separated</label>
            <input id="candidate-tags" value={draft.tagsText} onChange={(event) => onDraftChange("tagsText", event.target.value)} placeholder="Tags (comma-separated)" className="ui-field ui-field-panel" />
            <div className={styles.actions}>
              <button type="submit" disabled={isEditing ? isSavePending : isCreatePending} className="ui-button ui-button-primary">
                {isEditing ? (isSavePending ? "Saving" : "Save Candidate") : isCreatePending ? "Creating" : "Create Candidate"}
              </button>
              <button type="button" onClick={onClose} className="ui-button ui-button-muted">Cancel</button>
            </div>
            {draft.imageUrl ? (
              <div className={styles.preview}>
                <ResilientRemoteImage src={draft.imageUrl} alt={draft.name || "Selected image"} className={styles.previewImage} />
              </div>
            ) : (
              <div className={styles.previewEmpty}>
                <p className="ui-section-kicker">Select an image to preview it here.</p>
              </div>
            )}
          </form>
          <section className={`${styles.suggestionPanel} ${imageSuggestionLoading ? styles.suggestionPanelLoading : ""}`}>
            <div className={styles.suggestionHeader}>
              <p className="ui-section-kicker">Image Picks</p>
              <div className={styles.suggestionActions}>
                <button type="button" onClick={onSuggestImages} disabled={imageSuggestionLoading} className="ui-button ui-button-accent">
                  {imageSuggestionLoading ? "Searching" : "Suggest"}
                </button>
                {draft.imageUrl ? <button type="button" onClick={onClearImage} className="ui-button ui-button-muted ui-button-compact">Clear</button> : null}
              </div>
            </div>
            {imageSuggestions.length > 0 ? (
              <div className={styles.suggestions}>
                <p className="ui-section-kicker">Suggested Images</p>
                <div className={styles.suggestionGrid}>
                  {imageSuggestions.map((image) => {
                    const isSelected = draft.imageUrl === image.imageUrl;

                    return (
                      <button
                        key={image.id}
                        type="button"
                        onClick={() => onSelectSuggestedImage(image.imageUrl)}
                        aria-label={image.title || "Suggested image"}
                        title={image.title || "Suggested image"}
                        className={`${styles.suggestionCard} ${isSelected ? styles.suggestionCardSelected : ""}`}
                      >
                        <span className={styles.suggestionImageFrame}>
                          <ResilientRemoteImage src={image.thumbnailUrl || image.imageUrl} alt={image.title || "Suggested image"} className={styles.suggestionImage} />
                          {isSelected ? <span className={`ui-meta ${styles.selectedLabel}`}>Selected</span> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </SideDrawerBody>
    </CandidateEditorDrawer>
  );
}
