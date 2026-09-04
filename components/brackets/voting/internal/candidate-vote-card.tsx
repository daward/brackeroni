import { BackdropRemoteImage } from "@/components/shared";

const fallbackPalettes = {
  left: [
    { background: "#13191a", primary: "#27f5e5", muted: "#344c4a" },
    { background: "#14171b", primary: "#7dd3fc", muted: "#344351" },
    { background: "#151819", primary: "#ffd34d", muted: "#4c4636" }
  ],
  right: [
    { background: "#1a1513", primary: "#ff704d", muted: "#553d34" },
    { background: "#171519", primary: "#d7ff66", muted: "#455036" },
    { background: "#181613", primary: "#f4efe3", muted: "#50483d" }
  ]
};

type CandidateVoteCardProps = {
  name?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  onVote: () => void;
  disabled?: boolean;
  side?: "left" | "right";
};

function hashCandidateName(name: string) {
  let hash = 0;

  for (const character of name) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash;
}

function getFallbackInitials(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "?";
  }

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function CandidateImageFallback({ name = "Candidate", side }: { name?: string | null; side: "left" | "right" }) {
  const label = name?.trim() || "Candidate";
  const hash = hashCandidateName(`${side}:${label}`);
  const sidePalettes = fallbackPalettes[side];
  const palette = sidePalettes[hash % sidePalettes.length];
  const initials = getFallbackInitials(label);
  const patternId = `vote-candidate-fallback-${side}-${hash.toString(16)}`;
  const slabX = side === "left" ? 0 : 240;

  return (
    <svg
      className="vote-candidate-image-fallback"
      viewBox="0 0 320 180"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern id={patternId} width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="16" height="16" fill={palette.background} />
          <rect width="5" height="16" fill={palette.muted} opacity="0.5" />
        </pattern>
      </defs>
      <rect width="320" height="180" fill={palette.background} />
      <rect width="320" height="180" fill={`url(#${patternId})`} opacity="0.42" />
      <rect x={slabX} y="0" width="80" height="180" fill={palette.primary} opacity="0.16" />
      <path d="M0 156 H320 V180 H0 Z" fill={palette.primary} opacity="0.12" />
      <text
        x="160"
        y="112"
        fill={palette.primary}
        className="vote-candidate-fallback-initials display-face"
        textAnchor="middle"
      >
        {initials}
      </text>
    </svg>
  );
}

export function CandidateVoteCard({ name, description, imageUrl, onVote, disabled = false, side = "left" }: CandidateVoteCardProps) {
  return (
    <button type="button" onClick={onVote} disabled={disabled} className={`vote-candidate-card vote-candidate-card-${side}`}>
      <div className="vote-candidate-image-shell">
        {imageUrl ? (
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
        ) : (
          <CandidateImageFallback name={name} side={side} />
        )}
      </div>
      <div className="vote-candidate-copy">
        <p className="vote-candidate-name display-face">{name}</p>
        {description ? <p className="vote-candidate-description">{description}</p> : null}
      </div>
    </button>
  );
}
