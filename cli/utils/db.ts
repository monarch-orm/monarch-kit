import type { Box } from "getbox";
import type { Collection, Database } from "monarch-orm";
import { Entrypoint } from "~/core/entrypoint";

export type AnyDb = Database<any>;
export type AnyCollection = Collection<any, any>;

export async function loadDb(box: Box, configPath: string | undefined) {
  const entry = box.get(Entrypoint);
  if (configPath) entry.configPath = configPath;
  const result = await entry.get();
  await result.db.isReady;
  return result;
}

export function getCollection(db: AnyDb, collectionName: string): AnyCollection {
  const collection = db.collections[collectionName];
  if (!collection) throw new Error(`Unknown collection "${collectionName}".`);
  return collection;
}
