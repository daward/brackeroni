"use client";

import { Globe2, LockKeyhole, Users } from "lucide-react";
import { ChoiceCards } from "./wizard-choice-controls";
import { PresetGuidance } from "./preset-guidance";
import { WizardQuestion } from "./wizard-question";
import styles from "./wizard-choice.module.css";

type AccessStepProps = {
  audienceMode: "private" | "friends" | "public";
  recommendedAudienceMode?: "private" | "friends" | "public" | null;
  guidance?: string | null;
  onAudienceModeChange: (mode: "private" | "friends" | "public") => void;
};

export function AccessStep({ audienceMode, recommendedAudienceMode = null, guidance = null, onAudienceModeChange }: AccessStepProps) {
  return (
    <div className={styles.decisionGroup}>
      <WizardQuestion>Who can take part?</WizardQuestion>
      {guidance ? <PresetGuidance>{guidance}</PresetGuidance> : null}
      <ChoiceCards
        value={audienceMode}
        recommendedValue={recommendedAudienceMode}
        onChange={(value) => onAudienceModeChange(value as "private" | "friends" | "public")}
        choices={[
          { value: "private", title: "Private", description: "Only you can see and run this bracket.", icon: LockKeyhole },
          { value: "friends", title: "Share with a group", description: "Invite people with a private link and use group ranking formats.", icon: Users },
          { value: "public", title: "Public", description: "Anyone can discover, vote, and use group ranking formats.", icon: Globe2 },
        ]}
      />
    </div>
  );
}
