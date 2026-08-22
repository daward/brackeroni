import { formatTieSuffix } from "@/lib/brackets/progress";

type RoundStatCardProps = {
  label: string;
  value: string | null | undefined;
  detail?: string | null;
  tieCount?: number;
  tone?: "blue" | "yellow";
};

export function RoundStatCard({ label, value, detail, tieCount = 0, tone = "blue" }: RoundStatCardProps) {
  const toneClass = tone === "yellow"
    ? "border-[var(--accent-2)]/80 shadow-[inset_0_0_0_1px_rgba(255,216,77,0.18)]"
    : "border-[var(--accent-3)]/80 shadow-[inset_0_0_0_1px_rgba(52,211,196,0.18)]";

  return <div className={`border bg-transparent px-4 py-4 ${toneClass}`}>
    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent-3)]">{label}</p>
    <p className="display-face mt-3 text-xl font-black leading-[1.03] text-[var(--ink)]">
      {value}
      {tieCount > 0 ? <span className="mt-1 block font-serif text-[11px] font-bold lowercase tracking-normal text-[var(--muted)]">
        ({formatTieSuffix(tieCount)})
      </span> : null}
    </p>
    {detail ? <p className="mt-3 font-serif text-sm leading-6 text-[var(--muted)]">{detail}</p> : null}
  </div>;
}
