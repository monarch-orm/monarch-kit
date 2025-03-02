import { createRequestHandler } from "@react-router/express";
import { createCommand, flag } from "commandstruct";
import compression from "compression";
import express from "express";
import morgan from "morgan";
import os from "node:os";
import path from "node:path";
import url from "node:url";
import { type ServerBuild } from "react-router";
import type { Database } from "~/core/database";

export const studioCmd = createCommand("studio")
  .use<{ database: Database }>()
  .flags({
    port: flag("web server port").char("p").optionalParam("number", 6543),
  })
  .action(async ({ flags }) => {
    let buildPath = import.meta.dirname;
    if (buildPath.endsWith("dist")) {
      buildPath = path.join(buildPath, "ui/server/index.js");
    } else {
      // during development the ui dir different
      buildPath = path.join(buildPath, "../dist/ui/server/index.js");
    }

    const build: ServerBuild | null = await import(
      url.pathToFileURL(buildPath).href
    ).catch(() => null);
    if (!build) {
      return console.error(
        `[monarch-studio] err: missing build output at ${buildPath}`
      );
    }

    runServer(build, flags.port);
  });

function runServer(build: ServerBuild, port: number) {
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
        `[monarch-studio] http://localhost:${port} (http://${address}:${port})`
      );
    }
  }

  const app = express();
  app.disable("x-powered-by");
  app.use(compression());
  app.use(
    path.posix.join(build.publicPath, "assets"),
    express.static(path.join(build.assetsBuildDirectory, "assets"), {
      immutable: true,
      maxAge: "1y",
    })
  );
  app.use(
    build.publicPath,
    express.static(build.assetsBuildDirectory, {
      immutable: true,
      maxAge: "1y",
    })
  );
  app.use(express.static("public", { maxAge: "1h" }));
  app.use(morgan("tiny"));
  app.all("*", createRequestHandler({ build, mode: "production" }));

  const server = process.env.HOST
    ? app.listen(port, process.env.HOST, onListen)
    : app.listen(port, onListen);

  process.once("SIGTERM", () => server?.close(console.error));
  process.once("SIGINT", () => server?.close(console.error));
}
