import type { Project } from "~/core/models"

export type DraftProject =
  | {
      step: 1
      project: null
    }
  | {
      step: 2
      project: Pick<Project, "file" | "export">
    }
  | {
      step: 3
      project: Pick<Project, "file" | "export" | "dbname" | "dbs">
    }

export const initialDraftProject: DraftProject = { step: 1, project: null }

export function getDraftProject(fallback?: DraftProject) {
  const draftJSON = sessionStorage.getItem("project_draft")
  return draftJSON
    ? (JSON.parse(draftJSON) as DraftProject)
    : (fallback ?? { step: 1, project: null })
}
export function setDraftProject(draft: DraftProject) {
  sessionStorage.setItem("project_draft", JSON.stringify(draft))
}

export function removeDraftProject() {
  sessionStorage.removeItem("project_draft")
}

export function getPreviousDraftProject(): DraftProject {
  const draft = getDraftProject()
  switch (draft.step) {
    case 3:
      return {
        step: 2,
        project: {
          file: draft.project.file,
          export: draft.project.export,
        },
      }
    case 2:
    default:
      return initialDraftProject
  }
}
