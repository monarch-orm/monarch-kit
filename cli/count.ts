import { arg, command } from "commandstruct";
import type { ProgramFlags } from ".";
import { getCollection, loadDb } from "./utils/db";
import { Prompts } from "./utils/prompts";

export const countCmd = command("count")
  .describe("Count documents in a collection using schema-aware filters")
  .args({ collection: arg().optional() })
  .programFlags<ProgramFlags>()
  .action(async ({ args, flags }, box) => {
    const { db } = await loadDb(box, flags.config);
    const collectionName = await Prompts.collectionName({ db, initial: args.collection });
    const collection = getCollection(db, collectionName);
    const filter = await Prompts.filter({ collection, purpose: "count" });

    const total = await collection.countDocuments(filter);
    console.log(total);
  });
