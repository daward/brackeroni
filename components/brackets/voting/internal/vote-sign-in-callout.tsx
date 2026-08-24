import Link from "next/link";
import { CompactRailHeader } from "@/components/shared";
import { buildResultsUrl } from "./vote-routing";
import type { VoteTournament } from "./voting-internal-types";

type VoteSignInCalloutProps = {
  tournament: VoteTournament;
};

export function VoteSignInCallout({ tournament }: VoteSignInCalloutProps) {
  return (
    <section className="vote-callout-panel">
      <CompactRailHeader kicker="Sign-In Required" title={tournament.title} />
      <div className="vote-callout-body">
        <p className="vote-callout-copy">This public bracket is visible, but voting in it requires a signed-in account.</p>
        <div className="vote-callout-actions">
          <Link href="/api/auth/signin" className="ui-button ui-button-primary">
            Sign In To Vote
          </Link>
          <Link href={buildResultsUrl(tournament)} className="ui-button ui-button-muted">
            View Results
          </Link>
        </div>
      </div>
    </section>
  );
}
