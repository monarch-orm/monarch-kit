import type { JSONSchema } from "monarch-orm";
import type { SchemaKind, SchemaNode, SerializedValue } from "~/ui/lib/collection-types";
import { sortKeys } from "~/ui/lib/collection-utils";

export function normalizeSchema(schema: JSONSchema | undefined, required = true): SchemaNode {
  const bsonTypes = asArray(schema?.bsonType ?? schema?.type);
  const nullable = bsonTypes.includes("null");
  const primaryType = bsonTypes.find((value) => value !== "null");
  const kind = mapSchemaKind(primaryType);

  if (kind === "object") {
    const requiredSet = new Set(schema?.required ?? []);
    const fields = Object.fromEntries(
      Object.entries(schema?.properties ?? {}).map(([key, value]) => [
        key,
        normalizeSchema(value, requiredSet.has(key)),
      ]),
    );
    return {
      kind,
      required,
      nullable,
      fields,
      additionalProperties: false,
    };
  }

  if (kind === "array") {
    const items = Array.isArray(schema?.items)
      ? schema.items.map((item) => normalizeSchema(item, true))
      : schema?.items
        ? normalizeSchema(schema.items, true)
        : undefined;

    return {
      kind,
      required,
      nullable,
      items: Array.isArray(items) ? items[0] : items,
      tupleItems: Array.isArray(items) ? items : undefined,
    };
  }

  return { kind, required, nullable };
}

export function getEffectiveKind(value: SerializedValue | undefined, schema?: SchemaNode) {
  if (schema?.kind && schema.kind !== "unknown") return schema.kind;
  if (value === undefined) return "string";
  if (value === null) return "null";
  if (isTagged(value, "date")) return "date";
  if (isTagged(value, "objectId")) return "objectId";
  if (Array.isArray(value)) return "array";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (value && typeof value === "object") return "object";
  return "unknown";
}

export function createInitialInsertValue(schema: SchemaNode) {
  return schema.kind === "object" ? {} : createValueForSchema(schema);
}

export function createEditorValue(schema?: SchemaNode) {
  return createValueForSchema(schema);
}

export function createValueForSchema(schema?: SchemaNode, current?: SerializedValue): SerializedValue {
  if (current !== undefined) return current;
  if (!schema) return "";
  if (schema.kind === "object") return {};
  if (schema.kind === "array") return [];
  if (schema.kind === "number") return 0;
  if (schema.kind === "boolean") return false;
  if (schema.kind === "date") return { __monarch: "date", value: new Date().toISOString() };
  if (schema.kind === "objectId") return { __monarch: "objectId", value: "" };
  return "";
}

export function createDefaultValue(kind: string, current?: SerializedValue): SerializedValue {
  if (kind === "string") return typeof current === "string" ? current : "";
  if (kind === "number") return typeof current === "number" ? current : 0;
  if (kind === "boolean") return typeof current === "boolean" ? current : false;
  if (kind === "date") {
    return isTagged(current, "date")
      ? { __monarch: "date", value: current.value }
      : { __monarch: "date", value: new Date().toISOString() };
  }
  if (kind === "objectId") {
    return isTagged(current, "objectId")
      ? { __monarch: "objectId", value: current.value }
      : { __monarch: "objectId", value: "" };
  }
  if (kind === "object") return isPlainObject(current) ? current : {};
  if (kind === "array") return Array.isArray(current) ? current : [];
  return null;
}

export function collectObjectEntries(value: Record<string, SerializedValue>, schema?: SchemaNode) {
  const schemaKeys = sortKeys(Object.keys(schema?.fields ?? {}));
  const extraKeys = sortKeys(Object.keys(value).filter((key) => !schemaKeys.includes(key)));
  const orderedKeys = schema ? schemaKeys : extraKeys;

  return orderedKeys.map((key) => ({
    key,
    schema: resolveObjectFieldSchema(schema, key),
    isSet: key in value,
    value: value[key],
  }));
}

export function resolveObjectFieldSchema(schema: SchemaNode | undefined, key: string) {
  return schema?.fields?.[key];
}

export function resolveArrayItemSchema(schema: SchemaNode | undefined, index: number) {
  return schema?.tupleItems?.[index] ?? schema?.items;
}

export function describeSchemaField(schema?: SchemaNode | null) {
  if (!schema) return "untyped field";
  const parts: string[] = [schema.kind];
  if (schema.nullable) parts.push("nullable");
  if (!schema.required) parts.push("optional");
  return parts.join(" • ");
}

export function describeSchemaBadge(schema?: SchemaNode | null): string {
  if (!schema) return "any";
  const label = kindLabel(schema);
  return schema.required ? label : `${label}?`;
}

function kindLabel(schema: SchemaNode): string {
  if (schema.kind === "objectId") return "ObjectId";
  if (schema.kind === "array") {
    if (!schema.items || schema.items.kind === "unknown") return "any[]";
    return `${kindLabel(schema.items)}[]`;
  }
  if (schema.kind === "unknown") return "any";
  return schema.kind;
}

function mapSchemaKind(type: string | undefined): SchemaKind {
  if (type === "object") return "object";
  if (type === "array") return "array";
  if (type === "string") return "string";
  if (type === "bool" || type === "boolean") return "boolean";
  if (type === "date") return "date";
  if (type === "objectId") return "objectId";
  if (type === "int" || type === "long" || type === "double" || type === "decimal" || type === "number") {
    return "number";
  }
  return "unknown";
}

function asArray<T>(value: T | T[] | undefined) {
  if (!value) return [] as T[];
  return Array.isArray(value) ? value : [value];
}

function isTagged(
  value: SerializedValue | undefined,
  tag: "date" | "objectId",
): value is { __monarch: "date" | "objectId"; value: string } {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && value.__monarch === tag);
}

function isPlainObject(value: SerializedValue | undefined): value is Record<string, SerializedValue> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && !("__monarch" in value));
}
