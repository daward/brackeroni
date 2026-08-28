import type {
  Bracket,
  BracketAccess,
  BracketFeaturedOptions,
  BracketList,
  BracketStatus,
  ParallelBracketAccessibleListOptions,
  ParallelBracketAccessibleOptions,
  ParallelBracketCollection,
  ParallelBracketCreateInput,
  ParallelBracketListOptions,
  ParallelBracketPublicListOptions,
  ParallelParticipantOpenOptions,
  BracketCollectionOptions,
  ParallelBracketDirectory,
} from "@/lib/brackets/types";

import * as parallelBracketRecords from "@/lib/brackets/internal/parallel-bracket-records";

type CreateParallelBracket = (
  options: ParallelBracketCreateInput & BracketCollectionOptions,
) => Promise<Bracket>;
type GetAccessibleParallelBracket = (options: ParallelBracketAccessibleOptions) => Promise<Bracket>;
type GetAggregateResults = (options: ParallelBracketAccessibleOptions) => Promise<Record<string, unknown>>;
type GetFeaturedTeaserMatchups = (options: BracketFeaturedOptions) => Promise<Array<Record<string, unknown>>>;
type GetStatusCounts = (options: BracketCollectionOptions) => Promise<Partial<Record<BracketStatus, number>>>;
type ListAccessibleParallelBrackets = (options: ParallelBracketAccessibleListOptions) => Promise<Bracket[]>;
type ListParallelBrackets = (options: BracketCollectionOptions & ParallelBracketListOptions) => Promise<BracketList>;
type ListPublicParallelBrackets = (options: ParallelBracketPublicListOptions) => Promise<Bracket[]>;
type OpenParticipantBracket = (options: ParallelParticipantOpenOptions) => Promise<{ tournamentId: string }>;
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

const getAccessibleParallelBracket: GetAccessibleParallelBracket = (options) =>
  getAccessibleParallelBracketRecord({
    parallelTournamentId: options.parallelBracketId,
    userId: options.userId ?? null,
    anonymousVoterToken: options.anonymousVoterToken ?? null,
  });

const openParticipantBracket: OpenParticipantBracket = (options) =>
  openParticipantBracketRecord({
    parallelTournamentId: options.parallelBracketId,
    userId: options.userId ?? null,
    anonymousVoterToken: options.anonymousVoterToken ?? null,
  });

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
    listAccessibleBrackets: (options) => listAccessibleParallelBrackets(options),
    listPublicBrackets: (options = {}) => listPublicParallelBrackets(options),
    openParticipantBracket,
    canInspectAllParticipants,
    filterVisibleParticipants,
  };
}
