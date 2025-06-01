import * as Command from "@effect/cli/Command"
import { Effect } from "effect"
import { MyFS, FSError } from "./MyFS.js"

function program(): Effect.Effect<void, FSError, MyFS> {
  return Effect.gen(function* () {
    const { findTomlFiles, writeJsonFiles } = yield* MyFS
    const tomlFiles = yield* findTomlFiles();
    yield* writeJsonFiles(tomlFiles);
    yield* Effect.log("JSON files written successfully");
  })
}

const command = Command.make("notransform", {}, program);

export const run = (args: readonly string[]) =>
  Command.run(command, {
    name: "notransform",
    version: "1.0.0",
  })(args);
