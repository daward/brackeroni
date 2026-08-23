"use client";

import type { BracketAdvancementMode, BracketTieBreakMode } from "@/lib/brackets/types";
import { VersusChoice } from "./wizard-choice-controls";
import { WizardQuestion } from "./wizard-question";

type MatchupsStepProps = {
  advancementMode: BracketAdvancementMode;
  tieBreakMode: BracketTieBreakMode;
  onAdvancementModeChange: (value: BracketAdvancementMode) => void;
  onTieBreakModeChange: (value: BracketTieBreakMode) => void;
};

export function MatchupsStep({ advancementMode, tieBreakMode, onAdvancementModeChange, onTieBreakModeChange }: MatchupsStepProps) {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <WizardQuestion>How will each matchup be decided?</WizardQuestion>
        <VersusChoice
          value={advancementMode}
          onChange={(value) => onAdvancementModeChange(value as BracketAdvancementMode)}
          choices={[
            { value: "vote_winner", title: "Highest vote total", description: "Best for most brackets: the contender with the most votes advances." },
            { value: "manual_winner", title: "I'll choose", description: "Follow real-life outcomes, such as a sporting event, and record the winner as it happens." },
          ]}
        />
      </div>
      {advancementMode === "vote_winner" ? (
        <div className="space-y-3">
          <WizardQuestion>How should a tie be resolved?</WizardQuestion>
          <VersusChoice
            value={tieBreakMode}
            onChange={(value) => onTieBreakModeChange(value as BracketTieBreakMode)}
            choices={[
              { value: "higher_seed_wins", title: "Higher seed advances", description: "Use the starting order as the tie-breaker." },
              { value: "random", title: "Pick at random", description: "Break a tied vote with a random draw." },
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}
