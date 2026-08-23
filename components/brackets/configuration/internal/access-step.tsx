"use client";

import { Globe2, LockKeyhole, Users } from "lucide-react";
import { ChoiceCards } from "./wizard-choice-controls";
import { WizardQuestion } from "./wizard-question";

type AccessStepProps = {
  audienceMode: "private" | "friends" | "public";
  onAudienceModeChange: (mode: "private" | "friends" | "public") => void;
};

export function AccessStep({ audienceMode, onAudienceModeChange }: AccessStepProps) {
  return (
    <div className="space-y-3">
      <WizardQuestion>Who can take part?</WizardQuestion>
      <ChoiceCards
        value={audienceMode}
        onChange={(value) => onAudienceModeChange(value as "private" | "friends" | "public")}
        choices={[
          { value: "private", title: "Private", description: "Only you can see and run this bracket.", icon: LockKeyhole },
          { value: "friends", title: "Share with friends", description: "Invite people with a private link.", icon: Users },
          { value: "public", title: "Public", description: "Anyone can discover and vote on it.", icon: Globe2 },
        ]}
      />
    </div>
  );
}
