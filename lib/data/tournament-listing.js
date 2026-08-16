import { getDb } from "@/lib/db";
import { getParallelTournamentSchemaSupport } from "@/lib/data/tournament-schema-support";

export async function getTournamentStatusCounts({ creatorUserId }) {
  const sql = getDb();
  const { hasParentParallelTournamentId } = await getParallelTournamentSchemaSupport(sql);
  const rows = await sql`
    select t.status, count(*)::integer as count
    from tournament t
    where t.creator_user_id = ${creatorUserId}
      and t.archived_at is null
      ${hasParentParallelTournamentId ? sql`and t.parent_parallel_tournament_id is null` : sql``}
    group by t.status
  `;
  return Object.fromEntries(rows.map((row) => [row.status, Number(row.count)]));
}
export async function listTournaments({ creatorUserId, status = null, limit = 24, offset = 0 }) {
  const sql = getDb();
  const { hasParentParallelTournamentId } = await getParallelTournamentSchemaSupport(sql);

  const rows = await sql`
    select
      t.id,
      t.title,
      t.description,
      t.source_pool_id as "sourcePoolId",
      p.name as "sourcePoolName",
      t.sharing_mode as "sharingMode",
      t.visibility,
      t.voting_access as "votingAccess",
      t.play_style as "playStyle",
      t.result_mode as "resultMode",
      t.tie_break_mode as "tieBreakMode",
      t.advancement_mode as "advancementMode",
      t.status,
      t.round_closure_mode as "roundClosureMode",
      t.seeding_structure as "seedingStructure",
      t.parent_parallel_tournament_id as "parentParallelTournamentId",
      t.last_vote_at as "lastVoteAt",
      t.started_at as "startedAt",
      t.completed_at as "completedAt",
      t.archived_at as "archivedAt",
      t.created_at as "createdAt",
      t.updated_at as "updatedAt",
      count(e.id)::integer as "entryCount",
      active_round."activeRoundNumber",
      coalesce(active_round."openMatchCount", 0)::integer as "activeRoundOpenMatchCount",
      coalesce(open_votes."openVoteCount", 0)::integer as "openVoteCount",
      coalesce(ranked_winner.id, winner.id) as "winnerEntryId",
      coalesce(ranked_winner.name, winner.name) as "winnerName",
      coalesce(ranked_winner.seed, winner.seed) as "winnerSeed",
      coalesce(ranked_winner.image_url, winner.image_url) as "winnerImageUrl"
    from tournament t
    left join candidate_pool p on p.id = t.source_pool_id
    left join tournament_entry e on e.tournament_id = t.id
    left join lateral (
      select
        r.sequence_number::integer as "activeRoundNumber",
        count(*) filter (where m.status = 'open')::integer as "openMatchCount"
      from tournament_round r
      join match m on m.round_id = r.id
      where r.tournament_id = t.id
        and r.status = 'active'
      group by r.id, r.sequence_number
      order by r.sequence_number desc
      limit 1
    ) active_round on true
    left join lateral (
      select count(*)::integer as "openVoteCount"
      from match m
      left join vote user_vote
        on user_vote.match_id = m.id
       and user_vote.user_id = ${creatorUserId}
      where m.tournament_id = t.id
        and m.status = 'open'
        and user_vote.id is null
    ) open_votes on true
    left join lateral (
      select
        ranked_entry.id,
        ranked_entry.seed,
        ranked_candidate.name,
        ranked_candidate.image_url
      from tournament_entry ranked_entry
      join candidate ranked_candidate on ranked_candidate.id = ranked_entry.candidate_id
      where ranked_entry.tournament_id = t.id
        and ranked_entry.final_rank = 1
      limit 1
    ) ranked_winner on true
    left join lateral (
      select
        winner_entry.id,
        winner_entry.seed,
        winner_candidate.name,
        winner_candidate.image_url
      from tournament_round r
      join match m on m.round_id = r.id
      join tournament_entry winner_entry on winner_entry.id = m.winner_entry_id
      join candidate winner_candidate on winner_candidate.id = winner_entry.candidate_id
      where r.tournament_id = t.id
      order by r.sequence_number desc, m.created_at desc
      limit 1
      ) winner on true
      where t.creator_user_id = ${creatorUserId}
        ${
          hasParentParallelTournamentId
            ? sql`and t.parent_parallel_tournament_id is null`
            : sql``
        }
        and t.archived_at is null
        ${status ? sql`and t.status = ${status}` : sql``}
    group by
      t.id,
      p.name,
      active_round."activeRoundNumber",
      active_round."openMatchCount",
      open_votes."openVoteCount",
      ranked_winner.id,
      ranked_winner.name,
      ranked_winner.seed,
      ranked_winner.image_url,
      winner.id,
      winner.name,
      winner.seed,
      winner.image_url
    order by
      case t.status
        when 'active' then 0
        when 'draft' then 1
        else 2
      end,
      t.created_at desc
    limit ${limit + 1}
    offset ${offset}
  `;

  return { items: rows.slice(0, limit), hasNextPage: rows.length > limit };
}

export async function listAccessibleTournaments({ userId, statuses = null, limit = 24, offset = 0 }) {
  const sql = getDb();
  const { hasParentParallelTournamentId } = await getParallelTournamentSchemaSupport(sql);

  return sql`
    select
      t.id,
      t.title,
      t.description,
      t.source_pool_id as "sourcePoolId",
      p.name as "sourcePoolName",
      t.sharing_mode as "sharingMode",
      t.visibility,
      t.voting_access as "votingAccess",
      t.play_style as "playStyle",
      t.result_mode as "resultMode",
      t.tie_break_mode as "tieBreakMode",
      t.advancement_mode as "advancementMode",
      t.status,
      t.round_closure_mode as "roundClosureMode",
      t.seeding_structure as "seedingStructure",
      t.parent_parallel_tournament_id as "parentParallelTournamentId",
      t.last_vote_at as "lastVoteAt",
      t.started_at as "startedAt",
      t.completed_at as "completedAt",
      t.archived_at as "archivedAt",
      t.created_at as "createdAt",
      t.updated_at as "updatedAt",
      count(e.id)::integer as "entryCount",
      coalesce(ranked_winner.id, winner.id) as "winnerEntryId",
      coalesce(ranked_winner.name, winner.name) as "winnerName",
      coalesce(ranked_winner.seed, winner.seed) as "winnerSeed",
      coalesce(ranked_winner.image_url, winner.image_url) as "winnerImageUrl"
    from tournament t
    left join candidate_pool p on p.id = t.source_pool_id
    left join tournament_entry e on e.tournament_id = t.id
    left join tournament_invite invite
      on invite.tournament_id = t.id
     and invite.user_id = ${userId}
    left join lateral (
      select
        ranked_entry.id,
        ranked_entry.seed,
        ranked_candidate.name,
        ranked_candidate.image_url
      from tournament_entry ranked_entry
      join candidate ranked_candidate on ranked_candidate.id = ranked_entry.candidate_id
      where ranked_entry.tournament_id = t.id
        and ranked_entry.final_rank = 1
      limit 1
    ) ranked_winner on true
    left join lateral (
      select
        winner_entry.id,
        winner_entry.seed,
        winner_candidate.name,
        winner_candidate.image_url
      from tournament_round r
      join match m on m.round_id = r.id
      join tournament_entry winner_entry on winner_entry.id = m.winner_entry_id
      join candidate winner_candidate on winner_candidate.id = winner_entry.candidate_id
      where r.tournament_id = t.id
      order by r.sequence_number desc, m.created_at desc
      limit 1
      ) winner on true
      where t.archived_at is null
        ${
          hasParentParallelTournamentId
            ? sql`and t.parent_parallel_tournament_id is null`
            : sql``
        }
        ${statuses ? sql`and t.status in ${sql(statuses)}` : sql``}
        and (
          t.creator_user_id = ${userId}
          or invite.user_id is not null
      )
    group by
      t.id,
      p.name,
      ranked_winner.id,
      ranked_winner.name,
      ranked_winner.seed,
      ranked_winner.image_url,
      winner.id,
      winner.name,
      winner.seed,
      winner.image_url
    order by
      case t.status
        when 'active' then 0
        when 'draft' then 1
        else 2
      end,
      t.created_at desc
    limit ${limit}
    offset ${offset}
  `;
}

export async function listPublicTournaments({ statuses = ["active", "complete"], limit = 12, offset = 0 }) {
  const sql = getDb();
  const { hasParentParallelTournamentId } = await getParallelTournamentSchemaSupport(sql);

  return sql`
    select
      t.id,
      t.title,
      t.description,
      t.source_pool_id as "sourcePoolId",
      p.name as "sourcePoolName",
      t.sharing_mode as "sharingMode",
      t.visibility,
      t.voting_access as "votingAccess",
      t.play_style as "playStyle",
      t.result_mode as "resultMode",
      t.tie_break_mode as "tieBreakMode",
      t.advancement_mode as "advancementMode",
      t.status,
      t.round_closure_mode as "roundClosureMode",
      t.seeding_structure as "seedingStructure",
      t.parent_parallel_tournament_id as "parentParallelTournamentId",
      t.last_vote_at as "lastVoteAt",
      t.started_at as "startedAt",
      t.completed_at as "completedAt",
      t.archived_at as "archivedAt",
      t.created_at as "createdAt",
      t.updated_at as "updatedAt",
      count(e.id)::integer as "entryCount",
      coalesce(active_round."activeRoundNumber", 0)::integer as "activeRoundNumber",
      coalesce(active_round."openMatchCount", 0)::integer as "activeRoundOpenMatchCount",
      coalesce(ranked_winner.id, winner.id) as "winnerEntryId",
      coalesce(ranked_winner.name, winner.name) as "winnerName",
      coalesce(ranked_winner.seed, winner.seed) as "winnerSeed",
      coalesce(ranked_winner.image_url, winner.image_url) as "winnerImageUrl"
    from tournament t
    left join candidate_pool p on p.id = t.source_pool_id
    left join tournament_entry e on e.tournament_id = t.id
    left join lateral (
      select
        r.sequence_number::integer as "activeRoundNumber",
        count(*) filter (where m.status = 'open')::integer as "openMatchCount"
      from tournament_round r
      join match m on m.round_id = r.id
      where r.tournament_id = t.id
        and r.status = 'active'
      group by r.id, r.sequence_number
      order by r.sequence_number desc
      limit 1
    ) active_round on true
    left join lateral (
      select
        ranked_entry.id,
        ranked_entry.seed,
        ranked_candidate.name,
        ranked_candidate.image_url
      from tournament_entry ranked_entry
      join candidate ranked_candidate on ranked_candidate.id = ranked_entry.candidate_id
      where ranked_entry.tournament_id = t.id
        and ranked_entry.final_rank = 1
      limit 1
    ) ranked_winner on true
    left join lateral (
      select
        winner_entry.id,
        winner_entry.seed,
        winner_candidate.name,
        winner_candidate.image_url
      from tournament_round r
      join match m on m.round_id = r.id
      join tournament_entry winner_entry on winner_entry.id = m.winner_entry_id
      join candidate winner_candidate on winner_candidate.id = winner_entry.candidate_id
      where r.tournament_id = t.id
      order by r.sequence_number desc, m.created_at desc
      limit 1
      ) winner on true
      where t.archived_at is null
        ${
          hasParentParallelTournamentId
            ? sql`and t.parent_parallel_tournament_id is null`
            : sql``
        }
        and t.visibility = 'public_listed'
        and t.status in ${sql(statuses)}
    group by
      t.id,
      p.name,
      active_round."activeRoundNumber",
      active_round."openMatchCount",
      ranked_winner.id,
      ranked_winner.name,
      ranked_winner.seed,
      ranked_winner.image_url,
      winner.id,
      winner.name,
      winner.seed,
      winner.image_url
    order by
      case t.status
        when 'active' then 0
        else 1
      end,
      coalesce(t.last_vote_at, t.updated_at) desc,
      t.created_at desc
    limit ${limit}
    offset ${offset}
  `;
}

export async function getFeaturedPublicMatchups({
  userId = null,
  anonymousVoterToken = null,
  limit = 6
}) {
  const sql = getDb();
  const { hasParentParallelTournamentId } = await getParallelTournamentSchemaSupport(sql);
  const typedUserId = userId ?? null;
  const typedAnonymousVoterToken = anonymousVoterToken ?? null;

  return sql`
    with ranked_matches as (
      select
        t.id as "tournamentId",
        t.title as "tournamentTitle",
        t.description as "tournamentDescription",
        t.voting_access as "votingAccess",
        r.sequence_number::integer as "roundNumber",
        m.id as "matchId",
        left_entry.id as "leftEntryId",
        left_entry.seed as "leftSeed",
        left_candidate.name as "leftName",
        left_candidate.image_url as "leftImageUrl",
        right_entry.id as "rightEntryId",
        right_entry.seed as "rightSeed",
        right_candidate.name as "rightName",
        right_candidate.image_url as "rightImageUrl",
        (user_vote.id is not null) as "hasUserVote",
        coalesce(t.last_vote_at, t.updated_at) as "activityAt",
        row_number() over (
          partition by t.id
          order by
            (user_vote.id is not null) asc,
            left_entry.seed asc,
            right_entry.seed desc,
            m.created_at asc
        ) as "tournamentMatchRank"
      from tournament t
      join tournament_round r
        on r.tournament_id = t.id
       and r.status = 'active'
      join match m
        on m.round_id = r.id
       and m.status = 'open'
      join tournament_entry left_entry on left_entry.id = m.left_entry_id
      join candidate left_candidate on left_candidate.id = left_entry.candidate_id
      join tournament_entry right_entry on right_entry.id = m.right_entry_id
      join candidate right_candidate on right_candidate.id = right_entry.candidate_id
      left join vote user_vote
        on user_vote.match_id = m.id
       and (
         (${typedUserId}::uuid is not null and user_vote.user_id = ${typedUserId}::uuid)
         or (
           ${typedAnonymousVoterToken}::text is not null
           and user_vote.anonymous_voter_token = ${typedAnonymousVoterToken}::text
         )
        )
        where t.archived_at is null
          ${
            hasParentParallelTournamentId
              ? sql`and t.parent_parallel_tournament_id is null`
              : sql``
          }
          and t.visibility = 'public_listed'
          and t.status = 'active'
    )
    select
      "tournamentId",
      "tournamentTitle",
      "tournamentDescription",
      "votingAccess",
      "roundNumber",
      "matchId",
      "leftEntryId",
      "leftSeed",
      "leftName",
      "leftImageUrl",
      "rightEntryId",
      "rightSeed",
      "rightName",
      "rightImageUrl",
      "hasUserVote"
    from ranked_matches
    where "tournamentMatchRank" = 1
    order by
      "hasUserVote" asc,
      "activityAt" desc,
      "roundNumber" asc,
      "leftSeed" asc,
      "rightSeed" desc
    limit ${limit}
  `;
}

export async function getFeaturedPublicMatchupsForHomepage({ limit = 6 } = {}) {
  const sql = getDb();
  const { hasParentParallelTournamentId } = await getParallelTournamentSchemaSupport(sql);

  return sql`
    with ranked_matches as (
      select
        t.id as "tournamentId",
        t.title as "tournamentTitle",
        t.description as "tournamentDescription",
        t.voting_access as "votingAccess",
        r.sequence_number::integer as "roundNumber",
        m.id as "matchId",
        left_entry.id as "leftEntryId",
        left_entry.seed as "leftSeed",
        left_candidate.name as "leftName",
        left_candidate.image_url as "leftImageUrl",
        right_entry.id as "rightEntryId",
        right_entry.seed as "rightSeed",
        right_candidate.name as "rightName",
        right_candidate.image_url as "rightImageUrl",
        coalesce(t.last_vote_at, t.updated_at) as "activityAt",
        row_number() over (
          partition by t.id
          order by
            left_entry.seed asc,
            right_entry.seed desc,
            m.created_at asc
        ) as "tournamentMatchRank"
      from tournament t
      join tournament_round r
        on r.tournament_id = t.id
       and r.status = 'active'
      join match m
        on m.round_id = r.id
       and m.status = 'open'
      join tournament_entry left_entry on left_entry.id = m.left_entry_id
      join candidate left_candidate on left_candidate.id = left_entry.candidate_id
        join tournament_entry right_entry on right_entry.id = m.right_entry_id
        join candidate right_candidate on right_candidate.id = right_entry.candidate_id
        where t.archived_at is null
          ${
            hasParentParallelTournamentId
              ? sql`and t.parent_parallel_tournament_id is null`
              : sql``
          }
          and t.visibility = 'public_listed'
          and t.status = 'active'
    )
    select
      "tournamentId",
      "tournamentTitle",
      "tournamentDescription",
      "votingAccess",
      "roundNumber",
      "matchId",
      "leftEntryId",
      "leftSeed",
      "leftName",
      "leftImageUrl",
      "rightEntryId",
      "rightSeed",
      "rightName",
      "rightImageUrl",
      false as "hasUserVote"
    from ranked_matches
    where "tournamentMatchRank" = 1
    order by
      "activityAt" desc,
      "roundNumber" asc,
      "leftSeed" asc,
      "rightSeed" desc
    limit ${limit}
  `;
}

