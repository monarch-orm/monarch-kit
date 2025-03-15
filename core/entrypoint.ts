import { glob } from "glob"
import { createJiti } from "jiti"
import { Database } from "monarch-orm"
import path from "node:path"
import { localProjectSchema, projectSchema, type Project } from "./models"

export type DirTree = { [k: string]: string | DirTree }

export class Entrypoint {
  private import = createJiti(import.meta.url).import

  public async getProject(
    projects: Record<string, Project> | undefined,
  ): Promise<Project | undefined> {
    const configPath = path.resolve("monarch.config.json")
    const config = await this.import(configPath).catch(() => undefined)
    if (config) return localProjectSchema.safeParse(config).data
    const project = projects?.[process.cwd()]
    if (project) return projectSchema.safeParse(project).data
  }

  public async getDatabaseExport(relpath: string, identifier: string) {
    try {
      const exports = await this.import<any>(path.resolve(relpath))
      const db = exports[identifier]
      if (db instanceof Database) return db
      return null
    } catch (_error) {
      return null
    }
  }

  public async getFileExports(relpath: string) {
    try {
      const exports = await this.import<any>(path.resolve(relpath))
      return Object.entries(exports).map(([name, value]) => ({
        name,
        isDb: value instanceof Database,
      }))
    } catch (_error) {
      return []
    }
  }

  public async getFiles() {
    const paths = await glob("**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}", {
      ignore: "{node_modules,tests,dist}/**",
      withFileTypes: true,
    })
    const cwd = process.cwd()
    const tree: DirTree = {}
    const suggestions: string[] = []

    for (const path of paths) {
      const relpath = path.fullpath().slice((cwd + path.sep).length)
      if (relpath.includes("db.") || relpath.includes("database.")) {
        suggestions.push(relpath)
      }
      const segments = relpath.split(path.splitSep)
      const leaf = segments.pop()!
      let parent = tree
      for (const segment of segments) {
        if (!(segment in parent)) {
          parent[segment] = {}
        }
        parent = parent[segment] as DirTree
      }
      parent[leaf] = relpath
    }
    suggestions.sort((a, b) => a.length - b.length)

    return { tree, suggestions }
  }
}
