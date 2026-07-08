import { getDb } from "@/lib/db";
import { getTournamentByShareToken } from "@/lib/data/tournaments";

export async function getShareLinkTarget({ token, userId }) {
  try {
    const standard = await getTournamentByShareToken({ token, userId });
    return {
      ...standard,
      bracketType: "standard",
      votePath: `/vote?tournament=${standard.tournamentId}`,
      resultsPath: `/results/${standard.tournamentId}`
    };
  } catch (error) {
    if (error.message !== "NOT_FOUND") {
      throw error;
    }
  }

  const sql = getDb();

  return sql.begin(async (tx) => {
    const [record] = await tx`
      select
        s.id as "shareLinkId",
        s.active,
        pt.id as "parallelTournamentId",
        pt.title,
        pt.status,
        pt.sharing_mode as "sharingMode",
        pt.source_pool_id as "sourcePoolId",
        p.name as "sourcePoolName",
        pt.creator_user_id as "creatorUserId",
        creator.name as "creatorName",
        creator.email as "creatorEmail",
        coalesce(pool_size."entryCount", 0)::integer as "entryCount"
      from share_link s
      join parallel_tournament pt on pt.id = s.parallel_tournament_id
      join app_user creator on creator.id = pt.creator_user_id
      left join candidate_pool p on p.id = pt.source_pool_id
      left join lateral (
        select count(*)::integer as "entryCount"
        from candidate_pool_item item
        where item.pool_id = pt.source_pool_id
      ) pool_size on true
      where s.token = ${token}
      limit 1
    `;

    if (!record || record.sharingMode !== "with_friends") {
      throw new Error("NOT_FOUND");
    }

    const [participant] = await tx`
      select
        id,
        status,
        tournament_id as "tournamentId"
      from parallel_tournament_participant
      where parallel_tournament_id = ${record.parallelTournamentId}
        and user_id = ${userId}
      limit 1
    `;

    const isCreator = record.creatorUserId === userId;
    let participantStatus = participant?.status || null;
    let joined = Boolean(participant) || isCreator;
    let accessState = "waiting";

    if (
      !isCreator &&
      record.active &&
      (record.status === "draft" || record.status === "active")
    ) {
      if (!participant) {
        const participantStatusForState = record.status === "active" ? "active" : "invited";
        const [createdParticipant] = await tx`
          insert into parallel_tournament_participant (
            parallel_tournament_id,
            user_id,
            status
          )
          values (${record.parallelTournamentId}, ${userId}, ${participantStatusForState})
          on conflict do nothing
          returning id, status
        `;

        participantStatus = createdParticipant?.status || participantStatusForState;
      }

      joined = true;
      accessState = record.status === "active" ? "active" : "waiting";
    } else if (!isCreator && !participant) {
      accessState = record.active ? "not_invited" : "link_inactive";
    } else if (record.status === "active") {
      accessState = "active";
    } else if (record.status === "complete") {
      accessState = "complete";
    } else if (!record.active) {
      accessState = "link_inactive";
    }

    return {
      parallelTournamentId: record.parallelTournamentId,
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
      inviteStatus: participantStatus,
      accessState,
      bracketType: "parallel_parent",
      votePath: `/vote?parallelTournament=${record.parallelTournamentId}`,
      resultsPath: `/results/${record.parallelTournamentId}`
    };
  });
}
