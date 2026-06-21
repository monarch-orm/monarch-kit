import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FilterIcon,
  MoonIcon,
  PanelLeftCloseIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { Link } from "react-router";
import { Theme, useTheme } from "remix-themes";
import { Button } from "~/ui/components/ui/button";
import { useSidebar } from "~/ui/components/ui/sidebar";

type CollectionHeaderProps = {
  collectionName: string;
  estimatedCount: number;
  documentsCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  previousCursor: string | null;
  nextCursor: string | null;
  onInsertClick: () => void;
  selectedCount?: number;
  allSelected?: boolean;
  onFilterSelected?: () => void;
  onDeleteSelected?: () => void;
};

export function CollectionHeader(props: CollectionHeaderProps) {
  const { toggleSidebar } = useSidebar();
  const [theme, setTheme] = useTheme();
  const hasSelection = (props.selectedCount ?? 0) > 0;

  return (
    <div className="border-foreground/5 flex h-11 shrink-0 items-center border-b pr-4">
      {/* Sidebar toggle */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
        className="text-foreground/50 hover:text-foreground/70 mx-1 w-8"
      >
        <PanelLeftCloseIcon />
      </Button>

      <div className="flex items-center gap-2">
        {/* Collection name */}
        <h1 className="text-foreground/75 text-sm font-medium">{props.collectionName}</h1>

        {/* Divider */}
        <div className="bg-foreground/10 mx-1 h-4 w-px shrink-0" />

        {hasSelection ? (
          <span className="text-foreground/50 text-xs tabular-nums">
            {props.allSelected ? "all selected" : `${props.selectedCount} selected`}
          </span>
        ) : (
          <span className="text-foreground/30 truncate text-xs tabular-nums">
            {props.estimatedCount.toLocaleString()} {props.estimatedCount === 1 ? "document" : "documents"}
          </span>
        )}
      </div>

      {/* Right */}
      <div className="ml-auto flex items-center gap-1">
        {hasSelection ? (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={props.onFilterSelected}
              aria-label="Filter selected"
              className="text-foreground/50 hover:text-foreground/70"
            >
              <FilterIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={props.onDeleteSelected}
              aria-label="Delete selected"
              className="text-foreground/50 hover:text-destructive"
            >
              <Trash2Icon />
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setTheme(theme === Theme.DARK ? Theme.LIGHT : Theme.DARK)}
              aria-label="Toggle theme"
              className="text-foreground/50 hover:text-foreground/70 w-10"
            >
              <MoonIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={!props.hasPreviousPage}
              render={
                <Link
                  to={props.previousCursor ? `?before=${encodeURIComponent(props.previousCursor)}` : "#"}
                  aria-disabled={!props.previousCursor}
                />
              }
              className="text-foreground/35 hover:text-foreground/70"
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={!props.hasNextPage}
              render={
                <Link
                  to={props.nextCursor ? `?after=${encodeURIComponent(props.nextCursor)}` : "#"}
                  aria-disabled={!props.nextCursor}
                />
              }
              className="text-foreground/35 hover:text-foreground/70"
            >
              <ChevronRightIcon />
            </Button>

            <div className="bg-foreground/10 mx-1 h-4 w-px shrink-0" />

            <Button size="sm" onClick={props.onInsertClick}>
              <PlusIcon />
              Add record
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
