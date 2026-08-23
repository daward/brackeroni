"use client";

import { Gauge, ListOrdered, Medal, Trophy, Users } from "lucide-react";
import type { ComponentType } from "react";
import type { ResultMode } from "../types";

export type WizardResultModeDetail = {
  option: string;
  title: string;
  description: string;
  note: string;
};

export const WIZARD_RESULT_MODE_DETAILS: Record<ResultMode, WizardResultModeDetail> = {
  winner_only: {
    option: "Crown one winner - simple elimination",
    title: "Crown one winner",
    description: "A familiar knockout bracket. Once a champion is decided, the bracket is complete.",
    note: "Best default when you only need the winner.",
  },
  full_ranking: {
    option: "Rank everyone - traditional bracket, more voting",
    title: "Rank everyone",
    description: "The bracket continues after first place so every contender receives a final position.",
    note: "Best when the complete order matters, not just the champion.",
  },
  partial_ranking: {
    option: "Rank the top half - recognize leaders, save voting",
    title: "Rank the top half",
    description: "The strongest half receives explicit placements; the remaining contenders are ordered by performance.",
    note: "Best when the leaders matter more than the complete order.",
  },
  fast_full_rank: {
    option: "Rank everyone faster - Swiss rounds, not a knockout bracket",
    title: "Rank everyone faster",
    description: "Uses Swiss-style rounds: contenders keep appearing in later rounds instead of dropping out, producing a full ranking with fewer matchups.",
    note: "Best when you want a complete ranking without a long elimination bracket.",
  },
  parallel_full_ranking: {
    option: "Rank together - everyone votes through their own matchups",
    title: "Rank together",
    description: "Each participant works through their own set of matchups. Their completed rankings combine into one group result.",
    note: "Best for group decisions where everyone should weigh in independently.",
  },
  parallel_partial_ranking: {
    option: "Rank the top half together",
    title: "Rank the top half together",
    description: "Each participant completes a ranking that combines into a shared top-half result.",
    note: "Best for group decisions that do not require every placement.",
  },
};

export const WIZARD_RESULT_MODE_ICONS: Record<ResultMode, ComponentType<{ className?: string; size?: number; strokeWidth?: number }>> = {
  winner_only: Trophy,
  full_ranking: ListOrdered,
  partial_ranking: Medal,
  fast_full_rank: Gauge,
  parallel_full_ranking: Users,
  parallel_partial_ranking: Users,
};
