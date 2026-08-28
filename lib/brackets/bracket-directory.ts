import type {
  Bracket,
  BracketAccessibleListOptions,
  BracketAccessibleOptions,
  BracketCollection,
  BracketCollectionOptions,
  BracketCreateInput,
  BracketDirectory,
  BracketFeaturedOptions,
  BracketList,
  BracketListOptions,
  BracketPublicListOptions,
  BracketShareTokenOptions,
} from "@/lib/brackets/types";

import * as tournamentAccess from "@/lib/brackets/internal/tournament-access";
import * as tournamentListing from "@/lib/brackets/internal/tournament-listing";
import * as tournamentMutations from "@/lib/brackets/internal/tournament-mutations";
import * as tournamentSharing from "@/lib/brackets/internal/tournament-sharing";

type CreateTournament = (options: BracketCreateInput & BracketCollectionOptions) => Promise<Bracket>;
type GetAccessibleTournament = (options: BracketAccessibleOptions) => Promise<Bracket>;
type GetFeaturedMatchups = (options: BracketFeaturedOptions) => Promise<Array<Record<string, unknown>>>;
type GetShareTokenTarget = (options: BracketShareTokenOptions) => Promise<Record<string, unknown>>;
type GetStatusCounts = (options: BracketCollectionOptions) => Promise<Partial<Record<Bracket["status"], number>>>;
type ListAccessibleTournaments = (options: BracketAccessibleListOptions) => Promise<Bracket[]>;
type ListPublicTournaments = (options: BracketPublicListOptions) => Promise<Bracket[]>;
type ListTournaments = (options: BracketCollectionOptions & BracketListOptions) => Promise<BracketList>;

const createTournament = tournamentMutations.createTournament as unknown as CreateTournament;
const getAccessibleTournamentById = tournamentAccess.getAccessibleTournamentById as unknown as GetAccessibleTournament;
const getFeaturedPublicMatchups = tournamentListing.getFeaturedPublicMatchups as unknown as GetFeaturedMatchups;
const getFeaturedPublicMatchupsForHomepage =
  tournamentListing.getFeaturedPublicMatchupsForHomepage as unknown as GetFeaturedMatchups;
const getTournamentByShareToken = tournamentSharing.getTournamentByShareToken as unknown as GetShareTokenTarget;
const getTournamentStatusCounts = tournamentListing.getTournamentStatusCounts as unknown as GetStatusCounts;
const listAccessibleTournaments = tournamentListing.listAccessibleTournaments as unknown as ListAccessibleTournaments;
const listPublicTournaments = tournamentListing.listPublicTournaments as unknown as ListPublicTournaments;
const listTournaments = tournamentListing.listTournaments as unknown as ListTournaments;

export function brackets({ creatorUserId }: BracketCollectionOptions): BracketCollection {
  return {
    list: (options = {}) =>
      listTournaments({
        creatorUserId,
        ...options,
      }),
    statusCounts: () => getTournamentStatusCounts({ creatorUserId }),
    create: (input) =>
      createTournament({
        creatorUserId,
        ...input,
        description: input.description ?? null,
        sourcePoolId: input.sourcePoolId ?? null,
      }),
  };
}

export function bracketDirectory(): BracketDirectory {
  return {
    getAccessibleTournamentById: (options) =>
      getAccessibleTournamentById({
        ...options,
        userId: options.userId ?? null,
        anonymousVoterToken: options.anonymousVoterToken ?? null,
      }),
    getFeaturedPublicMatchups: (options = {}) => getFeaturedPublicMatchups(options),
    getFeaturedPublicMatchupsForHomepage: (options = {}) => getFeaturedPublicMatchupsForHomepage(options),
    getTournamentByShareToken: (options) =>
      getTournamentByShareToken({
        ...options,
        userId: options.userId ?? null,
      }),
    listAccessibleTournaments: (options) => listAccessibleTournaments(options),
    listPublicTournaments: (options = {}) => listPublicTournaments(options),
  };
}
