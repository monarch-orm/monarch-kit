import { log } from "@clack/prompts";
import { arg, command, flag } from "commandstruct";
import { getCollection, loadDb } from "./utils/db";
import { printJsonOutput } from "./utils/helpers";
import { Prompts } from "./utils/prompts";
import type { ProgramFlags } from ".";

export const queryCmd = command("query")
  .describe("Query a collection with schema-aware prompts")
  .args({ collection: arg().optional() })
  .programFlags<ProgramFlags>()
  .flags({
    interactive: flag("configure filter and sort").char("i"),
    limit: flag("max documents to return").char("l").optionalParam("number", 20),
    skip: flag("number of documents to skip").optionalParam("number", 0),
  })
  .action(async ({ args, flags }, box) => {
    const { db } = await loadDb(box, flags.config);
    const collectionName = await Prompts.collectionName({ db, initial: args.collection });
    const collection = getCollection(db, collectionName);
    const filter = flags.interactive ? await Prompts.filter({ collection, purpose: "query" }) : {};
    const sort = flags.interactive ? await Prompts.sort({ collection }) : undefined;

    let query = collection.find(filter);
    if (sort) query = query.sort(sort);
    if (flags.skip > 0) query = query.skip(flags.skip);
    if (flags.limit >= 0) query = query.limit(flags.limit);

    const documents = await query;
    log.success(`Found ${documents.length} document${documents.length === 1 ? "" : "s"} in ${collectionName}`);
    printJsonOutput(documents);
  });
