import { Hollywood } from "hollywood-di";
import { Entrypoint } from "~/core/entrypoint";
import { Database } from "../core/database";

export const container = Hollywood.create({
  database: Database,
  entrypoint: Entrypoint,
});

export const context = container.instances;
