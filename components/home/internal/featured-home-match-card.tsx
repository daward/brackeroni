import { FeaturedCandidateMedia } from "./featured-candidate-media";

type FeaturedHomeMatchCardProps = {
  name: string;
  imageUrl?: string | null;
  side: "left" | "right";
};

export function FeaturedHomeMatchCard({ name, imageUrl, side }: FeaturedHomeMatchCardProps) {
  return (
    <div className={`home-match-card home-match-card-${side}`}>
      <FeaturedCandidateMedia
        name={name}
        imageUrl={imageUrl}
        wrapperClassName="home-match-card-image-wrap"
        backdropClassName="home-match-card-backdrop"
        glowClassName="home-match-card-glow"
        imageClassName="home-match-card-image"
        fallbackClassName="home-match-card-fallback"
      >
        <div className="home-match-card-name-band">
          <p className="home-match-card-name display-face">{name}</p>
        </div>
      </FeaturedCandidateMedia>
    </div>
  );
}
