import { BackdropRemoteImage } from "@/components/shared";

type CandidateVoteCardProps = {
  name?: string | null;
  description?: string | null;
  tags?: string[] | null;
  imageUrl?: string | null;
  onVote: () => void;
  disabled?: boolean;
  side?: "left" | "right";
};

export function CandidateVoteCard({
  name,
  description,
  tags,
  imageUrl,
  onVote,
  disabled = false,
  side = "left",
}: CandidateVoteCardProps) {
  return (
    <button type="button" onClick={onVote} disabled={disabled} className={`vote-candidate-card vote-candidate-card-${side}`}>
      {imageUrl ? (
        <div className="vote-candidate-image-shell">
          <BackdropRemoteImage
            src={imageUrl}
            alt={name || ""}
            className="vote-candidate-backdrop-host"
            backdropClassName="vote-candidate-backdrop"
            imageClassName="vote-candidate-image"
            undersizedImageClassName="vote-candidate-image vote-candidate-image-undersized"
            foregroundWrapperClassName="vote-candidate-image-frame"
            minimumSourceWidth={180}
            minimumSourceHeight={180}
          />
        </div>
      ) : null}
      <div className={`vote-candidate-copy ${imageUrl ? "" : "vote-candidate-copy-no-image"}`}>
        <p className="vote-candidate-name display-face">{name}</p>
        {Array.isArray(tags) && tags.length > 0 ? (
          <div className="vote-candidate-tags">
            {tags.map((tag) => (
              <span key={tag} className="vote-candidate-tag">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        {description ? <p className="vote-candidate-description">{description}</p> : null}
      </div>
    </button>
  );
}
