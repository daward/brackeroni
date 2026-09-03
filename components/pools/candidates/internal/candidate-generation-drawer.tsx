import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { SideDrawer, SideDrawerBody } from "@/components/shared";
import styles from "./candidate-generation-drawer.module.css";
import type { CandidateGeneration } from "../types";

export function CandidateGenerationDrawer({ generation, readOnly }: { generation?: CandidateGeneration; readOnly: boolean }) {
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const validationId = useId();
  const [validationMessage, setValidationMessage] = useState("");

  useEffect(() => {
    if (!generation?.isOpen || readOnly) return;

    setValidationMessage("");
    promptRef.current?.focus();
  }, [generation?.isOpen, readOnly]);

  if (!generation?.isOpen || readOnly) {
    return null;
  }

  const activeGeneration = generation;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeGeneration.prompt.trim()) {
      setValidationMessage("Enter a prompt before generating candidates.");
      promptRef.current?.focus();
      return;
    }

    if (!Number.isInteger(activeGeneration.count) || activeGeneration.count < 1 || activeGeneration.count > 100) {
      setValidationMessage("Choose between 1 and 100 candidates.");
      return;
    }

    activeGeneration.onSubmit();
  }

  return (
    <SideDrawer title="Generate Candidates" description="Add AI-generated candidates directly to this pool." onClose={activeGeneration.onClose}>
      <SideDrawerBody>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.fieldGroup}>
            <label className={`ui-section-kicker ${styles.label}`} htmlFor="candidate-generation-count">
              Candidate Count
            </label>
            <input
              id="candidate-generation-count"
              type="number"
              min={1}
              max={100}
              value={activeGeneration.count}
              onChange={(event) => activeGeneration.onCountChange(Number.parseInt(event.target.value, 10))}
              className="ui-field ui-field-panel"
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={`ui-section-kicker ${styles.label}`} htmlFor="candidate-generation-prompt">
              Prompt
            </label>
            <textarea
              ref={promptRef}
              id="candidate-generation-prompt"
              value={activeGeneration.prompt}
              onChange={(event) => {
                if (validationMessage && event.target.value.trim()) setValidationMessage("");
                activeGeneration.onPromptChange(event.target.value);
              }}
              placeholder="Example: indie games for a four-player game night, varied by genre and easy to explain"
              rows={7}
              aria-invalid={Boolean(validationMessage)}
              aria-describedby={validationMessage ? validationId : undefined}
              className="ui-field ui-field-panel"
            />
            <p className={styles.help}>Generated candidates are added to the pool immediately and can be edited or removed afterward.</p>
          </div>
          <label className={styles.checkboxControl}>
            <input
              type="checkbox"
              checked={activeGeneration.includeImages}
              onChange={(event) => activeGeneration.onIncludeImagesChange(event.target.checked)}
            />
            <span>Ask AI for picture links</span>
          </label>
          {validationMessage ? (
            <p id={validationId} role="alert" className={styles.validationMessage}>
              {validationMessage}
            </p>
          ) : null}
          <div className={styles.actions}>
            <button type="submit" disabled={activeGeneration.isPending} className="ui-button ui-button-primary">
              {activeGeneration.isPending ? "Generating" : "Generate Candidates"}
            </button>
            <button type="button" onClick={activeGeneration.onClose} className="ui-button ui-button-muted">
              Cancel
            </button>
          </div>
        </form>
      </SideDrawerBody>
    </SideDrawer>
  );
}
