export function ResultsTable({ compact = false, className = "", wrapperClassName = "", children }) {
  return (
    <div className={`results-table-wrap ${compact ? "results-table-wrap-compact" : ""} ${wrapperClassName}`.trim()}>
      <table className={`results-table ${compact ? "results-table-compact" : ""} ${className}`.trim()}>
        {children}
      </table>
    </div>
  );
}
