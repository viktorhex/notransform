#!/usr/bin/env node

import * as NodeContext from "@effect/platform-node/NodeContext"
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as Effect from "effect/Effect"
import { run } from "./Cli.js"
import { MyFS } from "./MyFS.js"

run(process.argv).pipe(
  Effect.provide([NodeContext.layer, MyFS.Default]),
  NodeRuntime.runMain({ disableErrorReporting: false })
)
