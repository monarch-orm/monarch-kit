import { createRequestHandler } from "@react-router/express";
import { command, flag } from "commandstruct";
import compression from "compression";
import express from "express";
import morgan from "morgan";
import os from "node:os";
import path from "node:path";
import url from "node:url";
import { type ServerBuild } from "react-router";
import { Entrypoint } from "~/core/entrypoint";
import type { ProgramFlags } from ".";

export const studioCmd = command("studio")
  .programFlags<ProgramFlags>()
  .flags({
    port: flag("web server port").char("p").optionalParam("number", 6543),
  })
  .action(async ({ flags }, box) => {
    const dirname = import.meta.dirname;
    const isDev = !dirname.endsWith("dist/cli");
    // during development the ui dir is different
    // development entry is at cli/studio.ts
    // production entry is at dist/cli/index.ts
    const buildPath = path.resolve(dirname, isDev ? "../dist" : "..");
    const buildOutputPath = path.join(buildPath, "ui/server/index.js");

    const build: ServerBuild | null = await import(url.pathToFileURL(buildOutputPath).href).catch(() => null);
    if (!build) {
      return console.error(`[monarch-studio] err: missing build output at ${buildOutputPath}`);
    }

    // update entrypoint config path
    if (flags.config) {
      const entrypoint = box.get(Entrypoint);
      entrypoint.configPath = flags.config;
    }

    // fallback to example config only during development
    const configPath = flags.config ?? (isDev ? "examples/monarch.config" : undefined);

    runServer({ build, buildPath, configPath, port: flags.port });
  });

function runServer(options: { build: ServerBuild; buildPath: string; configPath?: string; port: number }) {
  function onListen() {
    const address =
      process.env.HOST ||
      Object.values(os.networkInterfaces())
        .flat()
        .find((ip) => String(ip?.family).includes("4") && !ip?.internal)?.address;

    console.log(
      `[monarch-studio] Server running on http://localhost:${options.port}${address ? ` (http://${address}:${options.port})` : ""}`,
    );
  }

  const app = express();
  app.disable("x-powered-by");
  app.use(compression());

  const assetsBuildDirectory = path.join(options.buildPath, "..", options.build.assetsBuildDirectory);
  app.use(
    path.posix.join(options.build.publicPath, "assets"),
    express.static(path.join(assetsBuildDirectory, "assets"), {
      immutable: true,
      maxAge: "1y",
    }),
  );
  app.use(
    options.build.publicPath,
    express.static(assetsBuildDirectory, {
      immutable: true,
      maxAge: "1y",
    }),
  );
  app.use(morgan("tiny"));
  app.all(
    "/{*splat}",
    (req, _res, next) => {
      console.log({ configPath: options.configPath });
      req.headers["config-path"] = options.configPath;
      next();
    },
    createRequestHandler({
      build: options.build,
      mode: "production",
    }),
  );

  const server = process.env.HOST
    ? app.listen(options.port, process.env.HOST, onListen)
    : app.listen(options.port, onListen);

  process.once("SIGTERM", () => server?.close(console.error));
  process.once("SIGINT", () => server?.close(console.error));
}
