"use client";

import { Globe2, LockKeyhole, Users } from "lucide-react";
import { ChoiceCards } from "./wizard-choice-controls";
import { WizardQuestion } from "./wizard-question";
import styles from "./wizard-choice.module.css";

type AccessStepProps = {
  audienceMode: "private" | "friends" | "public";
  onAudienceModeChange: (mode: "private" | "friends" | "public") => void;
};

export function AccessStep({ audienceMode, onAudienceModeChange }: AccessStepProps) {
  return (
    <div className={styles.decisionGroup}>
      <WizardQuestion>Who can take part?</WizardQuestion>
      <ChoiceCards
        value={audienceMode}
        onChange={(value) => onAudienceModeChange(value as "private" | "friends" | "public")}
        choices={[
          { value: "private", title: "Private", description: "Only you can see and run this bracket.", icon: LockKeyhole },
          { value: "friends", title: "Share with friends", description: "Invite people with a private link and use group ranking formats.", icon: Users },
          { value: "public", title: "Public", description: "Anyone can discover, vote, and use group ranking formats.", icon: Globe2 },
        ]}
      />
    </div>
  );
}
