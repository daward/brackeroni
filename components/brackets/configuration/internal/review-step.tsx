"use client";

import { Gauge, Globe2, ListOrdered, LockKeyhole, Trophy, Users } from "lucide-react";
import type { BracketAdvancementMode, BracketPlayStyle, BracketTieBreakMode } from "@/lib/brackets/types";
import type { AudienceMode, ResultMode, SeedingMode } from "../types";
import { WizardQuestion } from "./wizard-question";
import { WizardReviewItem } from "./wizard-review-item";
import { WIZARD_RESULT_MODE_DETAILS } from "./wizard-result-modes";
import styles from "./review-step.module.css";

type ReviewStepProps = {
  title: string;
  selectedName: string;
  selectedCount: number;
  playStyle: BracketPlayStyle;
  resultMode: ResultMode;
  seedingMode: SeedingMode;
  advancementMode: BracketAdvancementMode;
  tieBreakMode: BracketTieBreakMode;
  audienceMode: AudienceMode;
  onTitleChange: (title: string) => void;
  onStepChange: (step: number) => void;
};

function getAccessDetails(audienceMode: ReviewStepProps["audienceMode"]) {
  if (audienceMode === "private") {
    return { icon: LockKeyhole, label: "private" };
  }
  if (audienceMode === "friends") {
    return { icon: Users, label: "Share with friends" };
  }
  return { icon: Globe2, label: "public" };
}

function getWinnersSummary(advancementMode: BracketAdvancementMode, tieBreakMode: BracketTieBreakMode) {
  if (advancementMode === "manual_winner") {
    return "You'll choose each winner";
  }
  return tieBreakMode === "higher_seed_wins" ? "Highest vote total, with ties broken by higher seed" : "Highest vote total, with ties broken at random";
}

function getSeedingSummary(playStyle: BracketPlayStyle, seedingMode: SeedingMode) {
  const laterRounds = playStyle === "reseed" ? "reseed each round" : "fixed bracket";
  const entries = seedingMode === "custom" ? "custom seed order" : "pool order";
  return `${laterRounds}, seeded by ${entries}`;
}

export function ReviewStep({
  title,
  selectedName,
  selectedCount,
  playStyle,
  resultMode,
  seedingMode,
  advancementMode,
  tieBreakMode,
  audienceMode,
  onTitleChange,
  onStepChange,
}: ReviewStepProps) {
  const access = getAccessDetails(audienceMode);
  return (
    <div className={styles.step}>
      <label className={styles.titleField}>
        <WizardQuestion>What should this bracket be called?</WizardQuestion>
        <input
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder={`${selectedName || "Untitled"} Bracket`}
          className={`ui-field display-face ${styles.titleInput}`}
        />
      </label>
      <div className={styles.reviewSection}>
        <WizardQuestion>Your chosen settings</WizardQuestion>
        <div className={styles.reviewGrid}>
          <WizardReviewItem icon={Users} label="Contenders" value={selectedName || "New pool"} detail={`${selectedCount} contenders`} onSelect={() => onStepChange(0)} />
          <WizardReviewItem icon={access.icon} label="Audience" value={access.label} onSelect={() => onStepChange(1)} />
          <WizardReviewItem icon={Trophy} label="Winners" value={getWinnersSummary(advancementMode, tieBreakMode)} onSelect={() => onStepChange(2)} />
          <WizardReviewItem icon={ListOrdered} label="Seeding" value={getSeedingSummary(playStyle, seedingMode)} onSelect={() => onStepChange(3)} />
          <WizardReviewItem icon={Gauge} label="Results" value={WIZARD_RESULT_MODE_DETAILS[resultMode].title} onSelect={() => onStepChange(4)} />
        </div>
      </div>
    </div>
  );
}
