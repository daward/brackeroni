export const WIZARD_STEP_SLUGS = ["contenders", "audience", "winners", "seeding", "results", "review"] as const;

export const WIZARD_STEP_COUNT = WIZARD_STEP_SLUGS.length;

export type WizardStepSlug = (typeof WIZARD_STEP_SLUGS)[number];

const LEGACY_STEP_SLUGS: Record<string, WizardStepSlug> = {
  access: "audience",
  matchups: "winners",
  structure: "results",
};

export function getWizardStepFromSlug(value: string | null | undefined) {
  const normalizedValue = value ? LEGACY_STEP_SLUGS[value] || value : value;
  const step = WIZARD_STEP_SLUGS.findIndex((slug) => slug === normalizedValue);
  return step >= 0 ? step : 0;
}

export function getWizardStepSlug(step: number): WizardStepSlug {
  return WIZARD_STEP_SLUGS[Math.min(Math.max(step, 0), WIZARD_STEP_COUNT - 1)];
}
