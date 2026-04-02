import { createSchema, defineSchemas } from "monarch-orm";
import { string } from "monarch-orm/types";

const users = createSchema("users", {
  name: string(),
  email: string(),
  password: string(),
}).omit({ password: true });

export const schemas = defineSchemas({ users });
