#!/usr/bin/env node

import "dotenv/config"

import { createProgram } from "commandstruct"
import { Database } from "~/core/database"
import { dbCmd } from "./db"
import { studioCmd } from "./studio"

createProgram("monarch-cli")
  .provide({ database: Database })
  .commands(dbCmd, studioCmd)
  .build()
  .run()
