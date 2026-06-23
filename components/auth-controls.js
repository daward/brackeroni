"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { signIn, signOut } from "next-auth/react";

function getInitials(name, email) {
  const source = (name || email || "").trim();

  if (!source) {
    return "?";
  }

  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export function AuthControls({ user, googleConfigured, isDevShimActive }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (user) {
    return <AccountMenu user={user} isDevShimActive={isDevShimActive} />;
  }

  const query = searchParams?.toString();
  const callbackUrl = query ? `${pathname}?${query}` : pathname || "/";

  return (
    <button
      type="button"
      onClick={() => signIn("google", { callbackUrl })}
      disabled={!googleConfigured}
      title={googleConfigured ? "Sign in with Google" : "Configure Google OAuth to sign in."}
      className="display-face border border-[var(--accent-2)] bg-[var(--accent-2)] px-4 py-3 text-sm font-bold uppercase tracking-[0.18em] text-black transition hover:border-[var(--accent-3)] hover:bg-[var(--accent-3)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      Sign In
    </button>
  );
}

function AccountMenu({ user, isDevShimActive }) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex items-center gap-3 border border-[var(--line)] bg-[var(--panel)] px-3 py-2 transition hover:border-[var(--accent-2)]"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        {user.imageUrl ? (
          <img
            src={user.imageUrl}
            alt={user.name || user.email || "Account avatar"}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--panel-2)] text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-2)]">
            {getInitials(user.name, user.email)}
          </span>
        )}
        <span className="display-face text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
          Account
        </span>
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-72 border border-[var(--line)] bg-[var(--panel)] shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
          <div className="border-b border-[var(--line)] px-4 py-4">
            <p className="display-face text-lg font-black">{user.name}</p>
            <p className="mt-1 text-xs tracking-[0.08em] text-[var(--muted)]">{user.email}</p>
            {isDevShimActive ? (
              <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-3)]">
                Dev User
              </p>
            ) : null}
          </div>
          <div className="p-3">
            {isDevShimActive ? (
              <span className="flex w-full items-center justify-center border border-[var(--line)] px-4 py-3 text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
                Dev User Session
              </span>
            ) : (
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="ui-button ui-button-muted w-full justify-center"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
