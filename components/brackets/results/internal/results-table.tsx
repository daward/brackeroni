import type { ReactNode } from "react";

type ResultsTableProps = {
  compact?: boolean;
  className?: string;
  wrapperClassName?: string;
  children: ReactNode;
};

export function ResultsTable({ compact = false, className = "", wrapperClassName = "", children }: ResultsTableProps) {
  return (
    <div className={`results-table-wrap ${compact ? "results-table-wrap-compact" : ""} ${wrapperClassName}`.trim()}>
      <table className={`results-table ${compact ? "results-table-compact" : ""} ${className}`.trim()}>{children}</table>
    </div>
  );
}
