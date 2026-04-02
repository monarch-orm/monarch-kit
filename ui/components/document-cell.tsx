import { useState } from "react";
import { useFetcher } from "react-router";
import { useActionResult } from "react-router-action";
import { FieldEditorDialog } from "~/ui/components/editors";
import { createEditorValue } from "~/ui/lib/collection-schema";
import { type SchemaNode, type SerializedValue } from "~/ui/lib/collection-types";
import { formatDisplayValue, isPlainObjectValue, isTaggedObjectId } from "~/ui/lib/collection-utils";
import { cn } from "~/ui/lib/utils";
import type { Route } from "../routes/+types/_app.collections.$name";

type CellBadge = { valueOnly: true } | { valueOnly: false; label: string };

function cellBadge(value: SerializedValue | undefined): CellBadge | null {
  if (isTaggedObjectId(value)) return { valueOnly: true };
  if (isPlainObjectValue(value)) return { valueOnly: false, label: "object" };
  if (Array.isArray(value)) return { valueOnly: false, label: "array" };
  return null;
}

function BadgeOrValue({
  badge,
  value,
  schema,
}: {
  badge: CellBadge | null;
  value: SerializedValue | undefined;
  schema?: SchemaNode;
}) {
  if (badge) {
    return (
      <span
        className={cn(
          "rounded px-1.5 py-0.5 text-[11px]",
          "bg-foreground/8 text-foreground/50",
          badge.valueOnly ? "min-w-0 truncate" : "shrink-0",
        )}
      >
        {badge.valueOnly ? formatDisplayValue(value, schema) : badge.label}
      </span>
    );
  }
  return <p className="text-foreground/80 w-full truncate text-xs">{formatDisplayValue(value, schema)}</p>;
}

type DocumentCellProps = {
  collectionName: string;
  documentId: SerializedValue;
  field: string;
  schema?: SchemaNode;
  value: SerializedValue | undefined;
  readOnly: boolean;
};

export function DocumentCell(props: DocumentCellProps) {
  const fetcher = useFetcher<Route.ComponentProps["actionData"]>();
  const updateResult = useActionResult(fetcher.data, "updateCell");
  const [open, setOpen] = useState(false);
  const [dialogDraft, setDialogDraft] = useState<SerializedValue>(props.value ?? createEditorValue(props.schema));
  const [prevSchema, setPrevSchema] = useState(props.schema);
  const [prevValue, setPrevValue] = useState(props.value);
  const [prevFetcherState, setPrevFetcherState] = useState(fetcher.state);

  if (prevSchema !== props.schema || prevValue !== props.value) {
    setPrevSchema(props.schema);
    setPrevValue(props.value);
    setDialogDraft(props.value ?? createEditorValue(props.schema));
    setOpen(false);
  }

  if (prevFetcherState !== fetcher.state) {
    setPrevFetcherState(fetcher.state);
    if (fetcher.state === "idle" && updateResult.success) setOpen(false);
  }

  const badge = cellBadge(props.value);

  if (props.readOnly) {
    return (
      <div className="flex h-full items-center px-3">
        <BadgeOrValue badge={badge} value={props.value} schema={props.schema} />
      </div>
    );
  }

  const isSubmitting = fetcher.state !== "idle";

  const submitValue = (value: SerializedValue) => {
    fetcher.submit(
      {
        documentId: JSON.stringify(props.documentId),
        field: props.field,
        mode: "set",
        value: JSON.stringify(value),
      },
      { method: "post", action: "?action=updateCell" },
    );
  };

  return (
    <>
      <button
        type="button"
        className="hover:bg-foreground/4 flex h-full w-full items-center px-3 text-left transition-colors duration-75"
        onClick={(e) => {
          if (e.ctrlKey || e.metaKey) return;
          setDialogDraft(props.value ?? createEditorValue(props.schema));
          setOpen(true);
        }}
      >
        <BadgeOrValue badge={badge} value={props.value} schema={props.schema} />
      </button>

      {open && (
        <FieldEditorDialog
          open
          onOpenChange={(o) => {
            if (!o) setOpen(false);
          }}
          title={props.field}
          subtitle={`in ${props.collectionName}`}
          initialValue={dialogDraft}
          schema={props.schema}
          onSave={(value) => {
            setDialogDraft(value);
            submitValue(value);
          }}
          onSetNull={
            props.schema?.nullable
              ? () => {
                  setOpen(false);
                  submitValue(null);
                }
              : undefined
          }
          onClear={
            !props.schema?.required
              ? () => {
                  setOpen(false);
                  fetcher.submit(
                    { documentId: JSON.stringify(props.documentId), field: props.field, mode: "unset" },
                    { method: "post", action: "?action=updateCell" },
                  );
                }
              : undefined
          }
          errorMessage={updateResult.success === false ? updateResult.error : undefined}
          confirmLabel={isSubmitting ? "Saving…" : "Save"}
        />
      )}
    </>
  );
}
