import { cancel, confirm, isCancel, log, multiselect, select, text, type Option } from "@clack/prompts";
import type { JSONSchema } from "monarch-orm";
import type { AnyCollection, AnyDb } from "./db";
import {
  describeFieldType,
  getCollectionFieldDefinitions,
  getCollectionJsonSchema,
  getSchemaKind,
  sortPropertyEntries,
  type FieldDefinition,
} from "./schema";

export class Prompts {
  static async json(input: { message: string; initialValue: string; optional?: boolean; placeholder?: string }) {
    return Prompts.text({
      message: input.message,
      initialValue: input.initialValue,
      required: !input.optional,
      placeholder: input.placeholder,
    });
  }

  static async number(input: { message: string; initialValue: number }) {
    return Prompts.text({
      message: input.message,
      initialValue: String(input.initialValue),
      required: true,
      validate(value) {
        if (value.trim().length === 0) return "A number is required.";
        if (Number.isNaN(Number(value))) return "Enter a valid number.";
        return undefined;
      },
    });
  }

  static async text(input: {
    message: string;
    initialValue: string;
    required?: boolean;
    placeholder?: string;
    validate?: (value: string) => string | Error | undefined;
  }) {
    const result = await text({
      message: input.message,
      initialValue: input.initialValue,
      placeholder: input.placeholder,
      validate(value) {
        const normalized = value ?? "";
        if ((input.required ?? true) && normalized.trim().length === 0) return "This value is required.";
        return input.validate?.(normalized);
      },
    });

    if (isCancel(result)) {
      cancel("Operation cancelled.");
      process.exit(0);
    }

    return String(result).trim();
  }

  static async select<T extends string>(input: { message: string; options: Option<T>[] }) {
    const result = await select({
      message: input.message,
      options: input.options,
    });

    if (isCancel(result)) {
      cancel("Operation cancelled.");
      process.exit(0);
    }

    return result as T;
  }

  static async confirm(input: { message: string; initialValue: boolean }) {
    const result = await confirm({
      message: input.message,
      initialValue: input.initialValue,
    });

    if (isCancel(result)) {
      cancel("Operation cancelled.");
      process.exit(0);
    }

    return result as boolean;
  }

  static async multiSelect<T extends string>(input: { message: string; options: Option<T>[] }) {
    const result = await multiselect({
      message: input.message,
      options: input.options as any,
      initialValues: input.options.map((option) => option.value),
      required: false,
    });

    if (isCancel(result)) {
      cancel("Operation cancelled.");
      process.exit(0);
    }

    const values = [...result] as T[];
    if (!values.length) throw new Error("Select at least one collection.");
    return values;
  }

  static async collectionName(input: { db: AnyDb; initial?: string }) {
    if (input.initial) return input.initial;
    const options = input.db.listCollections().map((name) => ({ value: name, label: name }));
    if (!options.length) throw new Error("No collections are configured in this Monarch project.");
    return Prompts.select({ message: "Pick a collection", options });
  }

  static async document(input: { collection: AnyCollection; message: string }) {
    const schema = getCollectionJsonSchema(input.collection);
    return Prompts._forObjectSchema(schema, input.message);
  }

  static async updateDocument(input: { collection: AnyCollection }) {
    const candidates = getCollectionFieldDefinitions(input.collection).filter((field) => field.path !== "_id");
    if (!candidates.length) throw new Error("No updatable fields were found in this schema.");

    const selectedPaths = await Prompts.multiSelect({
      message: "Which fields do you want to update?",
      options: candidates.map((field) => ({
        value: field.path,
        label: field.path,
        hint: describeFieldType(field.schema),
      })),
    });

    const updateEntries = await Promise.all(
      selectedPaths.map(async (path, index) => {
        const field = candidates.find((candidate) => candidate.path === path);
        if (!field) throw new Error(`Unknown field "${path}" selected for update.`);
        showFieldProgress({
          title: "Update fields",
          current: field.path,
          currentIndex: index,
          total: selectedPaths.length,
          remaining: selectedPaths.slice(index + 1),
        });
        return [path, await Prompts._forSchemaValue(field.label, field.schema, false)] as const;
      }),
    );

    return { $set: Object.fromEntries(updateEntries) };
  }

  static async filter(input: { collection: AnyCollection; purpose: string }): Promise<Record<string, unknown>> {
    const candidates = getCollectionFieldDefinitions(input.collection).filter(
      (field) => getSchemaKind(field.schema) !== "object",
    );
    if (!candidates.length) return {};

    const shouldFilter = await Prompts.confirm({
      message: `Add a filter for this ${input.purpose}?`,
      initialValue: false,
    });
    if (!shouldFilter) return {};

    const clauses: Record<string, unknown>[] = [];

    while (true) {
      const fieldPath = await Prompts.select({
        message: "Choose a field to filter by",
        options: candidates.map((field) => ({
          value: field.path,
          label: field.path,
          hint: describeFieldType(field.schema),
        })),
      });
      const field = candidates.find((candidate) => candidate.path === fieldPath);
      if (!field) throw new Error(`Unknown field "${fieldPath}".`);

      const operator = await Prompts._filterOperator(field);
      const clause = await Prompts._filterClause(field, operator);
      clauses.push(clause);

      const addAnother = await Prompts.confirm({ message: "Add another filter clause?", initialValue: false });
      if (!addAnother) break;
    }

    if (clauses.length === 1) return clauses[0]!;
    return { $and: clauses };
  }

  static async sort(input: { collection: AnyCollection }) {
    const candidates = getCollectionFieldDefinitions(input.collection).filter(
      (field) => getSchemaKind(field.schema) !== "object",
    );
    if (!candidates.length) return undefined;

    const shouldSort = await Prompts.confirm({ message: "Sort the results?", initialValue: false });
    if (!shouldSort) return undefined;

    const fieldPath = await Prompts.select({
      message: "Choose a sort field",
      options: candidates.map((field) => ({
        value: field.path,
        label: field.path,
        hint: describeFieldType(field.schema),
      })),
    });
    const direction = await Prompts.select({
      message: "Choose a sort direction",
      options: [
        { value: "asc", label: "Ascending" },
        { value: "desc", label: "Descending" },
      ],
    });

    return { [fieldPath]: direction === "asc" ? "asc" : "desc" };
  }

  private static async _forObjectSchema(schema: JSONSchema, message: string) {
    const result: Record<string, unknown> = {};
    const properties = schema.properties ?? {};
    const required = new Set(schema.required ?? []);
    const entries = sortPropertyEntries(properties);

    for (const [index, [key, propertySchema]] of entries.entries()) {
      const isRequired = required.has(key);
      showFieldProgress({
        title: message,
        current: key,
        currentIndex: index,
        total: entries.length,
        remaining: entries.slice(index + 1).map(([nextKey]) => nextKey),
      });

      if (!isRequired) {
        const includeField = await Prompts.confirm({ message: `Set "${message}.${key}"?`, initialValue: false });
        if (!includeField) continue;
      }

      result[key] = await Prompts._forSchemaValue(`${message}.${key}`, propertySchema, isRequired);
    }

    return result;
  }

  private static async _forSchemaValue(label: string, schema: JSONSchema, required: boolean): Promise<unknown> {
    if (schema.enum?.length) {
      const selected = await Prompts.select({
        message: `Choose ${label}`,
        options: schema.enum.map((value, index) => ({ value: String(index), label: String(value) })),
      });
      return schema.enum[Number(selected)];
    }

    const kind = getSchemaKind(schema);

    if (!required && allowsNull(schema)) {
      const useNull = await Prompts.confirm({ message: `Set "${label}" to null?`, initialValue: false });
      if (useNull) return null;
    }

    if (kind === "string" || kind === "objectId" || kind === "uuid") {
      return Prompts.text({
        message: `Enter ${label}`,
        initialValue: "",
        placeholder: schema.description,
        validate: validateScalar(schema),
      });
    }

    if (kind === "boolean") {
      const answer = await Prompts.select({
        message: `Choose ${label}`,
        options: [
          { value: "true", label: "true" },
          { value: "false", label: "false" },
        ],
      });
      return answer === "true";
    }

    if (kind === "number") {
      const raw = await Prompts.text({ message: `Enter ${label}`, initialValue: "", validate: validateScalar(schema) });
      return Number(raw);
    }

    if (kind === "date") {
      const raw = await Prompts.text({
        message: `Enter ${label} as ISO date`,
        initialValue: "",
        placeholder: "2025-01-31T12:00:00.000Z ('now' for current date)",
        validate: validateDate,
      });
      return raw === "now" ? new Date() : new Date(raw);
    }

    if (kind === "object") {
      return Prompts._forObjectSchema(schema, label);
    }

    if (kind === "array") {
      const itemSchema = Array.isArray(schema.items) ? schema.items[0] : schema.items;
      if (!itemSchema) return [];
      const count = Number(await Prompts.number({ message: `How many items for ${label}?`, initialValue: 0 }));
      const items: unknown[] = [];
      for (let index = 0; index < count; index++) {
        items.push(await Prompts._forSchemaValue(`${label}[${index}]`, itemSchema, true));
      }
      return items;
    }

    throw new Error(`The CLI does not yet support prompting for ${describeFieldType(schema)} fields like "${label}".`);
  }

  private static async _filterOperator(field: FieldDefinition) {
    const kind = getSchemaKind(field.schema);
    const numeric = kind === "number" || kind === "date";

    const options = [
      { value: "eq", label: "equals" },
      { value: "ne", label: "not equals" },
    ];

    if (numeric) {
      options.push({ value: "gt", label: "greater than" });
      options.push({ value: "gte", label: "greater than or equal" });
      options.push({ value: "lt", label: "less than" });
      options.push({ value: "lte", label: "less than or equal" });
    }

    if (kind === "string") {
      options.push({ value: "contains", label: "contains" });
      options.push({ value: "startsWith", label: "starts with" });
      options.push({ value: "endsWith", label: "ends with" });
    }

    options.push({ value: "in", label: "is in list" });

    return Prompts.select({ message: `How should ${field.path} be matched?`, options });
  }

  private static async _filterClause(field: FieldDefinition, operator: string) {
    if (operator === "in") {
      const count = Number(await Prompts.number({ message: `How many values for ${field.path}?`, initialValue: 2 }));
      const values: unknown[] = [];
      for (let index = 0; index < count; index++) {
        values.push(await Prompts._forSchemaValue(`${field.label} value ${index + 1}`, field.schema, true));
      }
      return { [field.path]: { $in: values } };
    }

    if (operator === "contains" || operator === "startsWith" || operator === "endsWith") {
      const value = String(await Prompts._forSchemaValue(field.label, field.schema, true));
      const pattern =
        operator === "contains"
          ? escapeRegExp(value)
          : operator === "startsWith"
            ? `^${escapeRegExp(value)}`
            : `${escapeRegExp(value)}$`;
      return { [field.path]: { $regex: pattern } };
    }

    const value = await Prompts._forSchemaValue(field.label, field.schema, true);
    if (operator === "eq") return { [field.path]: value };
    return { [field.path]: { [`$${operator}`]: value } };
  }
}

function showFieldProgress(options: {
  title: string;
  current: string;
  currentIndex: number;
  total: number;
  remaining: string[];
}) {
  const completed = options.currentIndex;
  const progress = `${completed + 1}/${options.total}`;
  const remainingPreview = options.remaining.length ? options.remaining.slice(0, 5).join(", ") : "none";

  log.step(
    `[${progress}] ${options.title}: ${options.current} (remaining: ${remainingPreview}${options.remaining.length > 5 ? ", ..." : ""})`,
  );
}

function allowsNull(schema: JSONSchema) {
  const source = schema.bsonType ?? schema.type;
  return Array.isArray(source) ? source.includes("null") : source === "null";
}

function validateScalar(schema: JSONSchema) {
  return (value: string) => {
    const kind = getSchemaKind(schema);
    if (kind === "number") {
      const numberValue = Number(value);
      if (Number.isNaN(numberValue)) return "Enter a valid number.";
      if (schema.minimum !== undefined && numberValue < schema.minimum) return `Must be at least ${schema.minimum}.`;
      if (schema.maximum !== undefined && numberValue > schema.maximum) return `Must be at most ${schema.maximum}.`;
      if (schema.multipleOf !== undefined && numberValue % schema.multipleOf !== 0)
        return `Must be a multiple of ${schema.multipleOf}.`;
      return undefined;
    }

    if (schema.minLength !== undefined && value.length < schema.minLength)
      return `Must be at least ${schema.minLength} characters.`;
    if (schema.maxLength !== undefined && value.length > schema.maxLength)
      return `Must be at most ${schema.maxLength} characters.`;
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) return "Value does not match the expected format.";
    return undefined;
  };
}

function validateDate(value: string) {
  if (value === "now") return;
  if (Number.isNaN(new Date(value).valueOf())) return "Enter a valid ISO date.";
  return undefined;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
