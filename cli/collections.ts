import { command, flag } from "commandstruct";
import type { ProgramFlags } from ".";
import { getCollection, loadDb } from "./utils/db";

export const collectionsCmd = command("collections")
  .describe("List configured collections")
  .alias("list")
  .programFlags<ProgramFlags>()
  .flags({
    counts: flag("show document counts").char("c"),
  })
  .action(async ({ flags }, box) => {
    const { db } = await loadDb(box, flags.config);
    const names = db.listCollections();

    if (!names.length) {
      console.log("No collections are configured in this Monarch project.");
      return;
    }

    if (!flags.counts) {
      for (const name of names) console.log(name);
      return;
    }

    const counts = await Promise.all(
      names.map(async (name) => ({ name, count: await getCollection(db, name).estimatedDocumentCount() })),
    );

    const colWidth = Math.max(...counts.map(({ name }) => name.length));
    for (const { name, count } of counts) {
      console.log(`${name.padEnd(colWidth)}  ${count}`);
    }
  });
