import Link from "next/link";
import { CompactRailHeader } from "@/components/shared";
import { buildCreateReturnUrl, buildResultsUrl } from "./vote-routing";
import type { VoteTournament } from "./voting-internal-types";

type VoteAlreadyVotedCalloutProps = {
  currentUserId: string | null;
  tournament: VoteTournament;
};

export function VoteAlreadyVotedCallout({
  currentUserId,
  tournament,
}: VoteAlreadyVotedCalloutProps) {
  const isOwner = tournament.creatorUserId === currentUserId;

  return (
    <section className="vote-callout-panel vote-already-voted-callout">
      <CompactRailHeader kicker="Voting Link" title={tournament.title} />
      <div className="vote-callout-body">
        <p className="vote-callout-copy">
          This is the right voting link. You are seeing this state because this browser or account has already submitted a vote for the
          current round.
        </p>
        <div className="vote-callout-actions">
          <Link href={buildResultsUrl(tournament)} className="ui-button ui-button-primary">
            View Results
          </Link>
          <Link href="/vote" className="ui-button ui-button-secondary">
            Other Brackets
          </Link>
          {isOwner ? (
            <Link href={buildCreateReturnUrl(tournament.id, "active")} className="ui-button ui-button-muted">
              Manage Bracket
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
