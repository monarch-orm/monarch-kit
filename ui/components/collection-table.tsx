import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { DocumentCell } from "~/ui/components/document-cell";
import { JsonViewer } from "~/ui/components/json-viewer";
import { Checkbox } from "~/ui/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "~/ui/components/ui/dialog";
import { describeSchemaBadge } from "~/ui/lib/collection-schema";
import { ROW_HEIGHT, type SchemaNode, type SerializedDocument } from "~/ui/lib/collection-types";
import { getDocumentKey, isTaggedObjectId } from "~/ui/lib/collection-utils";

type CollectionTableProps = {
  columns: string[];
  documents: SerializedDocument[];
  collectionName: string;
  topLevelFieldSchemas: Record<string, SchemaNode | undefined>;
  onSelectionChange?: (count: number, allSelected: boolean) => void;
};

function getDocumentTitle(doc: SerializedDocument): string {
  const id = doc._id;
  if (isTaggedObjectId(id)) return id.value;
  if (typeof id === "string" || typeof id === "number") return String(id);
  return "Document";
}

export function CollectionTable(props: CollectionTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: props.documents.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  const [selectedKeys, setSelectedKeys] = useState(new Set<string>());
  const [jsonDoc, setJsonDoc] = useState<SerializedDocument | null>(null);

  const allSelected =
    props.documents.length > 0 && props.documents.every((doc, i) => selectedKeys.has(getDocumentKey(doc._id!, i)));

  // Reset selection when page changes
  useEffect(() => {
    setSelectedKeys(new Set());
    props.onSelectionChange?.(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.documents]);

  const toggleAll = () => {
    if (allSelected) {
      setSelectedKeys(new Set());
      props.onSelectionChange?.(0, false);
    } else {
      const next = new Set(props.documents.map((doc, i) => getDocumentKey(doc._id!, i)));
      setSelectedKeys(next);
      props.onSelectionChange?.(next.size, true);
    }
  };

  const toggleRow = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      const isAll = next.size === props.documents.length && props.documents.length > 0;
      props.onSelectionChange?.(next.size, isAll);
      return next;
    });
  };

  const hasId = props.columns.includes("_id");
  const otherColCount = props.columns.filter((col) => col !== "_id").length;

  return (
    <>
      <div className="min-h-0 flex-1">
        <div ref={scrollRef} className="h-full overflow-auto overscroll-none" style={{ overscrollBehavior: "none" }}>
          <div
            className="table-grid"
            data-has-id={hasId ? "" : undefined}
            style={{ "--col-count": otherColCount } as CSSProperties}
          >
            {/* Column headers */}
            <div className="bg-background sticky top-0 z-20">
              <div className="border-foreground/5 grid grid-cols-(--cols) border-b">
                {/* Checkbox header */}
                <div className="border-foreground/5 flex h-10 items-center justify-center border-r px-2">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all rows" />
                </div>
                {/* Field headers */}
                {props.columns.map((column) => {
                  const schema = props.topLevelFieldSchemas[column];
                  const label = column === "_id" ? "ObjectId" : describeSchemaBadge(schema ?? null);
                  return (
                    <div key={column} className="border-foreground/5 flex h-10 items-center gap-1.5 border-r px-3">
                      <span className="text-foreground/75 text-xs font-medium">{column}</span>
                      <span className="text-foreground/30 text-xs">{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Empty state */}
            {!props.documents.length ? (
              <div className="flex h-48 items-center justify-center">
                <div className="text-center">
                  <p className="text-foreground/30 text-sm">No documents</p>
                  <p className="text-foreground/20 mt-1 text-xs">Insert a document into {props.collectionName}</p>
                </div>
              </div>
            ) : (
              <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const doc = props.documents[virtualRow.index]!;
                  const docKey = getDocumentKey(doc._id!, virtualRow.index);
                  const isSelected = selectedKeys.has(docKey);

                  return (
                    <div
                      key={docKey}
                      className="border-foreground/5 absolute right-0 left-0 border-b"
                      style={
                        {
                          height: virtualRow.size,
                          transform: `translateY(${virtualRow.start}px)`,
                        } as CSSProperties
                      }
                      onClick={(e) => {
                        if (e.ctrlKey || e.metaKey) setJsonDoc(doc);
                      }}
                    >
                      <div className="grid h-full grid-cols-(--cols)">
                        {/* Checkbox cell */}
                        <div
                          className="border-foreground/5 flex items-center justify-center border-r px-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleRow(docKey)}
                            aria-label="Select row"
                          />
                        </div>
                        {/* Data cells */}
                        {props.columns.map((column) => (
                          <div key={`${docKey}:${column}`} className="border-foreground/5 min-w-0 border-r">
                            <DocumentCell
                              collectionName={props.collectionName}
                              documentId={doc._id!}
                              field={column}
                              schema={props.topLevelFieldSchemas[column]}
                              value={doc[column]}
                              readOnly={column === "_id"}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* JSON viewer dialog — ctrl+click on any row */}
      {jsonDoc && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setJsonDoc(null);
          }}
        >
          <DialogContent className="h-[min(88vh,800px)] overflow-hidden sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>{props.collectionName}</DialogTitle>
              <DialogDescription className="font-mono text-xs">{getDocumentTitle(jsonDoc)}</DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-auto rounded-md bg-[#0d1117] p-4">
              <JsonViewer document={jsonDoc} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
