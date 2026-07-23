import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getTournamentById, updateTournamentEntries } from "@/lib/data/tournaments";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";

function uniqueStrings(items = []) {
  return [...new Set(items.filter((value) => typeof value === "string" && value.length > 0))];
}

function normalizeSeedingStructure(structure = {}) {
  const subBrackets = (structure.subBrackets || [])
    .filter((subBracket) => typeof subBracket?.id === "string" && subBracket.id && subBracket.id !== "__root__")
    .map((subBracket, index) => ({
      id: subBracket.id,
      index: Number.isInteger(subBracket.index) ? subBracket.index : index,
      name: typeof subBracket.name === "string" ? subBracket.name : `Sub-bracket ${index + 1}`
    }))
    .sort((left, right) => {
      if (left.index !== right.index) {
        return left.index - right.index;
      }

      return left.id.localeCompare(right.id);
    })
    .map((subBracket, index) => ({
      ...subBracket,
      index
    }));
  const subBracketIds = new Set(subBrackets.map((subBracket) => subBracket.id));
  const entryBrackets = Object.fromEntries(
    Object.entries(structure.entryBrackets || {}).filter(([entryId, bracketId]) => {
      return typeof entryId === "string" && typeof bracketId === "string" && subBracketIds.has(bracketId);
    })
  );

  return {
    subBrackets,
    entryBrackets
  };
}

const tournamentEntriesUpdateSchema = z.object({
  entries: z.array(
    z.object({
      id: z.string().uuid(),
      seed: z.number().int().min(1),
      subSeed: z.number().int().min(0).default(0)
    })
  ).min(2),
  seedingStructure: z.object({
    subBrackets: z.array(
      z.object({
        id: z.string(),
        index: z.number().int().min(0),
        name: z.string()
      })
    ).default([]),
    entryBrackets: z.record(z.string(), z.string()).default({})
  }).default({
    subBrackets: [],
    entryBrackets: {}
  })
});

export const GET = withRouteErrorHandling(async function GET(request, { params }) {
  const user = await getCurrentUser(request);
  const { tournamentId } = await params;
  const tournament = await getTournamentById({
    tournamentId,
    creatorUserId: user.id
  });

  return json({
    items: tournament.entries,
    seedingStructure: tournament.seedingStructure || {}
  });
});

export const PATCH = withRouteErrorHandling(async function PATCH(request, { params }) {
  const user = await getCurrentUser(request);
  const { tournamentId } = await params;
  const body = tournamentEntriesUpdateSchema.parse(await readJson(request));
  const tournament = await updateTournamentEntries({
    tournamentId,
    creatorUserId: user.id,
    entries: body.entries,
    seedingStructure: normalizeSeedingStructure(body.seedingStructure)
  });

  return json({
    items: tournament.entries,
    seedingStructure: tournament.seedingStructure || {}
  });
});
