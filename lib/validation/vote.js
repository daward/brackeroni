import { z } from "zod";

export const voteCreateSchema = z.object({
  selectedEntryId: z.string().uuid()
});
