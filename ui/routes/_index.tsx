import { redirect } from "react-router"
import { context } from "../context.server"
import { sessionStore } from "../store.server"
import type { Route } from "./+types/_index"

export async function loader({ request }: Route.LoaderArgs) {
  const cwd = process.cwd()
  const session = await sessionStore.getSession(request.headers.get("Cookie"))
  const projects = session.get("projects")
  const project = projects ? projects[cwd] : undefined
  if (!project) throw redirect("/setup")

  const dbs = await context.database.list()
  const files = await context.entrypoint.getFiles()

  return {
    dbs,
    files,
    project,
  }
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { project } = loaderData

  return (
    <main className="mx-auto mt-40 max-w-md">
      <div className="flex flex-col gap-8">
        <h1 className="text-center text-3xl font-bold">Monarch Studio</h1>

        <pre>{JSON.stringify(project, null, 2)}</pre>
      </div>
    </main>
  )
}
