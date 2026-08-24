"use client";

import type { ReactNode } from "react";

type TournamentCardMenuProps = {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
};

export function TournamentCardMenu({ label, isOpen, onToggle, children }: TournamentCardMenuProps) {
  return (
    <>
      <button
        type="button"
        aria-label={label}
        aria-expanded={isOpen}
        onClick={onToggle}
        className="completed-bracket-card-menu workspace-card-menu-button"
      >
        <span aria-hidden="true">...</span>
      </button>
      {isOpen ? <div className="workspace-card-menu">{children}</div> : null}
    </>
  );
}
