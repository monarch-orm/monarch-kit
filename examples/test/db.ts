import { createClient, createDatabase, createSchema } from "monarch-orm"
import { string } from "monarch-orm/types"

const client = createClient("mongodb://localhost:27017/test")

const users = createSchema("users", {
  name: string(),
  email: string(),
  password: string(),
}).omit({ password: true })

export const db = createDatabase(client.db(), {
  users,
})
