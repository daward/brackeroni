import postgres from "postgres";
import { loadLocalEnv } from "./load-env.mjs";

loadLocalEnv();

const PREFIX = "Completed card fixture ";
const POOL_NAME = "Local completed-card fixtures";
const CANDIDATE_PREFIX = "Completed card fixture candidate ";

const FIXTURES = [
  ["Best Movie Soundtracks", "The Good, the Bad and the Ugly", "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=85"],
  ["Greatest City Parks", "Golden Gate Park", "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=1200&q=85"],
  ["Weekend Breakfasts", "Shakshuka", "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1200&q=85"],
  ["National Parks", "Zion", "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=85"],
  ["Best Bookstores", "Powell's City of Books", "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=85"],
  ["Classic Board Games", "Ticket to Ride", "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=1200&q=85"],
  ["Summer Cocktails", "Mojito", "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=1200&q=85"],
  ["Coastal Day Trips", "Big Sur", "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85"],
  ["Best Museum Wings", "Modern Art", "https://images.unsplash.com/photo-1564399579883-451a5d44ec08?auto=format&fit=crop&w=1200&q=85"],
  ["Dogs of the Internet", "Mochi", "https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=1200&q=85"],
  ["Favorite Train Rides", "The Coast Starlight", "https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=1200&q=85"],
  ["Best Pizza Styles", "Detroit Style", "https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=1200&q=85"]
];

function assertLocalDatabase() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set.");
  const hostname = new URL(process.env.DATABASE_URL).hostname;
  if (!["localhost", "127.0.0.1", "::1"].includes(hostname)) {
    throw new Error("Completed-bracket fixtures only run against local PostgreSQL.");
  }
}

async function getCurrentLocalUser(sql) {
  const email = process.env.DEV_USER_EMAIL;
  const [user] = email
    ? await sql`select id from app_user where email = ${email} limit 1`
    : await sql`select id from app_user order by updated_at desc, created_at desc limit 1`;
  if (!user) throw new Error("Open the local app once first so a local app user exists.");
  return user;
}

async function clearFixtures(sql, userId) {
  const deletedTournaments = await sql`
    delete from tournament
    where creator_user_id = ${userId}
      and (
        title like ${`${PREFIX}%`}
        or description like 'Local-only completed fixture %'
      )
  `;

  await sql`
    delete from candidate_pool
    where creator_user_id = ${userId}
      and name = ${POOL_NAME}
  `;

  const deletedCandidates = await sql`
    delete from candidate
    where creator_user_id = ${userId}
      and name like ${`${CANDIDATE_PREFIX}%`}
      and not exists (
        select 1 from candidate_pool_item where candidate_pool_item.candidate_id = candidate.id
      )
      and not exists (
        select 1 from tournament_entry where tournament_entry.candidate_id = candidate.id
      )
  `;

  console.log(`Removed ${deletedTournaments.count} completed-card fixtures and ${deletedCandidates.count} fixture candidates.`);
}

async function seedFixtures(sql, userId) {
  await clearFixtures(sql, userId);

  await sql.begin(async (tx) => {
    const [pool] = await tx`
      insert into candidate_pool (creator_user_id, name, description, visibility)
      values (${userId}, ${POOL_NAME}, 'Local-only fixtures for completed-card layout testing.', 'private')
      returning id
    `;

    for (let index = 0; index < 36; index += 1) {
      const [topic, winnerName, imageUrl] = FIXTURES[index % FIXTURES.length];
      const fixtureNumber = String(index + 1).padStart(2, "0");
      const edition = ["Summer Edition", "Crowd Favorites", "Final Round"][Math.floor(index / FIXTURES.length)];
      const title = `${topic} — ${edition}`;
      const completedAt = new Date(Date.now() - (index + 1) * 86_400_000);
      const candidates = [winnerName, `${topic} Runner-up`, `${topic} Wildcard`, `${topic} Fan Favorite`];
      const entries = [];

      for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
        const [candidate] = await tx`
          insert into candidate (creator_user_id, name, description, image_url)
          values (
            ${userId},
            ${`${CANDIDATE_PREFIX}${fixtureNumber} / ${candidateIndex + 1} — ${candidates[candidateIndex]}`},
            ${`Local completed-card fixture contender for ${topic}.`},
            ${candidateIndex === 0 ? imageUrl : null}
          )
          returning id
        `;
        entries.push(candidate);
        await tx`
          insert into candidate_pool_item (pool_id, candidate_id, display_order)
          values (${pool.id}, ${candidate.id}, ${candidateIndex})
        `;
      }

      const resultMode = index % 5 === 0 ? 'full_ranking' : index % 5 === 1 ? 'partial_ranking' : 'winner_only';
      const [tournament] = await tx`
        insert into tournament (
          creator_user_id, title, description, source_pool_id, sharing_mode, visibility,
          voting_access, play_style, result_mode, tie_break_mode, advancement_mode,
          status, round_closure_mode, started_at, completed_at, updated_at
        )
        values (
          ${userId}, ${title}, ${`Local-only completed fixture ${fixtureNumber}.`}, ${pool.id},
          'private', 'private', 'signed_in_only',
          ${index % 4 === 0 ? 'reseed' : 'fixed_bracket'}, ${resultMode}, 'higher_seed_wins', 'vote_winner',
          'complete', 'automatic_when_settled', ${completedAt}, ${completedAt}, ${completedAt}
        )
        returning id
      `;

      for (let candidateIndex = 0; candidateIndex < entries.length; candidateIndex += 1) {
        await tx`
          insert into tournament_entry (tournament_id, candidate_id, seed, final_rank)
          values (${tournament.id}, ${entries[candidateIndex].id}, ${candidateIndex + 1}, ${candidateIndex + 1})
        `;
      }
    }
  });

  console.log("Created 36 local-only completed-bracket fixtures. Remove them with npm run db:seed-completed:clear.");
}

async function main() {
  assertLocalDatabase();
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  try {
    const user = await getCurrentLocalUser(sql);
    if (process.argv[2] === "clear") {
      await clearFixtures(sql, user.id);
    } else if (process.argv[2]) {
      throw new Error(`Unknown completed-fixture command: ${process.argv[2]}`);
    } else {
      await seedFixtures(sql, user.id);
    }
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});