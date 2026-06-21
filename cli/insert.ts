import { log } from "@clack/prompts";
import { arg, command } from "commandstruct";
import type { ProgramFlags } from ".";
import { getCollection, loadDb } from "./utils/db";
import { printJsonOutput } from "./utils/helpers";
import { Prompts } from "./utils/prompts";

export const insertCmd = command("insert")
  .describe("Insert one document into a collection using schema-aware prompts")
  .args({ collection: arg().optional() })
  .programFlags<ProgramFlags>()
  .action(async ({ args, flags }, box) => {
    const { db } = await loadDb(box, flags.config);
    const collectionName = await Prompts.collectionName({ db, initial: args.collection });
    const collection = getCollection(db, collectionName);
    const data = await Prompts.document({ collection, message: collectionName });

    const result = await collection.insertOne(data);
    log.success(`Inserted 1 document into ${collectionName}`);
    printJsonOutput(result);
  });
