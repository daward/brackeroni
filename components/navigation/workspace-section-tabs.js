import Link from "next/link";

const sections = [
  { view: "tournaments", href: "/brackets", label: "Brackets", description: "Build brackets and manage rounds" },
  { view: "pools", href: "/pools", label: "Pools", description: "Build and edit candidate sets" }
];

/** The single, global Brackets/Pools workspace switcher. */
export function WorkspaceSectionTabs({ activeView }) {
  return (
    <nav aria-label="Workspace sections" className="border-b border-[var(--line-strong)]">
      <div className="grid grid-cols-2">
        {sections.map((section) => {
          const isActive = section.view === activeView;
          return (
            <Link
              key={section.view}
              href={section.href}
              aria-current={isActive ? "page" : undefined}
              className={`w-full border-b-2 py-3 text-left transition ${
                isActive
                  ? "border-[var(--accent-2)]"
                  : "border-transparent hover:border-[var(--line-strong)]"
              }`}
            >
              <p className="display-face text-lg font-black uppercase sm:text-xl">{section.label}</p>
              <p className="mt-2 hidden text-sm uppercase tracking-[0.14em] text-[var(--muted)] sm:block">
                {section.description}
              </p>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
