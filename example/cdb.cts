const { createClient, createDatabase, createSchema } = require("monarch-orm");
const { string } = require("monarch-orm/types");

const client = createClient("mongodb://localhost:27017/test");

const users = createSchema("users", {
  name: string(),
  email: string(),
  password: string(),
}).omit({ password: true });

const db = createDatabase(client.db(), {
  users,
});

module.exports = { db };
