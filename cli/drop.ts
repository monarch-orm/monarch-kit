import { log } from "@clack/prompts";
import { arg, command, flag } from "commandstruct";
import { getCollection, loadDb } from "./utils/db";
import { Prompts } from "./utils/prompts";
import type { ProgramFlags } from ".";

export const dropCmd = command("drop")
  .describe("Drop a collection")
  .args({ collection: arg().optional() })
  .programFlags<ProgramFlags>()
  .flags({
    yes: flag("skip confirmation"),
  })
  .action(async ({ args, flags }, box) => {
    const { db } = await loadDb(box, flags.config);
    const collectionName = await Prompts.collectionName({ db, initial: args.collection });
    const collection = getCollection(db, collectionName);

    if (!flags.yes) {
      const approved = await Prompts.confirm({
        message: `Drop ${collectionName}? This removes the entire collection and all of its documents.`,
        initialValue: false,
      });
      if (!approved) {
        log.warn("Drop cancelled.");
        return;
      }
    }

    const dropped = await collection
      .raw()
      .drop()
      .catch((error: any) => {
        if (error?.codeName === "NamespaceNotFound") return false;
        throw error;
      });

    if (dropped) log.success(`Dropped ${collectionName}`);
    else log.warn(`${collectionName} does not exist in MongoDB yet.`);
  });
