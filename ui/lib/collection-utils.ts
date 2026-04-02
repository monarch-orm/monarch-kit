import { TAG_KEY, type SchemaNode, type SerializedValue, type TaggedValue } from "~/ui/lib/collection-types";

export function collectColumns(documents: Record<string, unknown>[]) {
  const names = new Set<string>(["_id"]);
  for (const document of documents) {
    for (const key of Object.keys(document)) names.add(key);
  }

  return sortKeys([...names]);
}

export function sortSerializedObjectKeys(value: SerializedValue): SerializedValue {
  if (Array.isArray(value)) return value.map((entry) => sortSerializedObjectKeys(entry));
  if (!isPlainObjectValue(value)) return value;

  const objectValue: Record<string, SerializedValue> = value;
  return Object.fromEntries(
    sortKeys(Object.keys(objectValue)).map((key) => [
      key,
      sortSerializedObjectKeys(objectValue[key] as SerializedValue),
    ]),
  ) as SerializedValue;
}

export function formatDisplayValue(value: SerializedValue | undefined, schema?: SchemaNode): string {
  if (value === undefined) return schema?.required ? "Required" : "Add value";
  if (value === null) return "null";
  if (isTaggedDate(value)) return new Date(value.value).toLocaleString();
  if (isTaggedObjectId(value)) return value.value;
  if (Array.isArray(value)) {
    return `[${value.length}] ${value
      .slice(0, 2)
      .map((entry) => formatDisplayValue(entry))
      .join(", ")}`;
  }
  if (isPlainObjectValue(value)) {
    const keys = sortKeys(Object.keys(value));
    return `{${keys.slice(0, 3).join(", ")}${keys.length > 3 ? ", ..." : ""}}`;
  }
  return String(value);
}

export function describeValue(value: SerializedValue | undefined): string {
  if (value === undefined) return "missing";
  if (value === null) return "null";
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`;
  if (isPlainObjectValue(value)) {
    const count = Object.keys(value).length;
    return `${count} field${count === 1 ? "" : "s"}`;
  }
  if (isTaggedDate(value)) return "date";
  if (isTaggedObjectId(value)) return "objectId";
  return typeof value;
}

export function isPlainObjectValue(value: SerializedValue | undefined): value is Record<string, SerializedValue> {
  return Boolean(
    value && typeof value === "object" && !Array.isArray(value) && !isTaggedDate(value) && !isTaggedObjectId(value),
  );
}

export function isTaggedDate(value: SerializedValue | undefined): value is TaggedValue {
  return Boolean(
    value && typeof value === "object" && !Array.isArray(value) && (value as TaggedValue)[TAG_KEY] === "date",
  );
}

export function isTaggedObjectId(value: SerializedValue | undefined): value is TaggedValue {
  return Boolean(
    value && typeof value === "object" && !Array.isArray(value) && (value as TaggedValue)[TAG_KEY] === "objectId",
  );
}

export function getDocumentKey(documentId: SerializedValue | undefined, index: number) {
  if (isTaggedObjectId(documentId)) return documentId.value;
  if (typeof documentId === "string" || typeof documentId === "number") return String(documentId);
  return `row-${index}`;
}

export function sortKeys(keys: string[]) {
  return [...keys].sort((left, right) => {
    if (left === "_id") return -1;
    if (right === "_id") return 1;
    return left.localeCompare(right);
  });
}

export function toDateTimeLocalValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}
