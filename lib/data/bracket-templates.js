import { getDb } from "@/lib/db";

function buildStandardTemplate() {
  const slots = Array.from({ length: 16 }, (_, index) => ({
    id: `builtin-standard-slot-${index + 1}`,
    seed: index + 1,
    subSeed: 0,
    tag: null,
    templateSlot: index
  }));

  return {
    id: "builtin-standard",
    builtInKey: "standard",
    name: "Standard",
    description: "One bracket. Normal seed pairing. Move teams into the slots you want.",
    isBuiltIn: true,
    createdAt: null,
    updatedAt: null,
    subBrackets: [
      {
        id: "builtin-standard-main",
        name: "Main bracket",
        tag: null,
        slotCount: 16,
        feedOrder: 1,
        displayOrder: 0,
        slots
      }
    ]
  };
}

function buildNcaaRegion(regionName, displayOrder) {
  const baseSlots = Array.from({ length: 16 }, (_, index) => ({
    id: `builtin-ncaa-${regionName.toLowerCase()}-${index + 1}`,
    seed: index + 1,
    subSeed: 0,
    tag: regionName,
    templateSlot: index
  }));

  if (regionName === "South") {
    baseSlots.push({
      id: "builtin-ncaa-south-16a",
      seed: 16,
      subSeed: 1,
      tag: "South",
      templateSlot: 16
    });
  }

  if (regionName === "West") {
    baseSlots.push({
      id: "builtin-ncaa-west-11a",
      seed: 11,
      subSeed: 1,
      tag: "West",
      templateSlot: 16
    });
  }

  return {
    id: `builtin-ncaa-${regionName.toLowerCase()}`,
    name: `${regionName} region`,
    tag: regionName,
    slotCount: 16,
    feedOrder: displayOrder + 1,
    displayOrder,
    slots: baseSlots
  };
}

function buildNcaaTemplate() {
  return {
    id: "builtin-ncaa",
    builtInKey: "ncaa",
    name: "NCAA",
    description: "Four seeded regions with optional play-in slots that share a seed.",
    isBuiltIn: true,
    createdAt: null,
    updatedAt: null,
    subBrackets: ["East", "West", "South", "Midwest"].map((regionName, index) =>
      buildNcaaRegion(regionName, index)
    )
  };
}

function normalizeTemplateRows(rows) {
  const templates = [];
  const templateMap = new Map();

  for (const row of rows) {
    let template = templateMap.get(row.id);

    if (!template) {
      template = {
        id: row.id,
        builtInKey: row.builtInKey,
        name: row.name,
        description: row.description,
        isBuiltIn: false,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        subBrackets: []
      };
      templateMap.set(row.id, template);
      templates.push(template);
    }

    if (!row.subBracketId) {
      continue;
    }

    let subBracket = template.subBrackets.find((item) => item.id === row.subBracketId);

    if (!subBracket) {
      subBracket = {
        id: row.subBracketId,
        name: row.subBracketName,
        tag: row.subBracketTag,
        slotCount: row.slotCount,
        feedOrder: row.feedOrder,
        displayOrder: row.displayOrder,
        slots: []
      };
      template.subBrackets.push(subBracket);
    }

    if (!row.slotId) {
      continue;
    }

    subBracket.slots.push({
      id: row.slotId,
      seed: row.seed,
      subSeed: row.subSeed,
      tag: row.slotTag,
      templateSlot: row.templateSlot
    });
  }

  for (const template of templates) {
    template.subBrackets.sort((left, right) => left.displayOrder - right.displayOrder);

    for (const subBracket of template.subBrackets) {
      subBracket.slots.sort((left, right) => left.templateSlot - right.templateSlot);
    }
  }

  return templates;
}

export async function listBracketTemplates({ userId }) {
  const sql = getDb();
  const rows = await sql`
    select
      t.id,
      t.name,
      t.description,
      t.built_in_key as "builtInKey",
      t.created_at as "createdAt",
      t.updated_at as "updatedAt",
      sb.id as "subBracketId",
      sb.name as "subBracketName",
      sb.tag as "subBracketTag",
      sb.slot_count as "slotCount",
      sb.feed_order as "feedOrder",
      sb.display_order as "displayOrder",
      slot.id as "slotId",
      slot.seed,
      slot.subseed as "subSeed",
      slot.tag as "slotTag",
      slot.template_slot as "templateSlot"
    from bracket_template t
    left join bracket_template_sub_bracket sb
      on sb.template_id = t.id
    left join bracket_template_slot slot
      on slot.sub_bracket_id = sb.id
    where t.creator_user_id = ${userId}
      and t.archived_at is null
    order by lower(t.name), sb.display_order asc, slot.template_slot asc
  `;

  return {
    builtIn: [buildStandardTemplate(), buildNcaaTemplate()],
    user: normalizeTemplateRows(rows)
  };
}

export async function createBracketTemplate({ creatorUserId, name, description, subBrackets }) {
  const sql = getDb();

  return sql.begin(async (tx) => {
    const [template] = await tx`
      insert into bracket_template (
        creator_user_id,
        name,
        description
      )
      values (
        ${creatorUserId},
        ${name},
        ${description ?? null}
      )
      returning
        id,
        name,
        description,
        built_in_key as "builtInKey",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const savedSubBrackets = [];

    for (const subBracket of subBrackets) {
      const [savedSubBracket] = await tx`
        insert into bracket_template_sub_bracket (
          template_id,
          name,
          tag,
          slot_count,
          feed_order,
          display_order
        )
        values (
          ${template.id},
          ${subBracket.name},
          ${subBracket.tag ?? null},
          ${subBracket.slotCount},
          ${subBracket.feedOrder},
          ${subBracket.displayOrder}
        )
        returning
          id,
          name,
          tag,
          slot_count as "slotCount",
          feed_order as "feedOrder",
          display_order as "displayOrder"
      `;

      for (const slot of subBracket.slots) {
        await tx`
          insert into bracket_template_slot (
            sub_bracket_id,
            seed,
            subseed,
            tag,
            template_slot
          )
          values (
            ${savedSubBracket.id},
            ${slot.seed},
            ${slot.subSeed ?? 0},
            ${slot.tag ?? null},
            ${slot.templateSlot}
          )
        `;
      }

      savedSubBrackets.push({
        ...savedSubBracket,
        slots: subBracket.slots
      });
    }

    return {
      ...template,
      isBuiltIn: false,
      subBrackets: savedSubBrackets
    };
  });
}

export async function updateBracketTemplate({
  templateId,
  creatorUserId,
  name,
  description,
  subBrackets,
  archive = false
}) {
  const sql = getDb();

  return sql.begin(async (tx) => {
    const [existingTemplate] = await tx`
      select id
      from bracket_template
      where id = ${templateId}
        and creator_user_id = ${creatorUserId}
        and archived_at is null
      limit 1
    `;

    if (!existingTemplate) {
      throw new Error("NOT_FOUND");
    }

    if (archive) {
      await tx`
        update bracket_template
        set archived_at = now(),
            updated_at = now()
        where id = ${templateId}
      `;

      return null;
    }

    await tx`
      update bracket_template
      set name = ${name},
          description = ${description ?? null},
          updated_at = now()
      where id = ${templateId}
    `;

    await tx`
      delete from bracket_template_sub_bracket
      where template_id = ${templateId}
    `;

    for (const subBracket of subBrackets) {
      const [savedSubBracket] = await tx`
        insert into bracket_template_sub_bracket (
          template_id,
          name,
          tag,
          slot_count,
          feed_order,
          display_order
        )
        values (
          ${templateId},
          ${subBracket.name},
          ${subBracket.tag ?? null},
          ${subBracket.slotCount},
          ${subBracket.feedOrder},
          ${subBracket.displayOrder}
        )
        returning id
      `;

      for (const slot of subBracket.slots) {
        await tx`
          insert into bracket_template_slot (
            sub_bracket_id,
            seed,
            subseed,
            tag,
            template_slot
          )
          values (
            ${savedSubBracket.id},
            ${slot.seed},
            ${slot.subSeed ?? 0},
            ${slot.tag ?? null},
            ${slot.templateSlot}
          )
        `;
      }
    }

    const [row] = await tx`
      select
        id,
        name,
        description,
        built_in_key as "builtInKey",
        created_at as "createdAt",
        updated_at as "updatedAt"
      from bracket_template
      where id = ${templateId}
    `;

    return {
      ...row,
      isBuiltIn: false,
      subBrackets
    };
  });
}

