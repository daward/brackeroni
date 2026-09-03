import { Plus, Sparkles, Upload } from "lucide-react";
import { CreateCard } from "@/components/shared";
import type { CandidateActions } from "../types";

export function CandidateCreationCards({ actions }: { actions: Pick<CandidateActions, "onCreate" | "onImport" | "onGenerate"> }) {
  return (
    <>
      <CreateCard
        type="button"
        onClick={actions.onCreate}
        aria-label="Add candidate"
        icon={<Plus aria-hidden="true" size={28} />}
        title="Add candidate"
        description="Add one contender to this pool."
      />
      {actions.onImport ? (
        <CreateCard
          type="button"
          onClick={actions.onImport}
          aria-label="Import a list"
          tone="secondary"
          icon={<Upload aria-hidden="true" size={28} />}
          title="Import a list"
          description="Paste or import a group of contenders."
        />
      ) : null}
      {actions.onGenerate ? (
        <CreateCard
          type="button"
          onClick={actions.onGenerate}
          aria-label="Generate with AI"
          tone="secondary"
          icon={<Sparkles aria-hidden="true" size={28} />}
          title="Generate with AI"
          description="Create candidates from a prompt."
        />
      ) : null}
    </>
  );
}
