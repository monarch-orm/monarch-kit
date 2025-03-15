import { z } from "zod"

export interface Project extends z.infer<typeof projectSchema> {
  local?: boolean
}

export const projectSchema = z.object({
  file: z.string(),
  export: z.string(),
  dbname: z.string(),
  dbs: z.record(z.string()),
})

export const localProjectSchema = z
  .object({
    file: z.string(),
    export: z.string(),
    dburl: z.string(),
  })
  .transform((data) => ({
    file: data.file,
    export: data.export,
    dbname: "Local",
    dbs: { Local: data.dburl },
    local: true,
  }))
