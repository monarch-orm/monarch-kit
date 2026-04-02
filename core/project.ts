import { z } from "zod";

export const projectSchema = z.object({
  schemas: z.string(),
  connectionString: z.string(),
});

export type Project = z.output<typeof projectSchema>;
