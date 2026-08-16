import { CandidateTagList } from "@/components/pools/shared/candidate-tag-list";
import { ImageRailCard } from "@/components/shared/image-rail-card";

export function CandidatePoolCard({
  candidate,
  readOnly = false,
  expanded = false,
  removing = false,
  onActivate,
  onRemove
}) {
  return (
    <div
      className={`candidate-pool-card group ${candidate.imageUrl ? "candidate-pool-card-has-image" : ""} ${expanded ? "candidate-pool-card-expanded" : ""}`}
    >
      <ImageRailCard
        type="button"
        onClick={onActivate}
        as="button"
        imageUrl={candidate.imageUrl}
        imageAlt={candidate.name}
        className="candidate-pool-card-action"
        railClassName="candidate-pool-card-rail"
      >
        <p className="candidate-pool-card-title display-face">{candidate.name}</p>
        <CandidateTagList
          tags={candidate.tags}
          limit={expanded ? null : 2}
          className="candidate-pool-card-tags"
        />
        {candidate.description ? (
          <p className="candidate-pool-card-description">{candidate.description}</p>
        ) : null}
      </ImageRailCard>
      {candidate.sourceUrl ? (
        <a
          href={candidate.sourceUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open source for ${candidate.name}`}
          title={`Open source for ${candidate.name}`}
          className="candidate-pool-card-source"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2">
            <path d="M14 5h5v5" />
            <path d="M10 14 19 5" />
            <path d="M19 14v5H5V5h5" />
          </svg>
        </a>
      ) : null}
      {!readOnly ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${candidate.name}`}
          title={`Remove ${candidate.name}`}
          disabled={removing}
          className="candidate-pool-card-remove"
        >
          {removing ? (
            <span className="text-[10px] uppercase tracking-[0.12em]">...</span>
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
              <path d="M4 7h16" />
              <path d="M9 7V4h6v3" />
              <path d="M7 7l1 13h8l1-13" />
              <path d="M10 11v5" />
              <path d="M14 11v5" />
            </svg>
          )}
        </button>
      ) : null}
    </div>
  );
}
