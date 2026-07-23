import { z } from "zod";

export const matchWinnerUpdateSchema = z.object({
  winnerEntryId: z.string().uuid().nullable()
});
