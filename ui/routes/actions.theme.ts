import type { Theme } from "remix-themes";
import { themeSessionResolver } from "~/ui/session.server";
import type { Route } from "./+types/actions.theme";

// createThemeAction from remix-themes deletes the entire session cookie
// when setting theme to null. Manually set the session to avoid this.
export async function action({ request }: Route.ActionArgs) {
  const { theme } = await request.json();
  const session = await themeSessionResolver(request);
  session.setTheme(theme as Theme);

  return Response.json(
    { success: true },
    {
      status: 200,
      headers: {
        "Set-Cookie": await session.commit(),
      },
    },
  );
}
