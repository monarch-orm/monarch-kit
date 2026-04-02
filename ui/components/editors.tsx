import { PlusIcon, RefreshCcwIcon, SquarePenIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { useActionResult } from "react-router-action";
import { Button } from "~/ui/components/ui/button";
import { Calendar } from "~/ui/components/ui/calendar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "~/ui/components/ui/dialog";
import { Switch } from "~/ui/components/ui/switch";
import {
  collectObjectEntries,
  createDefaultValue,
  createValueForSchema,
  describeSchemaBadge,
  getEffectiveKind,
  resolveArrayItemSchema,
  resolveObjectFieldSchema,
} from "~/ui/lib/collection-schema";
import { editableKinds, type SchemaNode, type SerializedValue } from "~/ui/lib/collection-types";
import {
  describeValue,
  formatDisplayValue,
  isPlainObjectValue,
  isTaggedDate,
  isTaggedObjectId,
} from "~/ui/lib/collection-utils";
import { cn } from "~/ui/lib/utils";
import type { Route as HomeRoute } from "../routes/+types/actions._index";

// ─── Kind Selector ─────────────────────────────────────────────────────────────

function KindSelector({ kind, onChange }: { kind: string; onChange: (k: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {editableKinds
        .filter((k) => k !== "null")
        .map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onChange(k)}
            className={cn(
              "h-5 rounded-full px-2 font-mono text-[10px] transition-colors duration-100",
              k === kind ? "bg-foreground/10 text-foreground" : "text-foreground/30 hover:text-foreground/60",
            )}
          >
            {k}
          </button>
        ))}
    </div>
  );
}

// ─── Date Editor ───────────────────────────────────────────────────────────────

function DateEditor({ value, onChange }: { value: SerializedValue; onChange: (v: SerializedValue) => void }) {
  const date = isTaggedDate(value) ? new Date(value.value) : undefined;

  const handleDaySelect = (selected: Date | undefined) => {
    if (!selected) return;
    const next = new Date(date ?? selected);
    next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
    onChange({ __monarch: "date", value: next.toISOString() });
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [h = 0, m = 0, s = 0] = e.target.value.split(":").map(Number);
    const next = new Date(date ?? new Date());
    next.setHours(h, m, s, 0);
    onChange({ __monarch: "date", value: next.toISOString() });
  };

  const timeStr = date
    ? [date.getHours(), date.getMinutes(), date.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":")
    : "";

  return (
    <div className="flex flex-col items-center gap-3 py-1">
      <Calendar mode="single" selected={date} onSelect={handleDaySelect} />
      <input
        type="time"
        step="1"
        value={timeStr}
        onChange={handleTimeChange}
        className="bg-foreground/5 h-8 w-48 rounded-md px-3 text-center font-mono text-xs outline-none"
      />
    </div>
  );
}

// ─── ObjectId Input ────────────────────────────────────────────────────────────

function ObjectIdInput({ value, onChange }: { value: SerializedValue; onChange: (v: SerializedValue) => void }) {
  const fetcher = useFetcher<HomeRoute.ComponentProps["actionData"]>();
  const result = useActionResult(fetcher.data, "generateObjectId");

  useEffect(() => {
    if (fetcher.state === "idle" && result.success) {
      const id = (result.data as { id: string } | undefined)?.id;
      if (id) onChange({ __monarch: "objectId", value: id });
    }
    // onChange identity changes each render; effect should only fire on fetcher completion
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.state, result.success, result.data]);

  const isGenerating = fetcher.state !== "idle";

  return (
    <div className="bg-foreground/5 flex h-8 items-center rounded-md">
      <input
        value={isTaggedObjectId(value) ? value.value : ""}
        onChange={(e) => onChange({ __monarch: "objectId", value: e.target.value })}
        placeholder="24-character hex"
        className="placeholder:text-foreground/25 min-w-0 flex-1 bg-transparent px-3 font-mono text-xs outline-none"
      />
      <div className="bg-foreground/10 mx-0.5 h-4 w-px shrink-0" />
      <button
        type="button"
        disabled={isGenerating}
        onClick={() => fetcher.submit({}, { method: "post", action: "/actions?action=generateObjectId" })}
        className="text-foreground/40 hover:text-foreground/75 flex h-full shrink-0 items-center gap-1.5 px-2.5 font-mono text-[10px] transition-colors disabled:opacity-40"
      >
        Generate
        <RefreshCcwIcon className={cn("size-3", isGenerating && "animate-spin")} />
      </button>
    </div>
  );
}

// ─── Primitive Value Editor ────────────────────────────────────────────────────

function PrimitiveValueEditor({
  value,
  onChange,
  schema,
  showKindSelector = false,
}: {
  value: SerializedValue;
  onChange: (v: SerializedValue) => void;
  schema?: SchemaNode;
  showKindSelector?: boolean;
}) {
  const inferredKind = getEffectiveKind(value, schema);
  const kind = inferredKind === "unknown" ? "string" : inferredKind;
  const isNullValue = value === null;

  return (
    <div className="flex flex-col gap-2.5">
      {showKindSelector && <KindSelector kind={kind} onChange={(k) => onChange(createDefaultValue(k, value))} />}

      {!isNullValue && kind !== "null" && (
        <>
          {kind === "string" && (
            <textarea
              value={typeof value === "string" ? value : ""}
              onChange={(e) => onChange(e.target.value)}
              rows={3}
              placeholder="value"
              className="bg-foreground/5 placeholder:text-foreground/25 w-full resize-none rounded-md px-3 py-2 font-mono text-xs outline-none"
            />
          )}

          {kind === "number" && (
            <input
              type="number"
              value={typeof value === "number" ? String(value) : "0"}
              onChange={(e) => onChange(Number(e.target.value))}
              className="bg-foreground/5 h-8 w-full rounded-md px-3 font-mono text-xs outline-none"
            />
          )}

          {kind === "boolean" && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-foreground/50 font-mono text-xs">
                {typeof value === "boolean" ? String(value) : "false"}
              </span>
              <Switch checked={typeof value === "boolean" ? value : false} onCheckedChange={onChange} />
            </div>
          )}

          {kind === "date" && <DateEditor value={value} onChange={onChange} />}

          {kind === "objectId" && <ObjectIdInput value={value} onChange={onChange} />}
        </>
      )}

      {(isNullValue || kind === "null") && <span className="text-foreground/35 font-mono text-xs">null</span>}
    </div>
  );
}

// ─── Field Preview ─────────────────────────────────────────────────────────────

function FieldPreview({ value, schema }: { value: SerializedValue | undefined; schema?: SchemaNode }) {
  const isObjectId = isTaggedObjectId(value);
  const isObject = isPlainObjectValue(value);
  const isArray = Array.isArray(value);
  const showBadge = isObjectId || isObject || isArray;
  const badgeLabel = isObject ? "object" : isArray ? "array" : formatDisplayValue(value, schema);

  return (
    <div className="flex justify-end px-3 pt-0.5 pb-3">
      {showBadge ? (
        <span className="bg-foreground/8 text-foreground/50 rounded px-1.5 py-0.5 font-mono text-[11px]">
          {badgeLabel}
        </span>
      ) : (
        <span className="text-foreground/40 max-w-full truncate font-mono text-[11px]">
          {formatDisplayValue(value, schema)}
        </span>
      )}
    </div>
  );
}

// ─── Object Field Form ─────────────────────────────────────────────────────────

function ObjectFieldForm({
  value,
  onChange,
  schema,
}: {
  value: Record<string, SerializedValue>;
  onChange: (v: SerializedValue) => void;
  schema?: SchemaNode;
}) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const entries = collectObjectEntries(value, schema);

  const clearField = (key: string) => {
    const next = { ...value };
    delete next[key];
    onChange(next);
  };

  return (
    <div className="flex flex-col">
      {entries.map(({ key, schema: fieldSchema, isSet, value: fieldValue }) => {
        return (
          <div key={key} className="border-foreground/6 border-b last:border-b-0">
            <div
              className="hover:bg-foreground/4 flex cursor-pointer items-center justify-between gap-3 rounded-xs p-2"
              onClick={() => setEditingKey(key)}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="text-foreground/85 truncate font-mono text-[11px] font-medium">{key}</span>
                {fieldSchema?.required && <span className="text-destructive shrink-0 text-[10px] leading-none">*</span>}
                <span className="text-foreground/30 shrink-0 font-mono text-[9px]">
                  {fieldSchema ? describeSchemaBadge(fieldSchema) : describeValue(fieldValue)}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  className="text-foreground/35 hover:text-foreground/70 flex items-center gap-1 font-mono text-[10px] transition-colors"
                >
                  {isSet ? (
                    <>
                      update <SquarePenIcon className="size-3" />
                    </>
                  ) : (
                    <>
                      set <PlusIcon className="size-3" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {isSet && <FieldPreview value={fieldValue} schema={fieldSchema} />}
          </div>
        );
      })}

      {editingKey !== null && (
        <FieldEditorDialog
          open
          onOpenChange={(o) => {
            if (!o) setEditingKey(null);
          }}
          title={editingKey}
          initialValue={
            editingKey in value
              ? value[editingKey]!
              : createValueForSchema(resolveObjectFieldSchema(schema, editingKey))
          }
          schema={resolveObjectFieldSchema(schema, editingKey)}
          onSave={(v) => {
            onChange({ ...value, [editingKey]: v });
            setEditingKey(null);
          }}
          onSetNull={
            resolveObjectFieldSchema(schema, editingKey)?.nullable
              ? () => {
                  onChange({ ...value, [editingKey]: null });
                  setEditingKey(null);
                }
              : undefined
          }
          onClear={() => {
            clearField(editingKey);
            setEditingKey(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Array Item List ───────────────────────────────────────────────────────────

function ArrayItemList({
  value,
  onChange,
  schema,
  fieldName,
}: {
  value: SerializedValue[];
  onChange: (v: SerializedValue) => void;
  schema?: SchemaNode;
  fieldName?: string;
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const removeItem = (index: number) => onChange(value.filter((_, i) => i !== index));

  return (
    <div className="flex flex-col">
      {value.length === 0 && <p className="text-foreground/25 py-2 font-mono text-xs">empty</p>}

      {value.map((item, index) => {
        const itemSchema = resolveArrayItemSchema(schema, index);

        return (
          <div key={index} className="border-foreground/6 border-b">
            <div
              className="hover:bg-foreground/4 flex cursor-pointer items-center justify-between gap-3 rounded-xs p-2"
              onClick={() => setEditingIndex(index)}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="text-foreground/85 font-mono text-[11px] font-medium">{index}</span>
                <span className="text-foreground/30 shrink-0 font-mono text-[9px]">
                  {itemSchema ? describeSchemaBadge(itemSchema) : describeValue(item)}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  className="text-foreground/35 hover:text-foreground/70 flex items-center gap-1 font-mono text-[10px] transition-colors"
                >
                  update
                  <SquarePenIcon className="size-3" />
                </button>
              </div>
            </div>

            <FieldPreview value={item} schema={itemSchema} />
          </div>
        );
      })}

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={() => onChange([...value, createValueForSchema(resolveArrayItemSchema(schema, value.length))])}
          className="text-foreground/35 hover:text-foreground/65 flex items-center gap-1 font-mono text-xs transition-colors"
        >
          add item
          <PlusIcon className="size-3" />
        </button>
      </div>

      {editingIndex !== null && (
        <FieldEditorDialog
          open
          onOpenChange={(o) => {
            if (!o) setEditingIndex(null);
          }}
          title={fieldName ? `${fieldName}.${editingIndex}` : String(editingIndex)}
          initialValue={value[editingIndex] ?? createValueForSchema(resolveArrayItemSchema(schema, editingIndex))}
          schema={resolveArrayItemSchema(schema, editingIndex)}
          onSave={(v) => {
            onChange(value.map((x, i) => (i === editingIndex ? v : x)));
            setEditingIndex(null);
          }}
          onSetNull={
            resolveArrayItemSchema(schema, editingIndex)?.nullable
              ? () => {
                  onChange(value.map((x, i) => (i === editingIndex ? null : x)));
                  setEditingIndex(null);
                }
              : undefined
          }
          onClear={() => {
            removeItem(editingIndex);
            setEditingIndex(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Structured Value Editor ───────────────────────────────────────────────────

export function StructuredValueEditor({
  value,
  onChange,
  schema,
  fieldName,
}: {
  value: SerializedValue;
  onChange: (v: SerializedValue) => void;
  schema?: SchemaNode;
  fieldName?: string;
}) {
  const kind = getEffectiveKind(value, schema);

  if (kind === "object") {
    return <ObjectFieldForm value={isPlainObjectValue(value) ? value : {}} onChange={onChange} schema={schema} />;
  }

  if (kind === "array") {
    return (
      <ArrayItemList
        value={Array.isArray(value) ? value : []}
        onChange={onChange}
        schema={schema}
        fieldName={fieldName}
      />
    );
  }

  return (
    <PrimitiveValueEditor
      value={value}
      onChange={onChange}
      schema={schema}
      showKindSelector={!schema || schema.kind === "unknown"}
    />
  );
}

// ─── Field Editor Dialog ───────────────────────────────────────────────────────

export function FieldEditorDialog(props: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  subtitle?: string;
  initialValue: SerializedValue;
  schema?: SchemaNode;
  onSave: (v: SerializedValue) => void;
  onSetNull?: () => void;
  onClear?: () => void;
  errorMessage?: string;
  confirmLabel?: string;
}) {
  const [draft, setDraft] = useState(props.initialValue);
  const hasSecondaryActions = props.onSetNull || props.onClear;

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-baseline gap-1.5">
            <span className="font-mono text-sm font-semibold">{props.title}</span>
            {props.subtitle && <span className="text-foreground/30 text-xs font-normal">{props.subtitle}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[65vh] overflow-y-auto py-1 pr-0.5">
          <StructuredValueEditor value={draft} onChange={setDraft} schema={props.schema} fieldName={props.title} />
        </div>

        {props.errorMessage && <p className="text-destructive font-mono text-[11px]">{props.errorMessage}</p>}

        <DialogFooter className={cn(hasSecondaryActions && "sm:justify-between")}>
          {hasSecondaryActions && (
            <div className="flex gap-1">
              {props.onSetNull && (
                <Button variant="ghost" size="sm" onClick={props.onSetNull}>
                  Set null
                </Button>
              )}
              {props.onClear && (
                <Button variant="ghost" size="sm" onClick={props.onClear}>
                  Clear
                </Button>
              )}
            </div>
          )}
          <Button size="sm" onClick={() => props.onSave(draft)}>
            {props.confirmLabel ?? "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Insert Document Dialog ────────────────────────────────────────────────────

export function InsertDocumentDialog(props: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  collectionName: string;
  initialValue: SerializedValue;
  schema?: SchemaNode;
  onSave: (v: SerializedValue) => void;
  errorMessage?: string;
  confirmLabel?: string;
}) {
  const [draft, setDraft] = useState(props.initialValue);

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-baseline gap-1.5 text-sm">
            <span className="text-foreground/35 font-normal">insert into</span>
            <span className="font-mono font-semibold">{props.collectionName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[62vh] overflow-y-auto py-1 pr-0.5">
          <StructuredValueEditor value={draft} onChange={setDraft} schema={props.schema} />
        </div>

        {props.errorMessage && <p className="text-destructive font-mono text-[11px]">{props.errorMessage}</p>}

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" size="sm" onClick={() => setDraft(props.initialValue)}>
            Reset
          </Button>
          <Button size="sm" onClick={() => props.onSave(draft)}>
            {props.confirmLabel ?? "Insert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
