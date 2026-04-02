export const PAGE_SIZE = 20;
export const ROW_HEIGHT = 48;
export const TAG_KEY = "__monarch";

export type TaggedValue = {
  [TAG_KEY]: "date" | "objectId";
  value: string;
};

export type SerializedValue =
  | null
  | string
  | number
  | boolean
  | TaggedValue
  | SerializedValue[]
  | { [key: string]: SerializedValue };

export type SerializedDocument = Record<string, SerializedValue>;
export type EditableKind = "string" | "number" | "boolean" | "date" | "objectId" | "null" | "object" | "array";
export type SchemaKind = Exclude<EditableKind, "null"> | "unknown";

export type SchemaNode = {
  kind: SchemaKind;
  required: boolean;
  nullable: boolean;
  fields?: Record<string, SchemaNode>;
  items?: SchemaNode;
  tupleItems?: SchemaNode[];
  additionalProperties?: boolean;
  additionalPropertiesNode?: SchemaNode;
};

export const editableKinds: EditableKind[] = [
  "string",
  "number",
  "boolean",
  "date",
  "objectId",
  "null",
  "object",
  "array",
];
