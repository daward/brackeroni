import type { FeaturedHomeMatchup } from "../types";
import { MobileFeaturedHalf } from "./mobile-featured-half";

type MobileMatchupCardProps = {
  item: FeaturedHomeMatchup;
};

export function MobileMatchupCard({ item }: MobileMatchupCardProps) {
  return (
    <div className="home-mobile-matchup-card">
      <MobileFeaturedHalf name={item.leftName} imageUrl={item.leftImageUrl} align="top" />
      <div className="home-mobile-vs-divider">
        <div className="home-mobile-vs-badge">
          <p className="home-mobile-vs-text display-face">VS</p>
        </div>
      </div>
      <MobileFeaturedHalf name={item.rightName} imageUrl={item.rightImageUrl} align="bottom" />
    </div>
  );
}
