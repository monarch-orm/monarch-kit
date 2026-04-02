import { log } from "@clack/prompts";
import { arg, command, flag } from "commandstruct";
import { getCollection, loadDb } from "./utils/db";
import { Prompts } from "./utils/prompts";
import type { ProgramFlags } from ".";

export const deleteCmd = command("delete")
  .describe("Delete documents using schema-aware filters")
  .args({ collection: arg().optional() })
  .programFlags<ProgramFlags>()
  .flags({
    many: flag("delete every matching document"),
    yes: flag("skip confirmation"),
  })
  .action(async ({ args, flags }, box) => {
    const { db } = await loadDb(box, flags.config);
    const collectionName = await Prompts.collectionName({ db, initial: args.collection });
    const collection = getCollection(db, collectionName);
    const filter = await Prompts.filter({ collection, purpose: "delete" });

    if (!flags.yes) {
      const approved = await Prompts.confirm({
        message: `${flags.many ? "Delete all" : "Delete one"} matching document${flags.many ? "s" : ""} in ${collectionName}?`,
        initialValue: false,
      });
      if (!approved) {
        log.warn("Delete cancelled.");
        return;
      }
    }

    const result = flags.many ? await collection.deleteMany(filter) : await collection.deleteOne(filter);
    log.success(
      `Deleted ${result.deletedCount} document${result.deletedCount === 1 ? "" : "s"} from ${collectionName}`,
    );
  });
