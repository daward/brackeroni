"use client";

import type { ReactNode } from "react";
import styles from "./wizard-question.module.css";

type WizardQuestionProps = { children: ReactNode };

export function WizardQuestion({ children }: WizardQuestionProps) {
  return <p className={`display-face ${styles.question}`}>{children}</p>;
}
