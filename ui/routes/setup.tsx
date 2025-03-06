import { CheckCircle2Icon, CheckIcon, ClockIcon, SunIcon } from "lucide-react"
import path from "node:path"
import { type ChangeEvent } from "react"
import { Outlet } from "react-router"
import { Theme, useTheme } from "remix-themes"
import {
  getDraftProject,
  initialDraftProject,
  type DraftProject,
} from "../utils/draft-project"
import type { Route } from "./+types/setup"

export async function loader() {
  const cwd = process.cwd()
  const basename = path.basename(cwd)
  return { cwd, basename, draft: initialDraftProject }
}

export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  const serverData = await serverLoader()
  return {
    ...serverData,
    draft: getDraftProject(serverData.draft),
  }
}
clientLoader.hydrate = true as const

export function HydrateFallback() {
  return (
    <div className="flex h-screen">
      <aside className="w-80 bg-muted"></aside>
      <main className="flex-1"></main>
    </div>
  )
}

export default function SetupLayout({ loaderData }: Route.ComponentProps) {
  const [theme, setTheme] = useTheme()
  const changeTheme = (e: ChangeEvent<HTMLSelectElement>) => {
    switch (e.target.value) {
      case "light":
        return setTheme(Theme.LIGHT)
      case "dark":
        return setTheme(Theme.DARK)
      case "system":
        return setTheme(null)
    }
  }

  const project = loaderData.draft
  const steps = [
    { step: 1, name: "Connect schema" },
    { step: 2, name: "Connect database" },
    { step: 3, name: "Finish setup" },
  ] satisfies { step: DraftProject["step"]; name: string }[]

  return (
    <div className="flex h-screen">
      <aside className="flex w-80 flex-col gap-6 bg-muted px-6">
        <div className="flex items-center justify-between border-b py-5">
          <a href="/" className="font-medium">
            Monarch Studio
          </a>
          <p className="text-xs text-muted-foreground">Complete setup</p>
        </div>

        <div>
          <h2 className="mb-1">New Project</h2>
          <p className="text-xs text-muted-foreground">
            Create a new project for the current directory by providing a schema
            file and database connection string.
          </p>
        </div>

        <ul className="space-y-4">
          {steps.map((step, i) => (
            <li key={step.name} className="flex items-center gap-2">
              <div
                data-active={step.step === project.step}
                className="grid size-5 place-items-center rounded-full border border-foreground bg-foreground text-2xs text-background data-[active=true]:border-[3px] data-[active=true]:bg-transparent"
              >
                {step.step < project.step ? (
                  <CheckIcon className="size-3.5" />
                ) : (
                  step.step > project.step && <span>{i + 1}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{step.name}</p>
            </li>
          ))}
        </ul>

        <div className="mt-auto border-t py-5">
          <div className="flex w-full items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <SunIcon className="size-5" />
              Toggle theme
            </div>

            <select
              className="w-20 rounded-md border bg-transparent px-2 py-1 text-xs"
              value={theme ?? "system"}
              onChange={changeTheme}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-scroll px-24 py-7">
        <h1 className="mb-4 text-2xl font-medium">Create new project</h1>
        <div className="flex flex-col gap-y-12 lg:flex-row lg:items-start">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
          <section className="lg:ml-12 lg:border-l lg:pl-12">
            <DraftProject
              dir={loaderData.cwd}
              basename={loaderData.basename}
              draft={project}
            />
          </section>
        </div>
      </main>
    </div>
  )
}

function DraftProject(props: {
  dir: string
  basename: string
  draft: DraftProject
}) {
  return (
    <div className="flex size-60 flex-col justify-between gap-4 rounded-md border bg-muted p-4">
      <h3 className="text-lg font-medium">{props.basename}</h3>

      <div className="grid grid-cols-2 divide-x">
        <div className="flex items-center gap-2 p-4">
          <p className="text-xs">Schema</p>
          {props.draft.step >= 2 ? (
            <CheckCircle2Icon className="size-4 shrink-0 text-emerald-600" />
          ) : (
            <ClockIcon className="size-4 shrink-0 text-zinc-600" />
          )}
        </div>
        <div className="flex items-center gap-2 p-4">
          <p className="text-xs">Database</p>
          {props.draft.step >= 3 ? (
            <CheckCircle2Icon className="size-4 shrink-0 text-emerald-600" />
          ) : (
            <ClockIcon className="size-4 shrink-0 text-zinc-600" />
          )}
        </div>
      </div>

      <p className="break-words text-xs text-muted-foreground underline decoration-dotted">
        {props.dir}
      </p>
    </div>
  )
}
