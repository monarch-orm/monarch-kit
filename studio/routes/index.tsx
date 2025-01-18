import { context } from "../context";
import type { Route } from "./+types/index";

export function meta() {
  return [
    { title: "Monarch Studio" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export async function loader() {
  const dbs = await context.database.list();

  return {
    dbs,
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { dbs } = loaderData;

  return (
    <div className="max-w-md mx-auto mt-40">
      <div className="flex flex-col gap-8">
        <h1 className="font-bold text-3xl text-center">Monarch Studio</h1>
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
        </div>
      </div>
    </div>
  );
}
