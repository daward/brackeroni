"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Sparkles } from "lucide-react";
import { CreateCard, SideDrawer, SideDrawerBody } from "@/components/shared";
import { createBracketFromIntent } from "@/lib/client-api/create-workspace";
import { ApiRequestError } from "@/lib/client-api/http";
import styles from "./management.module.css";

type PromptDraftBracketCardProps = {
  disabled: boolean;
  onCreated: () => Promise<void> | void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

const EXAMPLE_PROMPT = "16 Boston brunch spots";

export function PromptDraftBracketCard({
  disabled,
  onCreated,
  onError,
  onSuccess,
}: PromptDraftBracketCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [creating, setCreating] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const promptRef = useRef<HTMLInputElement>(null);
  const drawerId = useId();
  const validationId = useId();

  useEffect(() => {
    if (!isOpen) return;

    setValidationMessage("");
    promptRef.current?.focus();
  }, [isOpen]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      setValidationMessage("Enter a bracket prompt first.");
      promptRef.current?.focus();
      return;
    }

    setCreating(true);
    try {
      await createBracketFromIntent(trimmedPrompt);
      setPrompt("");
      setIsOpen(false);
      onSuccess("Draft bracket created.");
      await onCreated();
    } catch (error) {
      onError(getIntentErrorMessage(error));
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <CreateCard
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-controls={drawerId}
        aria-label="Generate with AI"
        tone="secondary"
        icon={<Sparkles aria-hidden="true" size={28} />}
        title="Generate with AI"
        description="Create a bracket from a prompt."
      />
      {isOpen ? (
        <SideDrawer
          title="Generate Bracket"
          description="Make an editable draft bracket from a short prompt."
          onClose={() => setIsOpen(false)}
        >
          <SideDrawerBody>
            <form id={drawerId} className={styles.promptDraftDrawerForm} onSubmit={handleCreate}>
              <div className={styles.promptDraftField}>
                <label className={`ui-section-kicker ${styles.promptDraftLabel}`} htmlFor="prompt-draft-bracket-input">
                  Prompt
                </label>
                <input
                  ref={promptRef}
                  id="prompt-draft-bracket-input"
                  type="text"
                  value={prompt}
                  onChange={(event) => {
                    if (validationMessage && event.target.value.trim()) setValidationMessage("");
                    setPrompt(event.target.value);
                  }}
                  placeholder={EXAMPLE_PROMPT}
                  aria-invalid={Boolean(validationMessage)}
                  aria-describedby={validationMessage ? validationId : undefined}
                  className="ui-field ui-field-panel"
                />
                <p className="object-list-card-copy">Name what you want ranked. Brackeroni will make an editable draft.</p>
              </div>
              {validationMessage ? (
                <p id={validationId} role="alert" className={styles.promptDraftValidationMessage}>
                  {validationMessage}
                </p>
              ) : null}
              <div className={styles.promptDraftDrawerActions}>
                <button type="submit" disabled={disabled || creating} className="ui-button ui-button-primary">
                  {creating ? "Creating" : "Generate Bracket"}
                </button>
                <button type="button" onClick={() => setIsOpen(false)} className="ui-button ui-button-muted">
                  Cancel
                </button>
              </div>
            </form>
          </SideDrawerBody>
        </SideDrawer>
      ) : null}
    </>
  );
}

function getIntentErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError) {
    return error.message;
  }

  return "Could not create a bracket from that prompt.";
}
