import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useState } from "react";
import { Form } from "react-router";
import {
  createAction,
  matchAction,
  useActionResult,
} from "react-router-action";
import { z } from "zod";
import type { DirTree } from "~/core/entrypoint";
import { Button } from "../components/ui/button";
import { context } from "../context.server";
import type { Route } from "./+types/_index";

const getExports = createAction({
  schema: z.object({
    path: z.string(),
  }),
  async handler(ctx) {
    const exports = await context.entrypoint.getExports(ctx.input.path);
    return ctx.data({
      exports,
      db: await context.entrypoint.getExport(ctx.input.path, "db"),
    });
  },
});

export async function action(args: Route.ActionArgs) {
  return matchAction(args, {
    getExports,
  });
}

export async function loader({}: Route.LoaderArgs) {
  const dbs = await context.database.list();
  const files = await context.entrypoint.getFiles();

  return {
    dbs,
    files,
  };
}

export default function Home({ loaderData, actionData }: Route.ComponentProps) {
  const {
    dbs,
    files: { tree },
  } = loaderData;

  const getExports = useActionResult(actionData, "getExports");
  console.log(getExports.success, getExports.data);

  return (
    <main className="max-w-md mx-auto mt-40">
      <div className="flex flex-col gap-8">
        <h1
          onClick={() => console.log("monarch")}
          className="font-bold text-3xl text-center"
        >
          Monarch Studio
        </h1>
        <div>
          <p className="font-light text-xs text-center mb-4">
            Available databases
          </p>
          <ul className="grid gap-1">
            {dbs.map((db) => (
              <li
                className="group px-4 py-2 text-sm rounded-md bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between"
                key={db}
              >
                <span>{db}</span>
                <button
                  type="button"
                  className="opacity-0 group-hover:opacity-70 group-hover:delay-300 transition-opacity"
                >
                  &rarr;
                </button>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-center">
            <button className="bg-zinc-800 text-white px-8 py-2 rounded-full">
              Submit
            </button>
          </div>
        </div>

        <FileSelector tree={tree} />
      </div>
    </main>
  );
}

function FileSelector(props: {
  tree: DirTree;
  parent?: DirTree;
  segments?: string[];
  onBack?: () => void;
}) {
  const [sub, setSub] = useState<{ segment: string; tree: DirTree }>();

  if (sub) {
    return (
      <FileSelector
        tree={sub.tree}
        parent={props.tree}
        segments={[...(props.segments ?? []), sub.segment]}
        onBack={() => setSub(undefined)}
      />
    );
  }

  return (
    <Form method="POST" className="border rounded-xl divide-y">
      <input type="hidden" name="_action" value="getExports" />
      <div className="flex items-center justify-between px-4 py-2">
        {props.onBack && (
          <Button
            type="button"
            onClick={props.onBack}
            size="icon"
            variant="secondary"
            className="size-6 rounded-full"
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
        )}
        <p className="text-xs">
          {props.segments?.map((segment, i) => (
            <span key={i}>
              {i !== 0 && "/"} {segment}
            </span>
          ))}
          {!props.segments?.length && "Root"}
        </p>
      </div>

      {Object.keys(props.tree).map((name) => {
        const path = props.tree[name];
        const isFile = typeof path === "string";
        return (
          <button
            key={name}
            className="w-full flex items-center justify-between px-4 py-2 hover:bg"
            type={isFile ? "submit" : "button"}
            name={isFile ? "path" : undefined}
            value={isFile ? path : undefined}
            onClick={
              isFile
                ? undefined
                : () => {
                    console.log("setting sub to:", path);
                    setSub({ segment: name, tree: path });
                  }
            }
          >
            {name}
            {!isFile && <ChevronRightIcon className="size-4" />}
          </button>
        );
      })}
    </Form>
  );
}
