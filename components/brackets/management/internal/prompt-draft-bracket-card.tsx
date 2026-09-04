"use client";

import { useState } from "react";
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
  const [prompt, setPrompt] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate(event?: { preventDefault(): void }) {
    event?.preventDefault();
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      onError("Enter a bracket prompt first.");
      return;
    }

    setCreating(true);
    try {
      await createBracketFromIntent(trimmedPrompt);
      setPrompt("");
      onSuccess("Draft bracket created.");
      await onCreated();
    } catch (error) {
      onError(getIntentErrorMessage(error));
    } finally {
      setCreating(false);
    }
  }

  return (
    <form
      className={styles.promptDraftCard}
      aria-labelledby="prompt-draft-bracket-title"
      onSubmit={handleCreate}
    >
      <div className={styles.promptDraftHeader}>
        <h3 id="prompt-draft-bracket-title" className={`display-face ${styles.promptDraftTitle}`}>
          Generate a Bracket
        </h3>
        <p className="object-list-card-copy">Name what you want ranked. Brackeroni will make an editable draft.</p>
      </div>
      <div className={styles.promptDraftField}>
        <label className="sr-only" htmlFor="prompt-draft-bracket-input">
          Bracket prompt
        </label>
        <input
          id="prompt-draft-bracket-input"
          type="text"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder={EXAMPLE_PROMPT}
          className={styles.promptDraftInput}
        />
        <button
          type="submit"
          disabled={disabled || creating}
          className={`display-face ${styles.promptDraftButton}`}
        >
          {creating ? "Creating" : "Generate ->"}
        </button>
      </div>
    </form>
  );
}

function getIntentErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError) {
    return error.message;
  }

  return "Could not create a bracket from that prompt.";
}
