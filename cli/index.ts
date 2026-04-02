#!/usr/bin/env node

import "dotenv/config";

import { flag, program } from "commandstruct";
import { collectionsCmd } from "./collections";
import { countCmd } from "./count";
import { deleteCmd } from "./delete";
import { describeCmd } from "./describe";
import { dropCmd } from "./drop";
import { initCmd } from "./init";
import { insertCmd } from "./insert";
import { queryCmd } from "./query";
import { studioCmd } from "./studio";
import { updateCmd } from "./update";

const programFlags = {
  config: flag("monarch config path").optionalParam("string"),
};
export type ProgramFlags = typeof programFlags;

program("monarch")
  .flags(programFlags)
  .commands(
    collectionsCmd,
    describeCmd,
    queryCmd,
    insertCmd,
    countCmd,
    updateCmd,
    deleteCmd,
    dropCmd,
    initCmd,
    studioCmd,
  )
  .build()
  .run({ errorOnUnknown: true });
