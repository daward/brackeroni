import { headers } from "next/headers";
import { UseCasePage } from "@/components/use-case-page";
import { resolvePreferredOrigin } from "@/lib/app-origin";

export const metadata = {
  title: "Travel Decisions",
  description: "Use Brackeroni to learn what a group most wants to do on a trip."
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

export default async function TripDecisionsUseCasePage() {
  const origin = await resolveAppOrigin();

  return (
    <UseCasePage
      title="Travel decisions"
      storyKicker="The Trip Problem"
      storyParagraphs={[
        "You picked the destination. Now everyone has opinions. One person wants museums, one wants food, one wants the famous sights, and nobody wants to turn the trip into a spreadsheet.",
        "Instead of debating the whole trip at once, everyone makes small one-vs-one choices.",
        "Start with a pool of attractions, restaurants, hikes, museums, or anything else your group is considering. Pull options from a travel page, add your own choices, or start from a published pool, then find out what will delight your group most."
      ]}
      bookmarklet={{
        origin,
        showInstructions: false,
        copyTextClassName: "text-base leading-7"
      }}
      example={{
        title: "New York City",
        description:
          "Import a New York City guide, attractions page, or saved trip list, then run parallel brackets for museums, food, and major sights."
      }}
      resultPreview={{
        items: [
          {
            label: "Top picks",
            value: "Tenement Museum, Central Park, Pizza crawl"
          },
          {
            label: "Consensus pick",
            value: "Central Park"
          },
          {
            label: "Most divisive",
            value: "Empire State Building"
          }
        ]
      }}
      steps={[
        {
          title: "Add the importer",
          text: "Drag the button below to your bookmarks bar.",
          bookmarklet: {
            origin
          }
        },
        {
          title: "Import a travel page",
          text: "Open a travel guide, attractions page, or saved trip list. Use the bookmarklet to pull options into a pool."
        },
        {
          title: "Refine your pool",
          text: "Review the choices, edit names, add images, and keep the options your group cares about."
        },
        {
          title: "Start the group vote",
          text: "Create a bracket from the pool and share it with your fellow travelers. Parallel mode lets everyone vote through their own matchups.",
          action: {
            href: "/create?newBracket=1&sharingMode=with_friends&visibility=private&resultMode=parallel_full_ranking",
            label: "Start group vote"
          }
        }
      ]}
      stepsLayout="aside"
    />
  );
}
