import { ObjectId, toObjectId } from "monarch-orm";
import { Entrypoint } from "~/core/entrypoint";
import { TAG_KEY, type SerializedDocument, type SerializedValue } from "~/ui/lib/collection-types";
import { isPlainObjectValue, isTaggedDate, isTaggedObjectId } from "~/ui/lib/collection-utils";
import { box } from "./utils.server";

export async function getCollection(name: string) {
  const entrypoint = box.get(Entrypoint);
  const { db } = await entrypoint.get();
  const collection = db.collections[name];
  if (!collection) return null;
  return collection;
}

export function serializeDocument(document: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(document).map(([key, value]) => [key, serializeValue(value)]),
  ) as SerializedDocument;
}

export function serializeValue(value: unknown): SerializedValue {
  if (value instanceof Date) return { [TAG_KEY]: "date", value: value.toISOString() };
  if (value instanceof ObjectId) return { [TAG_KEY]: "objectId", value: value.toHexString() };
  if (Array.isArray(value)) return value.map((entry) => serializeValue(entry));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, serializeValue(entry)]));
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
    return value;
  }
  return String(value);
}

export function deserializeValue(value: SerializedValue): unknown {
  if (isTaggedDate(value)) {
    const date = new Date(value.value);
    if (Number.isNaN(date.getTime())) throw new Error(`Invalid date value "${value.value}".`);
    return date;
  }
  if (isTaggedObjectId(value)) {
    const objectId = toObjectId(value.value);
    if (!objectId) throw new Error(`Invalid ObjectId value "${value.value}".`);
    return objectId;
  }
  if (Array.isArray(value)) return value.map((entry) => deserializeValue(entry));
  if (isPlainObjectValue(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, deserializeValue(entry)]));
  }
  return value;
}

export function encodeCursor(value: unknown) {
  if (value instanceof ObjectId) return `oid:${value.toHexString()}`;
  if (value instanceof Date) return `date:${value.toISOString()}`;
  if (typeof value === "string") return `str:${Buffer.from(value, "utf8").toString("base64url")}`;
  if (typeof value === "number") return `num:${value}`;
  throw new Error("Cursor pagination only supports ObjectId, Date, string, and number _id values.");
}

export function decodeCursor(cursor: string) {
  const [prefix, rawValue] = cursor.split(":", 2);
  if (!rawValue) throw new Error("Invalid cursor.");
  if (prefix === "oid") {
    const objectId = toObjectId(rawValue);
    if (!objectId) throw new Error("Invalid ObjectId cursor.");
    return objectId;
  }
  if (prefix === "date") return new Date(rawValue);
  if (prefix === "str") return Buffer.from(rawValue, "base64url").toString("utf8");
  if (prefix === "num") return Number(rawValue);
  throw new Error("Unsupported cursor type.");
}
