import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["cli/index.ts", "lib/index.ts"],
  format: "esm",
  dts: true,
  clean: false,
});
