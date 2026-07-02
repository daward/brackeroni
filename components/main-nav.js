"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthControls } from "@/components/auth-controls";

const baseLinks = [
  { href: "/", label: "Home" },
  { href: "/vote", label: "Vote" },
  { href: "/create", label: "Create" }
];

export function MainNav({ user, googleConfigured, isDevShimActive, isAdmin = false }) {
  const pathname = usePathname();
  const links = baseLinks;

  return (
    <header className="border-y border-[var(--line)] bg-[var(--panel-3)]">
      <div className="grid gap-3 px-4 py-3 md:grid-cols-[1fr_auto] md:items-center md:px-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <p className="display-face text-2xl font-black uppercase leading-none sm:text-3xl">
            Brackeroni
          </p>
          <p className="text-xs tracking-[0.18em] text-[var(--accent-3)]">
            [Make Decisions] &#123;Settle Debates&#125;
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
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
                  className="nav-link display-face border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-sm font-bold uppercase tracking-[0.18em] transition hover:border-[var(--accent-2)] hover:bg-[var(--accent-2)]"
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
      </div>
    </header>
  );
}
