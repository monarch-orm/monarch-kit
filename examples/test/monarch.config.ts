import { defineConfig } from "monarch-kit";

export default defineConfig({
  schemas: "src/schemas",
  connectionString: process.env.DB_URL!,
});
