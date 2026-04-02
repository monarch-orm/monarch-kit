import { log } from "@clack/prompts";
import { arg, command, flag } from "commandstruct";
import { getCollection, loadDb } from "./utils/db";
import { Prompts } from "./utils/prompts";
import type { ProgramFlags } from ".";

export const updateCmd = command("update")
  .describe("Update documents using schema-aware prompts")
  .args({ collection: arg().optional() })
  .programFlags<ProgramFlags>()
  .flags({
    many: flag("update every matching document"),
    yes: flag("skip confirmation"),
  })
  .action(async ({ args, flags }, box) => {
    const { db } = await loadDb(box, flags.config);
    const collectionName = await Prompts.collectionName({ db, initial: args.collection });
    const collection = getCollection(db, collectionName);
    const filter = await Prompts.filter({ collection, purpose: "update" });
    const update = await Prompts.updateDocument({ collection });

    if (!flags.yes) {
      const approved = await Prompts.confirm({
        message: `${flags.many ? "Update all" : "Update one"} matching document${flags.many ? "s" : ""} in ${collectionName}?`,
        initialValue: false,
      });
      if (!approved) {
        log.warn("Update cancelled.");
        return;
      }
    }

    const result = flags.many
      ? await collection.updateMany(filter, update)
      : await collection.updateOne(filter, update);
    log.success(
      `Matched ${result.matchedCount} and modified ${result.modifiedCount} document${result.modifiedCount === 1 ? "" : "s"}`,
    );
  });
