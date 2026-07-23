import { headers } from "next/headers";
import { UseCasePage } from "@/components/use-case-page";
import { resolvePreferredOrigin } from "@/lib/app-origin";

export const metadata = {
  title: "Back Catalog Brackets",
  description: "Use Brackeroni to turn a creator back catalog into structured audience voting."
};

async function resolveAppOrigin() {
  const requestHeaders = await headers();
  return resolvePreferredOrigin({
    configuredOrigin: process.env.NEXT_PUBLIC_APP_ORIGIN || process.env.APP_ORIGIN,
    forwardedProto: requestHeaders.get("x-forwarded-proto"),
    forwardedHost: requestHeaders.get("x-forwarded-host"),
    host: requestHeaders.get("host")
  });
}

export default async function EngageWithYourAudienceUseCasePage() {
  const origin = await resolveAppOrigin();

  return (
    <UseCasePage
      title="Back catalog brackets"
      storyKicker="The Creator Problem"
      storyParagraphs={[
        "The content treadmill keeps asking for the next upload. Meanwhile, the archive keeps getting deeper: old favorites, sleeper hits, divisive episodes, and videos newer viewers may never find on their own.",
        "The work still has value. The problem is giving people a reason to return to it.",
        "Brackeroni gives that archive a structure: one pool of videos, weekly matchups, round-by-round reveals, and one final audience favorite.",
        "Run the vote in Brackeroni. Let YouTube handle the reactions."
      ]}
      bookmarklet={{
        origin,
        showInstructions: false,
        copyTextClassName: "text-base leading-7"
      }}
      example={{
        title: "Back Catalog Retrospective",
        description:
          "Import a channel videos page, playlist, or archive of episodes, then turn it into an audience bracket that unfolds round by round with a weekly advancement video."
      }}
      resultPreview={{
        items: [
          {
            label: "Closest match",
            value: "Studio tour vs. behind-the-scenes breakdown"
          },
          {
            label: "Biggest upset",
            value: "Seed 28 beat seed 5"
          },
          {
            label: "Audience favorite",
            value: "Pilot episode"
          },
          {
            label: "Next reveal",
            value: "Round 2 opens this week"
          }
        ]
      }}
      steps={[
        {
          title: "Add the importer",
          text: "Drag the bookmarklet to your bookmarks bar so you can send video pages to Brackeroni.",
          bookmarklet: {
            origin
          }
        },
        {
          title: "Import your archive",
          text: "Open your channel, playlist, or video archive and pull your videos into a pool."
        },
        {
          title: "Shape the pool for your audience",
          text: "Review the videos, edit titles, add thumbnails, tag the entries, keep the ones that fit, and seed the matchups if you want."
        },
        {
          title: "Run the weekly bracket",
          text: "Create a bracket with one final winner, open the round for voting, then reveal what advanced in your next episode.",
          action: {
            href: "/create?newBracket=1&visibility=public_listed&votingAccess=anyone",
            label: "Start audience vote"
          }
        }
      ]}
      stepsLayout="aside"
    />
  );
}
