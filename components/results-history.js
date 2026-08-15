export function ResultsHistory({ title, hasItems = true, emptyMessage = null, children }) {
  return (
    <section className="results-history">
      <h3 className="results-section-title">{title}</h3>
      {hasItems ? <div className="results-history-list">{children}</div> : <p className="results-empty-copy">{emptyMessage}</p>}
    </section>
  );
}
