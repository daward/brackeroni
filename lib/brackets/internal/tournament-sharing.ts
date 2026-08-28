// @ts-nocheck
import { randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";
import { getTournamentById } from "@/lib/brackets/internal/tournament-access";

function createShareToken() {
  return randomBytes(18).toString("base64url");
}

export async function listTournamentInvites({ tournamentId, creatorUserId }) {
  const sql = getDb();
  await getTournamentById({ tournamentId, creatorUserId });

  return sql`
    select
      i.id,
      i.status,
      i.joined_at as "joinedAt",
      u.id as "userId",
      u.name,
      u.email,
      u.image_url as "imageUrl",
      coalesce(active_round."openMatchCount", 0)::integer as "openMatchCount",
      coalesce(invite_progress."votesCast", 0)::integer as "votesCast"
    from tournament_invite i
    join app_user u on u.id = i.user_id
    left join lateral (
      select
        r.id,
        count(*) filter (where m.status = 'open')::integer as "openMatchCount"
      from tournament_round r
      join match m on m.round_id = r.id
      where r.tournament_id = ${tournamentId}
        and r.status = 'active'
      group by r.id, r.sequence_number
      order by r.sequence_number desc
      limit 1
    ) active_round on true
    left join lateral (
      select count(*)::integer as "votesCast"
      from vote v
      join match m on m.id = v.match_id
      where v.user_id = i.user_id
        and m.round_id = active_round.id
    ) invite_progress on true
    where i.tournament_id = ${tournamentId}
    order by i.joined_at asc
  `;
}

export async function listTournamentShareLinks({ tournamentId, creatorUserId }) {
  const sql = getDb();
  await getTournamentById({ tournamentId, creatorUserId });

  return sql`
    select
      id,
      token,
      active,
      created_at as "createdAt",
      updated_at as "updatedAt"
    from share_link
    where tournament_id = ${tournamentId}
    order by created_at desc
  `;
}

export async function ensureTournamentShareLink({ tournamentId, creatorUserId }) {
  const sql = getDb();
  const tournament = await getTournamentById({ tournamentId, creatorUserId });

  if (tournament.sharingMode !== "with_friends") {
    throw new Error("FORBIDDEN");
  }

  const [existing] = await sql`
    select
      id,
      token,
      active,
      created_at as "createdAt",
      updated_at as "updatedAt"
    from share_link
    where tournament_id = ${tournamentId}
      and active = true
    order by created_at desc
    limit 1
  `;

  if (existing) {
    return existing;
  }

  const [created] = await sql`
    insert into share_link (tournament_id, token, active, created_by_user_id)
    values (${tournamentId}, ${createShareToken()}, true, ${creatorUserId})
    returning
      id,
      token,
      active,
      created_at as "createdAt",
      updated_at as "updatedAt"
  `;

  return created;
}

export async function rotateTournamentShareLink({ tournamentId, creatorUserId }) {
  const sql = getDb();
  const tournament = await getTournamentById({ tournamentId, creatorUserId });

  if (tournament.sharingMode !== "with_friends") {
    throw new Error("FORBIDDEN");
  }

  return sql.begin(async (tx) => {
    await tx`
      update share_link
      set
        active = false,
        updated_at = now()
      where tournament_id = ${tournamentId}
        and active = true
    `;

    const [created] = await tx`
      insert into share_link (tournament_id, token, active, created_by_user_id)
      values (${tournamentId}, ${createShareToken()}, true, ${creatorUserId})
      returning
        id,
        token,
        active,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    return created;
  });
}

export async function getTournamentByShareToken({ token, userId }) {
  const sql = getDb();

  return sql.begin(async (tx) => {
    const [record] = await tx`
      select
        s.id as "shareLinkId",
        s.active,
        t.id as "tournamentId",
        t.title,
        t.status,
        t.sharing_mode as "sharingMode",
        t.source_pool_id as "sourcePoolId",
        p.name as "sourcePoolName",
        t.creator_user_id as "creatorUserId",
        creator.name as "creatorName",
        creator.email as "creatorEmail",
        count(e.id)::integer as "entryCount"
      from share_link s
      join tournament t on t.id = s.tournament_id
      join app_user creator on creator.id = t.creator_user_id
      left join candidate_pool p on p.id = t.source_pool_id
      left join tournament_entry e on e.tournament_id = t.id
      where s.token = ${token}
      group by s.id, t.id, p.name, creator.name, creator.email
      limit 1
    `;

    if (!record || record.sharingMode !== "with_friends") {
      throw new Error("NOT_FOUND");
    }

    const [invite] = await tx`
      select
        id,
        status
      from tournament_invite
      where tournament_id = ${record.tournamentId}
        and user_id = ${userId}
      limit 1
    `;

    const isCreator = record.creatorUserId === userId;
    let inviteStatus = invite?.status || null;
    let joined = Boolean(invite) || isCreator;
    let accessState = "waiting";

    if (
      !isCreator &&
      record.active &&
      (record.status === "draft" || record.status === "active")
    ) {
      if (!invite) {
        const inviteStatusForState = record.status === "active" ? "locked" : "pending";
        const [createdInvite] = await tx`
          insert into tournament_invite (tournament_id, user_id, status)
          values (${record.tournamentId}, ${userId}, ${inviteStatusForState})
          on conflict (tournament_id, user_id) do update
            set joined_at = tournament_invite.joined_at
          returning id, status
        `;
        inviteStatus = createdInvite.status;
      }

      joined = true;
      accessState = record.status === "active" ? "active" : "waiting";
    } else if (!isCreator && !invite) {
      accessState = record.active ? "not_invited" : "link_inactive";
    } else if (record.status === "active") {
      accessState = "active";
    } else if (record.status === "complete") {
      accessState = "complete";
    } else if (!record.active) {
      accessState = "link_inactive";
    }

    return {
      tournamentId: record.tournamentId,
      title: record.title,
      status: record.status,
      sharingMode: record.sharingMode,
      sourcePoolId: record.sourcePoolId,
      sourcePoolName: record.sourcePoolName,
      creatorName: record.creatorName,
      creatorEmail: record.creatorEmail,
      entryCount: record.entryCount,
      shareLinkActive: record.active,
      isCreator,
      joined,
      inviteStatus,
      accessState
    };
  });
}

