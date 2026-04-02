import { type Config } from "prettier";

export default {
  plugins: ["prettier-plugin-organize-imports", "prettier-plugin-tailwindcss"],
  semi: true,
  tabWidth: 2,
  printWidth: 120,
  trailingComma: "all",
} satisfies Config;
