import type { FeaturedHomeMatchup } from "../types";
import { FeaturedHomeMatchCard } from "./featured-home-match-card";

type MatchupRowProps = {
  item: FeaturedHomeMatchup;
};

export function MatchupRow({ item }: MatchupRowProps) {
  return (
    <div className="home-matchup-row">
      <FeaturedHomeMatchCard
        name={item.leftName}
        imageUrl={item.leftImageUrl}
        side="left"
      />
      <div className="home-match-vs-column">
        <p className="home-match-vs-text display-face">
          <span className="home-match-vs-text-inner">Vs</span>
        </p>
      </div>
      <FeaturedHomeMatchCard
        name={item.rightName}
        imageUrl={item.rightImageUrl}
        side="right"
      />
    </div>
  );
}
