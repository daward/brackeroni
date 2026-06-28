import { z } from "zod";

export const adminVisibilityUpdateSchema = z.object({
  visibility: z.enum(["private", "public_listed", "public_unlisted"])
});
