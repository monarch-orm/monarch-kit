import {
  BanIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FileIcon,
  FolderIcon,
  PackageIcon,
} from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"
import { useFetcher } from "react-router"
import type { DirTree } from "~/core/entrypoint"
import type { loader } from "../routes/setup.exports"
import { Button } from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"

type Props = {
  tree: DirTree
  suggestions: string[]
  onSelect(value: { file: string; identifier: string }): void
  segments?: string[]
  onBack?(): void
}

export function SchemaSelector({
  tree,
  suggestions,
  onSelect,
  segments = [],
  onBack,
}: Props) {
  const [sub, setSub] = useState<{ segment: string; tree: DirTree }>()

  useEffect(() => {
    if (sub) return
    const controller = new AbortController()
    window.addEventListener(
      "keydown",
      (e) => {
        if (e.key === "Escape" && onBack) onBack()
      },
      { signal: controller.signal },
    )
    return () => controller.abort()
  }, [onBack, sub])

  if (sub) {
    return (
      <SchemaSelector
        tree={sub.tree}
        suggestions={suggestions}
        onSelect={onSelect}
        segments={[...segments, sub.segment]}
        onBack={() => setSub(undefined)}
      />
    )
  }

  const breadcrumb = segments.join("/")
  const files = Object.entries(tree).sort((a, b) => {
    if (typeof a[1] === "string") {
      if (typeof b[1] !== "string") return 1
      return a[1].localeCompare(b[1])
    } else {
      if (typeof b[1] === "string") return -1
      return a[0].localeCompare(b[0])
    }
  })

  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between border-b">
        <Button
          type="button"
          size="xs"
          variant="link"
          disabled={!onBack}
          onClick={onBack}
        >
          <ChevronLeftIcon className="size-4" />
          Go back
        </Button>

        <p className="truncate px-3 text-xs text-muted-foreground underline decoration-dotted">
          {breadcrumb}
        </p>
      </div>

      <div className="h-64 overflow-y-scroll p-1">
        {files.map(([name, path]) => {
          if (typeof path !== "string") {
            return (
              <button
                key={name}
                type="button"
                className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-2 transition-colors hover:bg-muted"
                onClick={() => setSub({ segment: name, tree: path })}
              >
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground/50">
                    <FolderIcon className="size-4" />
                  </span>
                  <span className="text-xs">{name}</span>
                </div>
                <ChevronRightIcon className="size-4 text-muted-foreground/50" />
              </button>
            )
          }
          return (
            <Dropdown key={name} path={path} onSelect={onSelect}>
              <DropdownMenuTrigger className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-2 transition-colors hover:bg-muted">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground/50">
                    <FileIcon className="size-4" />
                  </span>
                  <span className="text-xs">{name}</span>
                </div>
                <ChevronRightIcon className="size-4 text-muted-foreground/50" />
              </DropdownMenuTrigger>
            </Dropdown>
          )
        })}
      </div>

      <div className="border-t p-2">
        <p className="mb-2 text-2xs font-medium leading-none">Suggestions</p>
        <div className="flex gap-2">
          {suggestions.map((path) => (
            <Dropdown key={path} path={path} onSelect={onSelect}>
              <DropdownMenuTrigger className="rounded-md border border-transparent bg-muted px-3 py-1 text-xs opacity-80 hover:border-border">
                {path}
              </DropdownMenuTrigger>
            </Dropdown>
          ))}
        </div>
      </div>
    </div>
  )
}

function Dropdown({
  path,
  onSelect,
  children,
}: {
  path: string
  onSelect: Props["onSelect"]
  children: ReactNode
}) {
  const fetcher = useFetcher<typeof loader>()
  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) return
        const params = new URLSearchParams()
        params.set("path", path)
        fetcher.load(`/setup/exports?${params}`)
      }}
    >
      {children}
      <DropdownMenuContent className="max-h-60 min-w-60 divide-y rounded-sm p-0 *:rounded-none">
        <DropdownMenuLabel className="font-light">{path}</DropdownMenuLabel>
        {fetcher.data?.map(({ name, isDb }) => (
          <DropdownMenuItem
            key={name}
            disabled={!isDb}
            onClick={() => onSelect({ file: path, identifier: name })}
            className="justify-between font-medium"
          >
            <div className="flex items-center gap-1.5">
              <PackageIcon className="size-3 text-muted-foreground/50" />
              {name}
            </div>
            {!isDb && <BanIcon className="size-3 text-muted-foreground/50" />}
          </DropdownMenuItem>
        ))}
        {!fetcher.data?.length && (
          <p className="grid h-7 place-items-center text-2xs text-muted-foreground">
            {fetcher.data ? "No exports found" : "Loading..."}
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
