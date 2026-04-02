import { ArrowRightIcon, LayoutGridIcon, ListIcon, MoonIcon, PanelLeftCloseIcon } from "lucide-react";
import { Link, href, useFetcher, useLoaderData } from "react-router";
import { Theme, useTheme } from "remix-themes";
import { Entrypoint } from "~/core/entrypoint";
import { Button } from "~/ui/components/ui/button";
import { useSidebar } from "~/ui/components/ui/sidebar";
import { box } from "~/ui/lib/utils.server";
import { sessionStore } from "~/ui/session.server";

export async function loader({ request }: { request: Request }) {
  const entry = box.get(Entrypoint);
  const { db } = await entry.get();

  const session = await sessionStore.getSession(request.headers.get("Cookie"));
  const layout = session.get("overviewLayout") ?? "grid";

  const collectionNames = db.listCollections().sort((left, right) => left.localeCompare(right));
  const collections = await Promise.all(
    collectionNames.map(async (name) => ({
      name,
      count: await db.collections[name]!.estimatedDocumentCount(),
    })),
  );

  return { collections, layout };
}

export default function StudioOverview() {
  const { collections, layout } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const { toggleSidebar } = useSidebar();
  const [theme, setTheme] = useTheme();

  return (
    <section className="flex h-full flex-col">
      {/* Toolbar */}
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

        <div className="flex items-baseline gap-2">
          <span className="text-foreground/75 text-sm font-medium">Collections</span>
          <span className="text-foreground/30 text-xs tabular-nums">{collections.length}</span>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setTheme(theme === Theme.DARK ? Theme.LIGHT : Theme.DARK)}
            aria-label="Toggle theme"
            className="text-foreground/50 hover:text-foreground/70 w-10"
          >
            <MoonIcon />
          </Button>

          <fetcher.Form action="/actions?action=changeLayout" method="post">
            <input type="hidden" name="layout" value={layout === "list" ? "grid" : "list"} />
            <Button
              variant="ghost"
              size="icon-sm"
              type="submit"
              className="text-foreground/35 hover:text-foreground/70"
            >
              {layout === "list" ? <LayoutGridIcon className="size-3.5" /> : <ListIcon className="size-3.5" />}
            </Button>
          </fetcher.Form>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto mt-8 min-h-0 w-full max-w-3xl flex-1 overflow-auto">
        {layout === "list" ? (
          <div>
            {collections.map((collection) => (
              <Link
                key={collection.name}
                to={href("/collections/:name", { name: collection.name })}
                className="border-foreground/6 flex items-center border-b p-4 transition-colors duration-75 hover:bg-white/2.5"
              >
                <span className="text-foreground/80 min-w-0 flex-1 truncate text-sm">{collection.name}</span>
                <span className="text-foreground/30 ml-4 shrink-0 text-xs tabular-nums">
                  {collection.count.toLocaleString()} {collection.count === 1 ? "document" : "documents"}
                </span>
                <ArrowRightIcon className="text-foreground/20 ml-3 size-3.5 shrink-0" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="grid gap-px p-px md:grid-cols-2 xl:grid-cols-3">
            {collections.map((collection) => (
              <Link
                key={collection.name}
                to={href("/collections/:name", { name: collection.name })}
                className="bg-muted/25 group flex flex-col p-5 transition-colors duration-75 hover:bg-white/2.5"
              >
                <p className="text-foreground/80 truncate text-sm font-medium">{collection.name}</p>
                <p className="text-foreground/30 mt-1.5 text-xs tabular-nums">
                  {collection.count.toLocaleString()} document{collection.count === 1 ? "" : "s"}
                </p>
                <ArrowRightIcon className="text-foreground/20 mt-4 size-3.5 opacity-0 transition-opacity duration-100 group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        )}

        {!collections.length && (
          <div className="flex h-48 items-center justify-center">
            <p className="text-foreground/20 text-sm">No collections configured</p>
          </div>
        )}
      </div>
    </section>
  );
}
