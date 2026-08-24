"use client";

import { SideDrawer } from "@/components/shared";
import type { ReactNode } from "react";

type Props = { isOpen: boolean; isEditing: boolean; description?: string; onClose: () => void; children: ReactNode };

export function CandidateEditorDrawer({ isOpen, isEditing, description, onClose, children }: Props) {
  if (!isOpen) {
    return null;
  }

  return (
    <SideDrawer title={isEditing ? "Edit Candidate" : "Create Candidate"} description={description ?? undefined} onClose={onClose}>
      {children}
    </SideDrawer>
  );
}
