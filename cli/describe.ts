import { log } from "@clack/prompts";
import { arg, command } from "commandstruct";
import { getCollection, loadDb } from "./utils/db";
import { printJsonOutput } from "./utils/helpers";
import { Prompts } from "./utils/prompts";
import { describeFieldType, getCollectionFieldDefinitions } from "./utils/schema";
import type { ProgramFlags } from ".";

export const describeCmd = command("describe")
  .describe("Show collection metadata, indexes and schema fields")
  .args({ collection: arg().optional() })
  .programFlags<ProgramFlags>()
  .action(async ({ args, flags }, box) => {
    const { db } = await loadDb(box, flags.config);
    const collectionName = await Prompts.collectionName({ db, initial: args.collection });
    const collection = getCollection(db, collectionName);
    const [estimatedCount, indexes] = await Promise.all([
      collection.estimatedDocumentCount(),
      collection.raw().indexes(),
    ]);

    const fields = getCollectionFieldDefinitions(collection).filter((field) => field.kind !== "object");

    log.info(`Collection: ${collectionName}`);
    log.info(`Estimated documents: ${estimatedCount}\n`);

    console.log(`\nIndexes (${indexes.length})`);
    printJsonOutput(Object.fromEntries(indexes.map((index) => [index.name, index.key])));

    console.log(`\nFields (${fields.length})`);
    printJsonOutput(Object.fromEntries(fields.map((field) => [field.path, describeFieldType(field.schema)])));
  });
