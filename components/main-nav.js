"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AuthControls } from "@/components/auth-controls";

const baseLinks = [
  { href: "/", label: "Home" },
  { href: "/vote", label: "Vote" },
  { href: "/create", label: "Create" }
];

export function MainNav({ user, googleConfigured, isDevShimActive, isAdmin = false }) {
  const pathname = usePathname();
  const links = baseLinks;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (!mobileMenuRef.current?.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMobileMenuOpen]);

  return (
    <header ref={mobileMenuRef} className="relative border-y border-[var(--line)] bg-transparent">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-0 py-3 md:items-center">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <p className="display-face text-2xl font-black uppercase leading-none sm:text-3xl">
            Brackeroni
          </p>
          <p className="text-xs tracking-[0.18em] text-[var(--accent-3)]">
            [Make Decisions] &#123;Settle Debates&#125;
          </p>
        </div>
        <div className="hidden flex-wrap items-center gap-2 md:flex md:justify-end">
          <nav className="flex flex-wrap gap-2">
            {links.map((link) => {
              const isActive = pathname === link.href;

              if (isActive) {
                return (
                  <span
                    key={link.href}
                    aria-current="page"
                    className="display-face border border-[var(--accent-2)] bg-[var(--accent-2)] px-4 py-3 text-sm font-bold uppercase tracking-[0.18em] text-black"
                  >
                    {link.label}
                  </span>
                );
              }

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="main-nav-control main-nav-link display-face px-4 py-3 text-sm font-bold uppercase tracking-[0.18em]"
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <AuthControls
            user={user}
            googleConfigured={googleConfigured}
            isDevShimActive={isDevShimActive}
            isAdmin={isAdmin}
          />
        </div>
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((current) => !current)}
          className="main-nav-control inline-flex h-12 w-12 items-center justify-center self-start text-2xl leading-none md:hidden"
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-site-navigation"
          aria-label={isMobileMenuOpen ? "Close navigation" : "Open navigation"}
        >
          <span aria-hidden="true">
            {isMobileMenuOpen ? "×" : "☰"}
          </span>
        </button>
      </div>
      {isMobileMenuOpen ? (
        <div
          id="mobile-site-navigation"
          className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 border border-[var(--line-strong)] bg-[var(--panel)] p-3 shadow-[0_16px_48px_rgba(0,0,0,0.45)] md:hidden"
        >
          <nav className="grid gap-2" aria-label="Mobile navigation">
            {links.map((link) => {
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={
                    isActive
                      ? "display-face border border-[var(--accent-2)] bg-[var(--accent-2)] px-4 py-3 text-sm font-bold uppercase tracking-[0.18em] text-black"
                      : "main-nav-control main-nav-link display-face px-4 py-3 text-sm font-bold uppercase tracking-[0.18em]"
                  }
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-2 border-t border-[var(--line)] pt-2">
            <AuthControls
              user={user}
              googleConfigured={googleConfigured}
              isDevShimActive={isDevShimActive}
              isAdmin={isAdmin}
            />
          </div>
        </div>
      ) : null}
    </header>
  );
}
