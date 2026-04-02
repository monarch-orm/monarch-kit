import { createJiti } from "jiti";
import { createClient, createDatabase, Schemas } from "monarch-orm";
import path from "node:path";
import { prettifyError } from "zod";
import { projectSchema } from "./project";

export class Entrypoint {
  public configPath = "monarch.config";

  private import = createJiti(import.meta.url).import;

  public async getProject() {
    const project = await this.import(path.resolve(this.configPath), {
      default: true,
    }).catch((error) => {
      throw new Error(`Failed to read monarch config: ${error instanceof Error ? error.message : error}`);
    });
    const parsed = projectSchema.safeParse(project);
    if (parsed.error) throw new Error("Failed to read monarch config\n" + prettifyError(parsed.error));
    return parsed.data;
  }

  public async getSchemas(relpath: string) {
    try {
      const base = path.dirname(this.configPath);
      const exports = await this.import<any>(path.resolve(base, relpath));
      const schemas = exports.schemas ?? exports.default;
      if ("schemas" in schemas && "relations" in schemas && "withRelations" in schemas) {
        return schemas as Schemas<any, any>;
      }
      throw new Error("Failed to read monarch schemas: no named or default schemas export found");
    } catch (error) {
      throw new Error(`Failed to read monarch schemas: ${error instanceof Error ? error.message : error}`);
    }
  }

  public async get() {
    const project = await this.getProject();
    const schemas = await this.getSchemas(project.schemas);
    const client = createClient(project.connectionString, {
      connectTimeoutMS: 5000,
      socketTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    });
    const db = createDatabase(client.db(), schemas);
    return { project, schemas, db };
  }
}
