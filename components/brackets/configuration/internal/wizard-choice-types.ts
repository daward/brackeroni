import type { ComponentType } from "react";

export type WizardChoiceIcon = ComponentType<{
  className?: string;
  size?: number;
  strokeWidth?: number;
}>;

export type WizardChoice = {
  value: string;
  title: string;
  description: string;
  icon?: WizardChoiceIcon;
};
