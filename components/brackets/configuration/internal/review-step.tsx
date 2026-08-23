"use client";

import { Gauge, Globe2, ListOrdered, LockKeyhole, Trophy, Users } from "lucide-react";
import type { BracketAdvancementMode, BracketPlayStyle } from "@/lib/brackets/types";
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
  audienceMode: AudienceMode;
  onTitleChange: (title: string) => void;
};

function getAccessDetails(audienceMode: ReviewStepProps["audienceMode"]) {
  if (audienceMode === "private") {
    return { icon: LockKeyhole, label: "private", detail: "Only you can see and run it." };
  }
  if (audienceMode === "friends") {
    return { icon: Users, label: "Share with friends", detail: "Invite people with a private link." };
  }
  return { icon: Globe2, label: "public", detail: "Anyone can discover and vote." };
}

export function ReviewStep({ title, selectedName, selectedCount, playStyle, resultMode, seedingMode, advancementMode, audienceMode, onTitleChange }: ReviewStepProps) {
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
          <WizardReviewItem icon={Users} label="Contenders" value={selectedName || "New pool"} detail={`${selectedCount} contenders`} />
          <WizardReviewItem
            icon={Gauge}
            label="Format"
            value={playStyle === "reseed" ? "Reseed each round" : "Keep the bracket fixed"}
            detail={WIZARD_RESULT_MODE_DETAILS[resultMode].title}
          />
          <WizardReviewItem
            icon={ListOrdered}
            label="Seeding"
            value={seedingMode === "custom" ? "Custom seed order" : "Pool order"}
            detail={seedingMode === "custom" ? "Seed order set in this wizard." : "Candidates begin in their pool order."}
          />
          <WizardReviewItem
            icon={Trophy}
            label="Winner"
            value={advancementMode === "vote_winner" ? "Highest vote total" : "You'll choose"}
            detail={advancementMode === "vote_winner" ? "Votes decide each matchup." : "Record real-world outcomes yourself."}
          />
          <WizardReviewItem icon={access.icon} label="Access" value={access.label} detail={access.detail} />
        </div>
      </div>
    </div>
  );
}
