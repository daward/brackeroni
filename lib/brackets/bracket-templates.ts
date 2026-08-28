import type { BracketTemplateLibrary, BracketTemplateLibraryOptions } from "@/lib/brackets/types";

import {
  createBracketTemplate,
  listBracketTemplates,
  updateBracketTemplate,
} from "@/lib/brackets/internal/bracket-templates";

export function bracketTemplates({ userId }: BracketTemplateLibraryOptions): BracketTemplateLibrary {
  return {
    list: () => listBracketTemplates({ userId }),
    create: (input) =>
      createBracketTemplate({
        creatorUserId: userId,
        ...input,
        description: input.description ?? null,
      }),
    update: ({ templateId, ...patch }) =>
      updateBracketTemplate({
        templateId,
        creatorUserId: userId,
        ...patch,
        description: patch.description ?? null,
      }),
  };
}
