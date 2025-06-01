import { FileSystem, Path } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import * as TOML from "@iarna/toml";
import { Data, Effect } from "effect"
import os from 'os';

export class FSError extends Data.TaggedError("FSError")<{ readonly error: unknown }> { }

export class MyFS extends Effect.Service<MyFS>()("MyFS", {
    effect: Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const path = yield* Path.Path

        const homeDir = os.homedir();
        const inputDir = path.join(homeDir, "notemplate", "documents");
        const outputDir = path.join(inputDir, "json");

        const findTomlFiles: (dir?: string) => Effect.Effect<string[], FSError> = Effect.fn("findTomlFiles")(
            function* (dir) {
                if (!dir) {
                    dir = inputDir
                }
                const dirExists = yield* fs.exists(dir).pipe(
                    Effect.mapError((error) => new FSError({ error }))
                );
                if (!dirExists) {
                    return yield* Effect.fail(new FSError({ error: `Directory ${dir} does not exist` }));
                }

                const entries = yield* fs.readDirectory(dir)
                    .pipe(Effect.mapError((error) => new FSError({ error })))

                const tomlFiles: string[] = []

                for (const entry of entries) {
                    const fullPath = path.join(dir, entry)

                    const stat = yield* fs.stat(fullPath)
                        .pipe(Effect.mapError((error) => new FSError({ error })))

                    if (stat.type === "Directory") {
                        const subFiles = yield* findTomlFiles(fullPath)
                        tomlFiles.push(...subFiles)
                    } else if (stat.type === "File" && fullPath.endsWith(".toml")) {
                        tomlFiles.push(fullPath)
                    }
                }
                return tomlFiles
            }
        )

        const writeJsonFiles: (tomlFiles: string[]) => Effect.Effect<void, FSError> = Effect.fn("writeJsonFiles")(
            function* (tomlFiles) {
                yield* fs.makeDirectory(outputDir, { recursive: true })
                    .pipe(Effect.mapError((error) => new FSError({ error })));

                yield* Effect.log("Converting TOML files to JSON files...")
                yield* Effect.forEach(tomlFiles, (file) =>
                    Effect.gen(function* () {

                        const filePath = file;
                        const relativePath = path.relative(inputDir, file);
                        const outputFileName = relativePath.replace(".toml", ".json");
                        const outputFile = path.join(outputDir, outputFileName);

                        const tomlContent = yield* fs
                            .readFileString(filePath)
                            .pipe(Effect.mapError((error) => new FSError({ error })))

                        const jsonData = yield* Effect.try({
                            try: () => TOML.parse(tomlContent),
                            catch: (error) => new FSError({ error }),
                        });

                        const actualOutputDir = path.dirname(outputFile)

                        yield* fs
                            .makeDirectory(actualOutputDir, { recursive: true })
                            .pipe(Effect.mapError((error) => new FSError({ error })))

                        yield* fs
                            .writeFileString(outputFile, JSON.stringify(jsonData, null, 2))
                            .pipe(Effect.mapError((error) => new FSError({ error })))

                        yield* Effect.log(`${outputFile}`);

                    }),
                    { discard: false }
                );
            }
        )

        return { findTomlFiles, writeJsonFiles }
    }),
    dependencies: [NodeContext.layer]
}) { }
