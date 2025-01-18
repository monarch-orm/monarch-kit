import { createCommand } from "commandstruct";
import type { Database } from "~/core/database";

export const dbCmd = createCommand("db")
  .use<{ database: Database }>()
  .action(async (_, ctx) => {
    const dbs = await ctx.database.list();
    console.log(dbs);
  });
