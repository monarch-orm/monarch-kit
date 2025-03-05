import { glob } from "glob"
import { createJiti } from "jiti"
import { Database } from "monarch-orm"
import path from "node:path"

export type DirTree = { [k: string]: string | DirTree }

export class Entrypoint {
  private import = createJiti(import.meta.url).import

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
    return { tree, suggestions }
  }

  public async getExports(relpath: string) {
    try {
      const exports = await this.import<any>(path.resolve(relpath))
      return Object.keys(exports)
    } catch (_error) {
      return []
    }
  }

  public async getExport(relpath: string, identifier: string) {
    try {
      const exports = await this.import<any>(path.resolve(relpath))
      const db = exports[identifier]
      if (db instanceof Database) return db
      return null
    } catch (_error) {
      return null
    }
  }
}
