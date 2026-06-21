import { Code2Icon } from "lucide-react";
import { useState } from "react";
import { Button } from "~/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/ui/components/ui/dialog";
import type { SerializedDocument } from "~/ui/lib/collection-types";
import { isTaggedObjectId, sortSerializedObjectKeys } from "~/ui/lib/collection-utils";

type RowJsonCellProps = {
  document: SerializedDocument;
  collectionName: string;
};

export function RowJsonCell(props: RowJsonCellProps) {
  const [open, setOpen] = useState(false);
  const documentId = props.document._id;
  const title = isTaggedObjectId(documentId)
    ? documentId.value
    : typeof documentId === "string" || typeof documentId === "number"
      ? String(documentId)
      : "Document";

  return (
    <>
      <div className="flex h-full items-center justify-center px-1.5">
        <button
          type="button"
          className="text-foreground/30 hover:text-foreground/70 inline-flex size-7 items-center justify-center rounded opacity-0 transition-all duration-100 group-hover:opacity-100 hover:bg-white/8"
          onClick={() => setOpen(true)}
          aria-label="Open document JSON"
        >
          <Code2Icon className="size-3.5" />
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="h-[min(88vh,800px)] overflow-hidden sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{props.collectionName}</DialogTitle>
            <DialogDescription className="font-mono text-xs">{title}</DialogDescription>
          </DialogHeader>

          <div className="bg-muted/40 border-foreground/8 min-h-0 flex-1 overflow-auto rounded-md border p-4">
            <pre className="font-mono text-xs leading-5 whitespace-pre-wrap">
              {JSON.stringify(sortSerializedObjectKeys(props.document), null, 2)}
            </pre>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
