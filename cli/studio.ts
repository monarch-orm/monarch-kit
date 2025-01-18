import { createRequestHandler } from "@remix-run/express";
import { type ServerBuild, installGlobals } from "@remix-run/node";
import { createCommand, flag } from "commandstruct";
import compression from "compression";
import express from "express";
import morgan from "morgan";
import os from "node:os";
import path from "node:path";
import url from "node:url";
import type { Database } from "~/core/database";

export const studioCmd = createCommand("studio")
  .use<{ database: Database }>()
  .flags({
    port: flag("web server port").char("p").optionalParam("number", 8080),
  })
  .action(async ({ flags }, ctx) => {
    const buildPath = path.resolve("dist/studio/server/index.js");
    const build: ServerBuild | null = await import(
      url.pathToFileURL(buildPath).href
    ).catch(() => null);
    if (!build) {
      return console.error("[monarch-studio] err: missing build output");
    }

    runServer(build, flags.port);
  });

async function runServer(build: ServerBuild, port: number) {
  installGlobals({ nativeFetch: build.future.v3_singleFetch });

  const app = express();
  app.disable("x-powered-by");
  app.use(compression());
  app.use(
    build.publicPath,
    express.static(build.assetsBuildDirectory, {
      immutable: true,
      maxAge: "1y",
    }),
  );
  app.use(express.static("public", { maxAge: "1h" }));
  app.use(morgan("tiny"));
  app.all("*", createRequestHandler({ build, mode: "production" }));

  function onListen() {
    const address =
      process.env.HOST ||
      Object.values(os.networkInterfaces())
        .flat()
        .find((ip) => String(ip?.family).includes("4") && !ip?.internal)
        ?.address;

    if (!address) {
      console.log(`[monarch-studio] http://localhost:${port}`);
    } else {
      console.log(
        `[monarch-studio] http://localhost:${port} (http://${address}:${port})`,
      );
    }
  }

  const server = process.env.HOST
    ? app.listen(port, process.env.HOST, onListen)
    : app.listen(port, onListen);

  process.once("SIGTERM", () => server?.close(console.error));
  process.once("SIGINT", () => server?.close(console.error));
}
