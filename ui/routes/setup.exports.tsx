import { context } from "../context.server"
import type { Route } from "./+types/setup.exports"

export async function loader({ request }: Route.LoaderArgs) {
  const path = new URL(request.url).searchParams.get("path")
  if (!path) return []
  const exports = await context.entrypoint.getExports(path)
  return exports
}
