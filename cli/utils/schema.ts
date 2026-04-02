import { getValidator, type JSONSchema } from "monarch-orm";
import type { AnyCollection } from "./db";

export type FieldKind = "string" | "boolean" | "number" | "date" | "objectId" | "uuid" | "object" | "array" | "unknown";

export type FieldDefinition = {
  key: string;
  path: string;
  label: string;
  schema: JSONSchema;
  kind: FieldKind;
  required: boolean;
};

export function getCollectionJsonSchema(collection: AnyCollection) {
  return getValidator(collection.schema).$jsonSchema;
}

export function getCollectionFieldDefinitions(collection: AnyCollection) {
  function flattenFieldDefinitions(schema: JSONSchema, parentPath = "", parentLabel = ""): FieldDefinition[] {
    const properties = schema.properties ?? {};
    const required = new Set(schema.required ?? []);

    return sortPropertyEntries(properties).flatMap(([key, propertySchema]) => {
      const path = parentPath ? `${parentPath}.${key}` : key;
      const label = parentLabel ? `${parentLabel}.${key}` : key;
      const definition: FieldDefinition = {
        key,
        path,
        label,
        schema: propertySchema,
        kind: getSchemaKind(propertySchema),
        required: required.has(key),
      };

      if (definition.kind === "object") {
        return [definition, ...flattenFieldDefinitions(propertySchema, path, label)];
      }

      return [definition];
    });
  }
  return flattenFieldDefinitions(getCollectionJsonSchema(collection));
}

export function sortPropertyEntries(properties: Record<string, JSONSchema>) {
  return Object.entries(properties).sort(([left], [right]) => {
    if (left === "_id") return -1;
    if (right === "_id") return 1;
    return left.localeCompare(right);
  });
}

export function describeFieldType(schema: JSONSchema) {
  const kind = getSchemaKind(schema);
  let label = kind === "objectId" ? "ObjectId" : kind === "uuid" ? "UUID" : kind;
  if (schema.enum?.length) label += ` enum(${schema.enum.map(String).join(", ")})`;
  return label;
}

export function getSchemaKind(schema: JSONSchema): FieldKind {
  const schemaType = schema.bsonType ?? schema.type;
  const value = Array.isArray(schemaType) ? (schemaType.find((item) => item !== "null") ?? schemaType[0]) : schemaType;
  if (value === "string") return "string";
  if (value === "bool" || value === "boolean") return "boolean";
  if (value === "number" || value === "int" || value === "long" || value === "double" || value === "decimal")
    return "number";
  if (value === "date") return "date";
  if (value === "objectId") return "objectId";
  if (value === "binData" && schema.description?.toLowerCase().includes("uuid")) return "uuid";
  if (value === "object") return "object";
  if (value === "array") return "array";
  return "unknown";
}
