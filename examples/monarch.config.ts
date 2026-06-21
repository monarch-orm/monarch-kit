import { defineConfig } from "../lib";

export default defineConfig({
  schemas: "schemas",
  connectionString: "mongodb://localhost:27017/monarch",
});
