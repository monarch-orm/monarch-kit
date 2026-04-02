import { log } from "@clack/prompts";
import { command, flag } from "commandstruct";
import type { ProgramFlags } from ".";
import { loadDb } from "./utils/db";

export const initCmd = command("init")
  .describe("Initialize collections, indexes, and validation")
  .programFlags<ProgramFlags>()
  .flags({
    collection: flag("collections to initialize").char("c").optionalParam("array"),
    indexes: flag("sync indexes"),
    validation: flag("sync validation rules"),
  })
  .action(async ({ flags }, box) => {
    const { db } = await loadDb(box, flags.config);
    const collections = flags.collection?.length ? flags.collection : db.listCollections();

    await db.initialize({
      indexes: flags.indexes,
      validation: flags.validation,
      collections: Object.fromEntries(collections.map((name) => [name, true])),
    });

    log.success(
      `Initialized ${collections.join(", ")}${flags.indexes || flags.validation ? " with sync options" : ""}`,
    );
  });
