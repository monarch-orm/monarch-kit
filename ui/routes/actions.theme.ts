import { createThemeAction } from "remix-themes";
import { themeSessionResolver } from "~/ui/store.server";

export const action = createThemeAction(themeSessionResolver);
