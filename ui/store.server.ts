import { createCookieSessionStorage } from "react-router"
import { createThemeSessionResolver } from "remix-themes"
import type { Project } from "~/core/models"

type Store = {
  projects: Record<string, Project>
}

export const sessionStore = createCookieSessionStorage<Store>({
  cookie: {
    name: "monarch_store",
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: "/",
    sameSite: "lax",
    secure: false,
    secrets: ["notsecret"],
  },
})

export const themeSessionResolver = createThemeSessionResolver(sessionStore)
