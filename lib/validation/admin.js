import { z } from "zod";

export const adminVisibilityUpdateSchema = z.object({
  visibility: z.enum(["private", "public_listed", "public_unlisted"])
});

export const adminPoolUpdateSchema = z
  .object({
    visibility: z.enum(["private", "public_listed", "public_unlisted"]).optional(),
    featuredOnHome: z.boolean().optional()
  })
  .refine((value) => value.visibility !== undefined || value.featuredOnHome !== undefined, {
    message: "At least one admin pool change is required."
  });
