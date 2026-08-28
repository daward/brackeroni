import type { SeedingStructure } from "@/lib/brackets/types";

export function parseSeedingStructure(value: unknown): Partial<SeedingStructure> {
  if (!value) {
    return {};
  }

  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed as Partial<SeedingStructure> : {};
    } catch {
      return {};
    }
  }

  return typeof value === "object" ? value as Partial<SeedingStructure> : {};
}
