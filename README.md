# Monarch Kit

**Monarch Kit** is a development kit for [Monarch ORM](https://github.com/princecodes247/monarch) comprising of the Monarch CLI and Studio.

## Installation

```sh
npm install -D monarch-kit
```

## Configuration

Create a `monarch.config.ts` (or `.js`) at the root of your project:

```ts
import { defineConfig } from "monarch-kit";

export default defineConfig({
  schemas: "./schemas", // path to your Monarch schemas file
  connectionString: process.env.MONGODB_URI ?? "mongodb://localhost:27017/mydb",
});
```

The `schemas` path is resolved relative to the config file. It should point to a file that exports schemas created with `defineSchemas` or `mergeSchemas` from `monarch-orm` — either as a named `schemas` export or as the default export.

```ts
// schemas.ts
import { createSchema, defineSchemas } from "monarch-orm";
import { boolean, date, objectId, string } from "monarch-orm/types";

const users = createSchema("users", {
  name: string().trim().nonempty(),
  email: string().trim().lowercase().nonempty(),
  role: string().default("member"),
  isActive: boolean().default(true),
  createdAt: date(),
});

const posts = createSchema("posts", {
  title: string().trim().nonempty(),
  authorId: objectId(),
  publishedAt: date().nullable().optional(),
});

export const schemas = defineSchemas({ users, posts });
```

## CLI

Run commands against your database directly from the terminal. All commands accept a `--config` flag to specify a custom config path.

```sh
monarch [--config <path>] <command>
```

| Command                 | Description                                               |
| ----------------------- | --------------------------------------------------------- |
| `collections`           | List configured collections (alias: `list`)               |
| `describe [collection]` | Show schema fields, indexes, and estimated count          |
| `query [collection]`    | Query documents with optional filter and sort             |
| `insert [collection]`   | Insert a document using schema-aware prompts              |
| `count [collection]`    | Count documents with an optional filter                   |
| `update [collection]`   | Update documents using schema-aware prompts               |
| `delete [collection]`   | Delete documents using schema-aware filters               |
| `drop [collection]`     | Drop a collection                                         |
| `init`                  | Initialize collections, sync indexes and validation rules |
| `studio`                | Start the Studio web UI                                   |

### Examples

```sh
# List collections with document counts
monarch collections --counts

# Query with interactive filter/sort builder
monarch query users --interactive --limit 50

# Initialize indexes and validation for all collections
monarch init --indexes --validation

# Start Studio on a custom port
monarch studio --port 8080

# Use a non-default config file
monarch --config ./config/monarch.config.ts query
```

## Studio

Studio is a web UI for browsing and editing your MongoDB collections.

```sh
monarch studio
```

Opens on `http://localhost:6543` by default. Features:

- Browse collections with a virtualized, paginated table
- Click any cell to edit its value
- Schema-aware editors for all types: string, number, boolean, date, ObjectId, object, array
- Insert documents with a form driven by your schema
- Select rows for bulk operations
- Dark / light theme toggle
- Sidebar search to filter collections

## Using in development

```sh
# Install
npm install -D monarch-kit

# Run CLI without installing globally
npx monarch studio
```
