import type { BracketAdvancementMode, BracketPlayStyle, BracketResultMode, BracketTieBreakMode } from "@/lib/brackets/types";

export type BracketIntentPresetId = "travel_group_decision";

export type BracketIntentPreset = {
  id: BracketIntentPresetId;
  label: string;
  titleSuggestion: string;
  recommendedIntent: string;
  explanation: string;
  stepGuidance: Partial<Record<"audience" | "results", string>>;
  defaults: {
    audienceMode: "private" | "friends" | "public";
    advancementMode: BracketAdvancementMode;
    playStyle: BracketPlayStyle;
    resultMode: BracketResultMode;
    tieBreakMode: BracketTieBreakMode;
  };
};

export const BRACKET_INTENT_PRESETS: Record<BracketIntentPresetId, BracketIntentPreset> = {
  travel_group_decision: {
    id: "travel_group_decision",
    label: "Travel group decision",
    titleSuggestion: "Trip decision",
    recommendedIntent: "Travel group decision",
    explanation:
      "Preselected: Share with a group and Independent rankings. Each person gets a private link, votes at their own pace, and the results combine into top picks, consensus options, and divisive choices.",
    stepGuidance: {
      audience: "Share with a group so your travel companions can participate in the decision.",
      results: "Independent rankings let each person vote at their own pace, then combine those choices into group results.",
    },
    defaults: {
      audienceMode: "friends",
      advancementMode: "vote_winner",
      playStyle: "fixed_bracket",
      resultMode: "parallel_full_ranking",
      tieBreakMode: "higher_seed_wins",
    },
  },
};

export const BRACKET_INTENT_PRESET_IDS = Object.keys(BRACKET_INTENT_PRESETS) as BracketIntentPresetId[];

export function getBracketIntentPreset(value: string | null | undefined): BracketIntentPreset | null {
  if (!value || !BRACKET_INTENT_PRESET_IDS.includes(value as BracketIntentPresetId)) {
    return null;
  }

  return BRACKET_INTENT_PRESETS[value as BracketIntentPresetId];
}
