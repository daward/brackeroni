import type {
  Bracket,
  BracketAccess,
  BracketFeaturedOptions,
  BracketList,
  BracketListOptions,
  BracketPublicListOptions,
  BracketStatus,
  ParallelBracketAccessibleListOptions,
  ParallelBracketAccessibleOptions,
  ParallelBracketCollection,
  ParallelBracketCreateInput,
  BracketCollectionOptions,
  ParallelBracketDirectory,
} from "@/lib/brackets/types";

import * as parallelBracketRecords from "@/lib/brackets/internal/stateful-workflows/parallel-bracket-records";
import { normalizeFlatBracketWinner } from "@/lib/brackets/internal/bracket-records";

type CreateParallelBracket = (
  options: ParallelBracketCreateInput & BracketCollectionOptions,
) => Promise<Bracket>;
type GetAccessibleParallelBracket = (options: ParallelBracketAccessibleOptions) => Promise<Bracket>;
type GetAggregateResults = (options: ParallelBracketAccessibleOptions) => Promise<Record<string, unknown>>;
type GetFeaturedTeaserMatchups = (options: BracketFeaturedOptions) => Promise<Array<Record<string, unknown>>>;
type GetStatusCounts = (options: BracketCollectionOptions) => Promise<Partial<Record<BracketStatus, number>>>;
type ListAccessibleParallelBrackets = (options: ParallelBracketAccessibleListOptions) => Promise<Bracket[]>;
type ListParallelBrackets = (options: BracketCollectionOptions & BracketListOptions) => Promise<BracketList>;
type ListPublicParallelBrackets = (options: BracketPublicListOptions) => Promise<Bracket[]>;
type OpenParticipantBracket = (options: ParallelBracketAccessibleOptions) => Promise<{ bracketId: string }>;
type CanInspectAllParticipants = (options: Pick<BracketAccess, "sharingMode" | "visibility">) => boolean;
type FilterVisibleParticipants = ParallelBracketDirectory["filterVisibleParticipants"];
type ParallelRecordAccessOptions = {
  parallelTournamentId: string;
  userId: string | null;
  anonymousVoterToken: string | null;
};
type CreateParallelBracketRecordOptions = ParallelBracketCreateInput &
  BracketCollectionOptions & {
    description: string | null;
  };
type ParallelBracketRecord = Bracket & {
  viewerTournamentId?: string | null;
};

function normalizeParallelBracketRecord(record: ParallelBracketRecord): Bracket {
  const { viewerTournamentId, ...bracket } = normalizeFlatBracketWinner(record);
  return {
    ...bracket,
    viewerBracketId: bracket.viewerBracketId ?? viewerTournamentId ?? null,
  };
}

function normalizeParallelBracketRecords(records: ParallelBracketRecord[]): Bracket[] {
  return records.map(normalizeParallelBracketRecord);
}

const createParallelBracketRecord =
  parallelBracketRecords.createParallelBracket as unknown as (
    options: CreateParallelBracketRecordOptions,
  ) => Promise<Bracket>;
const createParallelBracket: CreateParallelBracket = (options) =>
  createParallelBracketRecord({
    ...options,
    description: options.description ?? null,
  });
const getParallelBracketStatusCounts =
  parallelBracketRecords.getParallelBracketStatusCounts as unknown as GetStatusCounts;
const listParallelBrackets = parallelBracketRecords.listParallelBrackets as unknown as ListParallelBrackets;
const listAccessibleParallelBrackets =
  parallelBracketRecords.listAccessibleParallelBrackets as unknown as ListAccessibleParallelBrackets;
const listPublicParallelBrackets =
  parallelBracketRecords.listPublicParallelBrackets as unknown as ListPublicParallelBrackets;
const getFeaturedTeaserMatchups =
  parallelBracketRecords.getFeaturedParallelBracketTeaserMatchups as unknown as GetFeaturedTeaserMatchups;
const canInspectAllParticipants =
  parallelBracketRecords.canInspectAllParallelBracketParticipants as unknown as CanInspectAllParticipants;
const filterVisibleParticipants =
  parallelBracketRecords.filterVisibleParallelBracketParticipants as unknown as FilterVisibleParticipants;
const getAccessibleParallelBracketRecord =
  parallelBracketRecords.getAccessibleParallelBracketById as unknown as (
    options: ParallelRecordAccessOptions,
  ) => Promise<Bracket>;
const openParticipantBracketRecord =
  parallelBracketRecords.openParallelBracketParticipant as unknown as (
    options: ParallelRecordAccessOptions,
  ) => Promise<{ tournamentId: string }>;
const getAggregateResultsRecord =
  parallelBracketRecords.getParallelBracketAggregateResults as unknown as (
    options: ParallelRecordAccessOptions,
  ) => Promise<Record<string, unknown>>;

const getAccessibleParallelBracket: GetAccessibleParallelBracket = async (options) =>
  normalizeParallelBracketRecord(await getAccessibleParallelBracketRecord({
    parallelTournamentId: options.parallelBracketId,
    userId: options.userId ?? null,
    anonymousVoterToken: options.anonymousVoterToken ?? null,
  }));

const openParticipantBracket: OpenParticipantBracket = async (options) => {
  const participantBracket = await openParticipantBracketRecord({
    parallelTournamentId: options.parallelBracketId,
    userId: options.userId ?? null,
    anonymousVoterToken: options.anonymousVoterToken ?? null,
  });
  return { bracketId: participantBracket.tournamentId };
};

const getAggregateResults: GetAggregateResults = (options) =>
  getAggregateResultsRecord({
    parallelTournamentId: options.parallelBracketId,
    userId: options.userId ?? null,
    anonymousVoterToken: options.anonymousVoterToken ?? null,
  });

export function parallelBrackets({ creatorUserId }: BracketCollectionOptions): ParallelBracketCollection {
  return {
    list: (options = {}) =>
      listParallelBrackets({
        creatorUserId,
        ...options,
      }),
    statusCounts: () => getParallelBracketStatusCounts({ creatorUserId }),
    create: (input) =>
      createParallelBracket({
        creatorUserId,
        ...input,
      }),
  };
}

export function parallelBracketDirectory(): ParallelBracketDirectory {
  return {
    getAccessibleBracketById: getAccessibleParallelBracket,
    getFeaturedTeaserMatchups: (options = {}) => getFeaturedTeaserMatchups(options),
    getAggregateResults,
    listAccessibleBrackets: async (options) => normalizeParallelBracketRecords(await listAccessibleParallelBrackets(options)),
    listPublicBrackets: async (options = {}) => normalizeParallelBracketRecords(await listPublicParallelBrackets(options)),
    openParticipantBracket,
    canInspectAllParticipants,
    filterVisibleParticipants,
  };
}
