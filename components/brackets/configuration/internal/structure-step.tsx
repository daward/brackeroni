"use client";

import type { BracketPlayStyle } from "@/lib/brackets/types";
import type { ResultMode } from "../types";
import { ResultModeChoices, VersusChoice } from "./wizard-choice-controls";
import { WizardQuestion } from "./wizard-question";

type StructureStepProps = {
  playStyle: BracketPlayStyle;
  resultMode: ResultMode;
  onPlayStyleChange: (value: BracketPlayStyle) => void;
  onResultModeChange: (value: ResultMode) => void;
};

export function StructureStep({ playStyle, resultMode, onPlayStyleChange, onResultModeChange }: StructureStepProps) {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <WizardQuestion>How will we select matchups?</WizardQuestion>
        <VersusChoice
          value={playStyle}
          onChange={(value) => onPlayStyleChange(value as BracketPlayStyle)}
          choices={[
            { value: "fixed_bracket", title: "Keep the bracket fixed", description: "The original tournament tree stays intact throughout." },
            { value: "reseed", title: "Reseed each round", description: "The highest seed faces the lowest remaining seed." },
          ]}
        />
      </div>
      <div className="space-y-3">
        <WizardQuestion>What should the bracket decide?</WizardQuestion>
        <ResultModeChoices value={resultMode} onChange={onResultModeChange} />
      </div>
    </div>
  );
}
