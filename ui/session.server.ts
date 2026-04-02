import { createCookieSessionStorage } from "react-router";
import { createThemeSessionResolver } from "remix-themes";

type Store = {
  overviewLayout: "list" | "grid";
};

export const sessionStore = createCookieSessionStorage<Store>({
  cookie: {
    name: "monarch_store",
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: "/",
    sameSite: "lax",
    secure: false,
    secrets: ["public"],
    isSigned: false,
  },
});

export const themeSessionResolver = createThemeSessionResolver(sessionStore);
