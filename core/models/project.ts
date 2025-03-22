import { z, ZodType } from "zod"

export interface Project {
  file: string
  export: string
  dbname: string
  dbs: Record<string, string>
}

export const projectSchema = z.object({
  file: z.string(),
  export: z.string(),
  dbname: z.string(),
  dbs: z.record(z.string()),
}) satisfies ZodType<Project>
