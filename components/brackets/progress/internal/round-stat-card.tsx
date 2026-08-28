import { formatTieSuffix } from "./progress-policy";

type RoundStatCardProps = {
  label: string;
  value: string | null | undefined;
  detail?: string | null;
  tieCount?: number;
  tone?: "blue" | "yellow";
};

export function RoundStatCard({ label, value, detail, tieCount = 0, tone = "blue" }: RoundStatCardProps) {
  const toneClass = tone === "yellow" ? "progress-stat-card-yellow" : "";

  return (
    <div className={`progress-stat-card ${toneClass}`.trim()}>
      <p className="progress-stat-label">{label}</p>
      <p className="progress-stat-value">
        {value}
        {tieCount > 0 ? <span className="progress-stat-tie">({formatTieSuffix(tieCount)})</span> : null}
      </p>
      {detail ? <p className="progress-stat-detail">{detail}</p> : null}
    </div>
  );
}
