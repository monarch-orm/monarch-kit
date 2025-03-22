import type { Project } from "~/core/models/project"

type ConfigOptions = {
  file: string
  export: string
  dbname?: string
  dburl: string
}

export function defineConfig(config: ConfigOptions): Project {
  const dbname = config.dbname ?? "Local"
  return {
    file: config.file,
    export: config.export,
    dbname,
    dbs: { [dbname]: config.dburl },
  }
}

export type { Project }
