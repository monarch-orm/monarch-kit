import { ChevronLeftIcon } from "lucide-react"
import { useState, type FormEvent } from "react"
import { redirect, useFetcher, useRevalidator } from "react-router"
import {
  createAction,
  matchAction,
  type InferActionInput,
} from "react-router-action"
import { z } from "zod"
import type { DirTree } from "~/core/entrypoint"
import { SchemaSelector } from "../components/schema-selector"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { context } from "../context.server"
import { sessionStore } from "../store.server"
import {
  getDraftProject,
  getPreviousDraftProject,
  initialDraftProject,
  removeDraftProject,
  setDraftProject,
  type DraftProject,
} from "../utils/draft-project"
import type { Route } from "./+types/setup._index"

const completeSetup = createAction({
  schema: z.object({
    file: z.string(),
    export: z.string(),
    dbname: z.string(),
    dburl: z.string(),
  }),
  async handler(ctx, { request }) {
    const session = await sessionStore.getSession(request.headers.get("Cookie"))
    session.set("projects", {
      [process.cwd()]: {
        file: ctx.input.file,
        export: ctx.input.export,
        dbname: ctx.input.dbname,
        dbs: { [ctx.input.dbname]: ctx.input.dburl },
      },
    })
    throw redirect("/", {
      headers: {
        "Set-Cookie": await sessionStore.commitSession(session),
      },
    })
  },
})

export async function action(args: Route.ActionArgs) {
  return matchAction(args, { completeSetup })
}

export async function loader({ request }: Route.LoaderArgs) {
  const cwd = process.cwd()
  const session = await sessionStore.getSession(request.headers.get("Cookie"))
  const project = await context.entrypoint.getProject(session.get("projects"))
  if (project) throw redirect("/")

  const files = await context.entrypoint.getFiles()
  return { cwd, draft: initialDraftProject, files }
}

export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  const serverData = await serverLoader()
  return {
    ...serverData,
    draft: getDraftProject(serverData.draft),
  }
}
clientLoader.hydrate = true

export default function Setup({ loaderData }: Route.ComponentProps) {
  switch (loaderData.draft.step) {
    case 3:
      return <CompleteSetup draft={loaderData.draft} />
    case 2:
      return <ConnectDatabase />
    case 1:
    default:
      return (
        <ConnectSchema
          tree={loaderData.files.tree}
          suggestions={loaderData.files.suggestions}
        />
      )
  }
}

function ConnectSchema(props: { tree: DirTree; suggestions: string[] }) {
  const revalidator = useRevalidator()
  const [value, setValue] = useState<{
    file: string
    identifier: string
  }>()

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!value) return
    const draft = getDraftProject()
    if (draft.step === 1) {
      setDraftProject({
        step: 2,
        project: {
          file: value.file,
          export: value.identifier,
        },
      })
    } else {
      removeDraftProject()
    }
    revalidator.revalidate()
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <p className="text-xs">
        Select file containing a monarch database export
      </p>

      <SchemaSelector
        tree={props.tree}
        suggestions={props.suggestions}
        onSelect={setValue}
      />

      <div className="mt-4 flex justify-between gap-4">
        <Button disabled={!value}>Continue</Button>
      </div>
    </form>
  )
}

function ConnectDatabase() {
  const revalidator = useRevalidator()

  const submitAction = (formData: FormData) => {
    const dbname = formData.get("dbname") as string
    const dburl = formData.get("dburl") as string
    if (!dbname || !dburl) return
    const draft = getDraftProject()
    if (draft.step === 2) {
      setDraftProject({
        step: 3,
        project: {
          ...draft.project,
          dbname,
          dbs: { [dbname]: dburl },
        },
      })
    } else {
      removeDraftProject()
    }
    revalidator.revalidate()
  }

  const handleBack = () => {
    setDraftProject(getPreviousDraftProject())
    revalidator.revalidate()
  }

  return (
    <form action={submitAction} className="grid gap-4">
      <input type="hidden" name="_action" value="connectDatabase" />
      <div className="grid gap-1">
        <label className="text-xs font-medium">Database name</label>
        <Input
          type="text"
          name="dbname"
          placeholder="Enter database name"
          defaultValue="Default"
        />
      </div>
      <div className="grid gap-1">
        <label className="text-xs font-medium">Database URL</label>
        <Input type="url" name="dburl" placeholder="Enter database URL" />
      </div>

      <p className="text-xs text-muted-foreground">
        You can add multiple database connections and switch between them.
      </p>

      <div className="mt-4 flex justify-between gap-4">
        <Button type="button" variant="ghost" onClick={handleBack}>
          <ChevronLeftIcon className="size-4" /> Go back
        </Button>
        <Button>Continue</Button>
      </div>
    </form>
  )
}

function CompleteSetup({
  draft,
}: {
  draft: Extract<DraftProject, { step: 3 }>
}) {
  const revalidator = useRevalidator()
  const fetcher = useFetcher<typeof action>()

  const submitAction = async () => {
    const data = {
      file: draft.project.file,
      export: draft.project.export,
      dbname: draft.project.dbname,
      dburl: draft.project.dbs[draft.project.dbname]!,
    } satisfies InferActionInput<typeof completeSetup>
    await fetcher.submit(
      {
        _action: "completeSetup",
        ...data,
      },
      { method: "POST" },
    )
    removeDraftProject()
  }

  const handleBack = () => {
    setDraftProject(getPreviousDraftProject())
    revalidator.revalidate()
  }

  return (
    <form action={submitAction} className="grid gap-4">
      <p className="text-xs text-muted-foreground">
        Initialize monarch studio for this project.
      </p>

      <div className="flex items-center justify-center p-12">
        <p className="text-xl font-light">{"You're all set 👍"}</p>
      </div>

      <div className="mt-4 flex justify-between gap-4">
        <Button type="button" variant="ghost" onClick={handleBack}>
          <ChevronLeftIcon className="size-4" /> Go back
        </Button>
        <Button>Complete setup</Button>
      </div>
    </form>
  )
}
