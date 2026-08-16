"use client";

export function CandidateEditorDrawer({ isOpen, isEditing, description, onClose, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/70">
      <button type="button" aria-label="Close candidate editor" onClick={onClose} className="absolute inset-0 cursor-default" />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-[42rem] flex-col border-l border-[var(--line)] bg-[var(--panel)] shadow-[0_0_40px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-4">
          <div>
            <p className="display-face text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-2)]">{isEditing ? "Edit Candidate" : "Create Candidate"}</p>
            {description ? <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="display-face text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}
