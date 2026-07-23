import { UseCasePage } from "@/components/use-case-page";

export const metadata = {
  title: "Bracket Brackets",
  description:
    "Use Brackeroni to play along with existing tournaments by building one shared bracket together."
};

export default function BracketBracketsUseCasePage() {
  return (
    <UseCasePage
      title="Bracket brackets"
      storyKicker="The Bracket Problem"
      storyParagraphs={[
        "This is not your typical office pool, where everyone fills out a bracket once and waits for the scores to shake out. The tournament already has a bracket. The question is how your group wants to play it.",
        "Build one bracket together, matchup by matchup, and let the room decide who advances.",
        "Use synchronized voting for a shared champion, then enter the real winners as the games finish."
      ]}
      example={{
        title: "NCAA Tournament",
        description:
          "Set up the tournament field once, let the group vote on each matchup, and track the real winners as the bracket unfolds.",
        content: (
          <div className="mt-6 grid gap-3 border-t border-[var(--line)] pt-4">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <p className="text-sm font-semibold text-[var(--accent-3)]">Champion:</p>
              <p className="ui-copy text-sm leading-6 text-[var(--muted)]">UConn</p>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <p className="text-sm font-semibold text-[var(--accent-3)]">Closest vote:</p>
              <p className="ui-copy text-sm leading-6 text-[var(--muted)]">
                Duke vs. Kentucky, 52-48
              </p>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <p className="text-sm font-semibold text-[var(--accent-3)]">
                Least predicted winner:
              </p>
              <p className="ui-copy text-sm leading-6 text-[var(--muted)]">
                Butler (13) over Baylor (1)
              </p>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <p className="text-sm font-semibold text-[var(--accent-3)]">
                Right side of history:
              </p>
              <p className="ui-copy text-sm leading-6 text-[var(--muted)]">
                Dana voted with the eventual winners the most
              </p>
            </div>
          </div>
        )
      }}
      steps={[
        {
          title: "Set the field",
          text: "Add teams to your pool and set the seeds."
        },
        {
          title: "Share the link",
          text: "Send it to friends before the games begin."
        },
        {
          title: "Enter real results",
          text: "Update winners as games finish."
        }
      ]}
      stepsFooter={
        <div className="space-y-3">
          <a
            href="/create?newBracket=1&sharingMode=with_friends&visibility=private&resultMode=full_ranking&advancementMode=manual_winner"
            className="ui-button ui-button-accent"
          >
            Start your bracket
          </a>
          <p className="ui-copy max-w-sm text-sm leading-6 text-[var(--muted)]">
            One collaborative bracket for the whole group. Everyone votes on the same matchups
            and builds one shared result together.
          </p>
        </div>
      }
      stepsLayout="aside"
    />
  );
}
