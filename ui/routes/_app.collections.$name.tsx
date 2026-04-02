import { getValidator } from "monarch-orm";
import { useState } from "react";
import { redirect, useFetcher, useLoaderData } from "react-router";
import { actionResult, createAction, routeAction } from "react-router-action";
import { z } from "zod";
import { CollectionHeader } from "~/ui/components/collection-header";
import { CollectionTable } from "~/ui/components/collection-table";
import { InsertDocumentDialog } from "~/ui/components/editors";
import { createInitialInsertValue, normalizeSchema } from "~/ui/lib/collection-schema";
import { PAGE_SIZE, type SerializedValue } from "~/ui/lib/collection-types";
import { collectColumns } from "~/ui/lib/collection-utils";
import {
  decodeCursor,
  deserializeValue,
  encodeCursor,
  getCollection,
  serializeDocument,
} from "~/ui/lib/collection-utils.server";
import type { Route } from "./+types/_app.collections.$name";

export async function loader({ request, params }: Route.LoaderArgs) {
  const collection = await getCollection(params.name);
  if (!collection) throw redirect("/");
  const url = new URL(request.url);
  const after = url.searchParams.get("after");
  const before = url.searchParams.get("before");
  let rawDocuments: Record<string, unknown>[] = [];
  let hasPreviousPage = false;
  let hasNextPage = false;

  if (before) {
    rawDocuments = await collection
      .find({ _id: { $lt: decodeCursor(before) } })
      .sort({ _id: -1 })
      .limit(PAGE_SIZE + 1);
    hasPreviousPage = rawDocuments.length > PAGE_SIZE;
    hasNextPage = true;
    if (hasPreviousPage) rawDocuments = rawDocuments.slice(0, PAGE_SIZE);
    rawDocuments.reverse();
  } else {
    const filter = after ? { _id: { $gt: decodeCursor(after) } } : {};
    rawDocuments = await collection
      .find(filter)
      .sort({ _id: 1 })
      .limit(PAGE_SIZE + 1);
    hasPreviousPage = Boolean(after);
    hasNextPage = rawDocuments.length > PAGE_SIZE;
    if (hasNextPage) rawDocuments = rawDocuments.slice(0, PAGE_SIZE);
  }

  const collectionSchema = normalizeSchema(getValidator(collection.schema).$jsonSchema);
  const columns = collectColumns(rawDocuments);
  const documents = rawDocuments.map((document) => serializeDocument(document));
  const estimatedCount = await collection.estimatedDocumentCount();
  const topLevelFieldSchemas = Object.fromEntries(
    columns.map((column) => [column, column === "_id" ? undefined : collectionSchema.fields?.[column]]),
  );

  return {
    collectionName: params.name,
    columns,
    documents,
    estimatedCount,
    collectionSchema,
    topLevelFieldSchemas,
    hasPreviousPage,
    hasNextPage,
    previousCursor: rawDocuments[0]?._id ? encodeCursor(rawDocuments[0]._id) : null,
    nextCursor: rawDocuments.at(-1)?._id ? encodeCursor(rawDocuments.at(-1)!._id) : null,
  };
}

const updateCell = createAction({
  schema: z.object({
    documentId: z.string(),
    field: z.string().min(1),
    mode: z.enum(["set", "unset"]).default("set"),
    value: z.string().optional(),
  }),
  async handler(ctx, { params }: Route.ActionArgs) {
    try {
      const collection = await getCollection(params.name);
      if (!collection) return ctx.error("Collection not found.", 400);

      const documentId = deserializeValue(JSON.parse(ctx.input.documentId));

      if (ctx.input.field === "_id") return ctx.error("The _id field is read-only.", 400);

      if (ctx.input.mode === "unset") {
        await collection.updateOne({ _id: documentId }, { $unset: { [ctx.input.field]: "" as never } });
        return ctx.data({ ok: true });
      }

      if (!ctx.input.value) return ctx.error("Missing value.", 400);

      const value = deserializeValue(JSON.parse(ctx.input.value));
      await collection.updateOne({ _id: documentId }, { $set: { [ctx.input.field]: value } });
      return ctx.data({ ok: true });
    } catch (error) {
      return ctx.error(error instanceof Error ? error.message : "Failed to update cell.", 400);
    }
  },
});

const insertDocument = createAction({
  schema: z.object({ document: z.string() }),
  async handler(ctx, { params }: Route.ActionArgs) {
    try {
      const collection = await getCollection(params.name);
      if (!collection) return ctx.error("Collection not found.", 400);

      const document = deserializeValue(JSON.parse(ctx.input.document));

      if (!document || Array.isArray(document) || typeof document !== "object") {
        return ctx.error("Insert expects a document object.", 400);
      }

      await collection.insertOne(document);
      return ctx.data({ ok: true });
    } catch (error) {
      return ctx.error(error instanceof Error ? error.message : "Failed to insert document.", 400);
    }
  },
});

export const action = routeAction({ updateCell, insertDocument });

export default function CollectionRoute() {
  const data = useLoaderData<typeof loader>();
  const insertFetcher = useFetcher<Route.ComponentProps["actionData"]>();
  const insertResult = actionResult(insertFetcher.data, "insertDocument");
  const [isInsertOpen, setInsertOpen] = useState(false);
  const [insertDraft, setInsertDraft] = useState<SerializedValue>(createInitialInsertValue(data.collectionSchema));
  const [prevFetcherState, setPrevFetcherState] = useState(insertFetcher.state);
  const [selection, setSelection] = useState({ count: 0, allSelected: false });

  if (prevFetcherState !== insertFetcher.state) {
    setPrevFetcherState(insertFetcher.state);
    if (insertFetcher.state === "idle" && insertResult.success) {
      setInsertOpen(false);
      setInsertDraft(createInitialInsertValue(data.collectionSchema));
    }
  }

  return (
    <section className="flex h-full flex-col">
      <CollectionHeader
        collectionName={data.collectionName}
        estimatedCount={data.estimatedCount}
        documentsCount={data.documents.length}
        hasPreviousPage={data.hasPreviousPage}
        hasNextPage={data.hasNextPage}
        previousCursor={data.previousCursor}
        nextCursor={data.nextCursor}
        onInsertClick={() => setInsertOpen(true)}
        selectedCount={selection.count}
        allSelected={selection.allSelected}
        onFilterSelected={() => {}}
        onDeleteSelected={() => {}}
      />

      <CollectionTable
        columns={data.columns}
        documents={data.documents}
        collectionName={data.collectionName}
        topLevelFieldSchemas={data.topLevelFieldSchemas}
        onSelectionChange={(count, allSelected) => setSelection({ count, allSelected })}
      />

      <InsertDocumentDialog
        open={isInsertOpen}
        onOpenChange={(value) => {
          if (!value) insertFetcher.reset();
          setInsertOpen(value);
        }}
        collectionName={data.collectionName}
        initialValue={insertDraft}
        schema={data.collectionSchema}
        onSave={(value) => {
          setInsertDraft(value);
          insertFetcher.submit(
            { document: JSON.stringify(value) },
            { method: "post", action: "?action=insertDocument" },
          );
        }}
        errorMessage={insertResult.success === false ? insertResult.error : undefined}
        confirmLabel={insertFetcher.state === "submitting" ? "Inserting…" : "Insert"}
      />
    </section>
  );
}
