export function SectionCard({ title, action, children, actionAlign = "right" }) {
  const justifyClass =
    title && action ? "justify-between" : actionAlign === "left" ? "justify-start" : "justify-end";

  return (
    <section className="news-grid border border-[var(--line)] bg-[var(--panel)] p-0">
      {title || action ? (
        <div
          className={`flex items-center gap-4 border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-2 ${justifyClass}`}
        >
          {title ? (
            <h2 className="display-face text-lg font-black uppercase tracking-[0.18em] text-[var(--accent-2)]">
              {title}
            </h2>
          ) : null}
          {action ? <div>{action}</div> : null}
        </div>
      ) : null}
      <div>{children}</div>
    </section>
  );
}
