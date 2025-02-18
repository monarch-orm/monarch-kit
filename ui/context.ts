import { Hollywood } from "hollywood-di";
import { Database } from "../core/database";

export const container = Hollywood.create({
  database: Database,
});

export const context = container.instances;
