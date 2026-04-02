import { useEffect, useState } from "react";
import type { SerializedDocument } from "~/ui/lib/collection-types";
import { sortSerializedObjectKeys } from "~/ui/lib/collection-utils";

type JsonViewerProps = {
  document: SerializedDocument;
};

function unwrapMonarch(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(unwrapMonarch);
  const obj = value as Record<string, unknown>;
  if (typeof obj.__monarch === "string") return obj.value;
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, unwrapMonarch(v)]));
}

export function JsonViewer({ document: doc }: JsonViewerProps) {
  const json = JSON.stringify(unwrapMonarch(sortSerializedObjectKeys(doc)), null, 2);
  const [html, setHtml] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    import("shiki").then(({ codeToHtml }) => {
      codeToHtml(json, { lang: "json", theme: "github-dark-default" }).then((result) => {
        if (!cancelled) setHtml(result);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [json]);

  if (!html) {
    return <pre className="text-foreground/80 font-mono text-xs leading-5 whitespace-pre-wrap">{json}</pre>;
  }

  return (
    <div
      className="[&_code]:font-mono [&_code]:text-xs [&_code]:leading-5 [&_pre]:bg-transparent!"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
