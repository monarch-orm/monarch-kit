# Monarch Kit — Codebase Guide

## Commands

```sh
pnpm ui:dev          # Studio dev server (port 6543)
pnpm cli:dev -- <command> [flags]  # CLI without building
pnpm build           # Build CLI + Studio
pnpm check           # tsc + lint + format + route typegen
pnpm lint:fix && pnpm format:fix
pnpm test            # vitest run
pnpm watch           # vitest watch
```

## What this is

Monarch Kit ships two things as one package:

1. **CLI** (`monarch` binary) — commands to inspect and mutate collections from the terminal.
2. **Studio** — an SSR web UI (React Router v8 + Tailwind CSS v4) to browse and edit documents.

The lib entry (`lib/index.ts`) only exports `defineConfig` so users can write typed `monarch.config.ts` files.

## Source layout

| Path | Purpose |
|---|---|
| `cli/` | CLI commands (one file per command) + `utils/` helpers |
| `core/` | `Entrypoint` (loads config + connects DB) and `Project` schema |
| `lib/` | Public library entry — just `defineConfig` |
| `ui/` | Studio web app (`appDirectory` for React Router) |
| `ui/routes/` | File-system routes via `@react-router/fs-routes` flat-routes convention |
| `ui/components/` | Reusable components used across routes |
| `ui/components/ui/` | shadcn/ui primitives (base-ui backed) |
| `ui/lib/` | Client-safe utilities and server utilities |
| `ui/lib/collection-*.ts` | Collection-specific types, schema helpers, client utils |
| `ui/lib/utils.server.ts` | Server-only: `box` singleton + DB serialization/cursor helpers |

## Path aliases (tsconfig)

- `~/core/*` → `core/*`
- `~/cli/*` → `cli/*`
- `~/ui/*` → `ui/*`

## Key architectural patterns

### `Entrypoint` + `box`

`core/Entrypoint` reads `monarch.config.{js,ts,json}` via `jiti` (runtime importer that handles TS, JS, and JSON without a build step), connects to MongoDB, and returns `{ project, schemas, db }`. It is registered as a DI singleton via `getbox` (`Box`).

The single `box` instance lives in `ui/lib/utils.server.ts` and is imported by all server-side code. CLI commands create their own `box` via `commandstruct`'s DI and call `loadDb(box, configPath)` from `cli/utils/db.ts`.

### Studio routing

Routes follow React Router v8 flat-routes naming. The layout tree is:

```
_app.tsx             ← sidebar + SidebarProvider
  _app._index.tsx    ← collections overview
  _app.collections.$name.tsx  ← collection table + insert/update actions
  _app.collections._index.tsx ← redirects to /
actions._index.ts    ← shared actions (changeLayout, generateObjectId)
actions.theme.ts     ← theme toggle
$.tsx                ← catch-all (404)
```

### Actions pattern (`react-router-action`)

Server actions are defined with `createAction({ schema, handler })` and composed with `routeAction({ ... })`. On the client, `actionResult(fetcher.data, "actionName")` retrieves typed results. The `schema` field uses Zod for input validation.

### Collection data flow

1. `loader` in `_app.collections.$name.tsx` calls `getCollection` → queries MongoDB → serializes via `serializeDocument` (wraps `Date`/`ObjectId` in `{ __monarch: "date"|"objectId", value }` tagged objects).
2. The table renders virtual rows via `@tanstack/react-virtual`.
3. Cell edits go through `useFetcher` → `updateCell` action (supports `mode: "set" | "unset"`).
4. On the client, `deserializeValue` unwraps tagged objects back to native types before sending to MongoDB.

### UI component system

- shadcn/ui with **base-ui** as the primitive library (not Radix). Use `render={}` prop for polymorphic rendering, not `asChild`.
- `~/ui/components/ui/` contains shadcn primitives. Custom shared components go in `~/ui/components/`.
- Tailwind CSS v4 — no `tailwind.config.js`, all tokens in `ui/app.css`. Use `bg-foreground/5` opacity syntax, not arbitrary values like `bg-foreground/[0.05]`.
- Icons: `lucide-react`.
- Theme: `remix-themes` with cookie-backed theme session.
- Form state uses React's `useState` + render-phase derived state (no `useEffect` for state sync where avoidable).
- Server-only modules use `.server.ts` suffix. The `box` singleton (DI container) lives in `~/ui/lib/utils.server.ts`.

### `FieldEditorDialog` / `StructuredValueEditor`

The editors stack recursively: `FieldEditorDialog` → `StructuredValueEditor` → (`ObjectFieldForm` | `ArrayItemList` | `PrimitiveValueEditor`) → nested `FieldEditorDialog` for sub-fields. Array item dialogs receive `fieldName` from the parent dialog title so they can show `fieldName.index` as their title.

### CLI commands

Each command in `cli/` uses `commandstruct` and calls `loadDb(box, flags.config)` to connect. The `--config` flag on the root program overrides the default `monarch.config` path. Commands use `@clack/prompts` for interactive output.

### Build outputs

`tsdown` bundles `cli/index.ts` + `lib/index.ts` → `dist/cli/` and `dist/lib/`. The Studio is built by `react-router build` → `dist/ui/`. The `studio` CLI command reads `dist/ui/server/index.js` at runtime.
