import { FeaturedCandidateMedia } from "./featured-candidate-media";

type MobileFeaturedHalfProps = {
  name: string;
  imageUrl?: string | null;
  align?: "top" | "bottom";
};

export function MobileFeaturedHalf({ name, imageUrl, align = "top" }: MobileFeaturedHalfProps) {
  const foregroundClassName =
    align === "top" ? "home-mobile-half-foreground-top" : "home-mobile-half-foreground-bottom";
  const labelClassName = align === "top" ? "home-mobile-half-label-top" : "home-mobile-half-label-bottom";

  return (
    <FeaturedCandidateMedia
      name={name}
      imageUrl={imageUrl}
      wrapperClassName="home-mobile-half"
      backdropClassName="home-mobile-half-backdrop"
      glowClassName="home-mobile-half-glow"
      imageClassName={`home-mobile-half-foreground ${foregroundClassName}`}
      fallbackClassName="home-mobile-half-fallback"
    >
      <div className={`home-mobile-half-label ${labelClassName}`}>
        <p className="home-mobile-half-name display-face">{name}</p>
      </div>
    </FeaturedCandidateMedia>
  );
}
