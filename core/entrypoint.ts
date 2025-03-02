import "tsx";

import { glob } from "glob";
import { Database } from "monarch-orm";
import path from "node:path";

export type DirTree = { [k: string]: string | DirTree };

export class Entrypoint {
  public async getFiles() {
    const paths = await glob("**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}", {
      ignore: "{node_modules,tests,dist}/**",
      withFileTypes: true,
    });
    const cwd = process.cwd();
    const tree: DirTree = {};
    const suggestions: string[] = [];

    for (const path of paths) {
      const relpath = path.fullpath().slice((cwd + path.sep).length);
      if (relpath.includes("db.") || relpath.includes("database.")) {
        suggestions.push(relpath);
      }
      const segments = relpath.split(path.splitSep);
      const leaf = segments.pop()!;
      let parent = tree;
      for (const segment of segments) {
        if (!(segment in parent)) {
          parent[segment] = {};
        }
        parent = parent[segment] as DirTree;
      }
      parent[leaf] = relpath;
    }
    return { tree, suggestions };
  }

  public async getExports(relpath: string) {
    try {
      const exports = await import(/*@vite-ignore*/ path.resolve(relpath));
      return Object.keys(exports);
    } catch (error) {
      return [];
    }
  }

  public async getExport(relpath: string, identifier: string) {
    try {
      const exports = await import(/*@vite-ignore*/ path.resolve(relpath));
      const db = exports[identifier];
      if (db instanceof Database) return db;
      return null;
    } catch (error) {
      return null;
    }
  }
}
