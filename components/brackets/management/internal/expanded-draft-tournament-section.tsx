"use client";

import { DraftActions } from "./draft-actions";
import { DraftFriendsLobby } from "./draft-friends-lobby";
import { DraftPoolSection } from "./draft-pool-section";
import { DraftSettingsSection } from "./draft-settings-section";
import type { ExpandedDraftTournamentSectionProps } from "../types";

export function ExpandedDraftTournamentSection({ tournament, settings, pool, entrants, lobby, actions }: ExpandedDraftTournamentSectionProps) {
  return (
    <>
      <DraftSettingsSection {...settings} />
      <DraftPoolSection tournament={tournament} pool={pool} entrants={entrants} />
      {settings.bracketDraft.sharingMode === "with_friends" ? <DraftFriendsLobby {...lobby} /> : null}
      <DraftActions tournament={tournament} actions={actions} />
    </>
  );
}
