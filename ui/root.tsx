import type { ReactNode } from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from "react-router";
import { PreventFlashOnWrongTheme, ThemeProvider, useTheme } from "remix-themes";
import { Entrypoint } from "~/core/entrypoint";
import { box } from "~/ui/lib/utils.server";
import type { Route } from "./+types/root";
import stylesheet from "./app.css?url";
import { TooltipProvider } from "./components/ui/tooltip";
import { themeSessionResolver } from "./session.server";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
  { rel: "stylesheet", href: stylesheet },
  { rel: "icon", href: "/favicon.png" },
];

export const meta: Route.MetaFunction = () => [
  { title: "Monarch Studio" },
  {
    name: "description",
    content: "Monarch Studio - Create, manage and view schemas, collections and relations",
  },
];

export async function loader({ request }: Route.LoaderArgs) {
  const entrypoint = box.get(Entrypoint);
  const configPath = request.headers.get("Config-Path");
  if (import.meta.env.DEV) {
    // fallback to example config only during development
    entrypoint.configPath = "examples/monarch.config.ts";
  } else if (configPath) {
    entrypoint.configPath = configPath;
  }

  const { getTheme } = await themeSessionResolver(request);
  return {
    theme: getTheme(),
  };
}

export function Layout(props: { children: ReactNode }) {
  const loaderData = useRouteLoaderData<Route.ComponentProps["loaderData"]>("root");

  return (
    <ThemeProvider specifiedTheme={loaderData?.theme ?? null} themeAction="/actions/theme">
      <Shell ssrTheme={!!loaderData?.theme}>{props.children}</Shell>
    </ThemeProvider>
  );
}

function Shell(props: { ssrTheme: boolean; children: ReactNode }) {
  const [theme] = useTheme();

  return (
    <html lang="en" className={theme ?? undefined} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <PreventFlashOnWrongTheme ssrTheme={props.ssrTheme} />
        <Links />
      </head>
      <body className="h-screen overflow-hidden text-sm">
        <TooltipProvider>{props.children}</TooltipProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details = error.status === 404 ? "The requested page could not be found." : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="container mx-auto p-4 pt-16">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full overflow-x-auto p-4">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
