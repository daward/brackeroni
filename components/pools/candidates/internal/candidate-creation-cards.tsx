import { CreateCard } from "@/components/shared";
import type { CandidateActions } from "../types";

export function CandidateCreationCards({ actions }: { actions: Pick<CandidateActions, "onCreate" | "onImport"> }) {
  return (
    <>
      <CreateCard type="button" onClick={actions.onCreate} icon="+" title="Add candidate" description="Add one contender to this pool." />
      {actions.onImport ? (
        <CreateCard type="button" onClick={actions.onImport} tone="secondary" icon="↥" title="Import a list" description="Paste or import a group of contenders." />
      ) : null}
    </>
  );
}
