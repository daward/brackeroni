import type { ResultEntry, ResultMatch, ResultTournament } from "../types";

export type EntrySeedDisplay = {
  localSeed: number;
  subBracketName: string | null;
  label: string;
};

export type ResultEntryDetailsProps = {
  tournament: ResultTournament;
  orderedEntries: ResultEntry[];
  selectedEntry: ResultEntry | null;
  selectedEntryHistory: ResultMatch[];
  seedDisplayByEntryId: Map<string, EntrySeedDisplay>;
};

export type UserVoteNote = {
  label: string;
  className: string;
};
