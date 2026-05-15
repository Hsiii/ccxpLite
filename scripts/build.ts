import {
  copyFileSync,
  existsSync,
  lstatSync,
  writeFileSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  rmSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import path from "node:path";

const projectRoot = process.cwd();
const supportedTargets = new Set(["crx", "firefox"]);
const targetArgIndex = process.argv.indexOf("--target");
const target =
  targetArgIndex !== -1 && targetArgIndex + 1 < process.argv.length
    ? process.argv[targetArgIndex + 1]
    : "crx";

if (!supportedTargets.has(target)) {
  throw new Error(`Unsupported build target: ${target}`);
}

const { version } = JSON.parse(readFileSync(path.join(projectRoot, "package.json"), "utf8")) as {
  version: string;
};
const packageRoot = path.join(projectRoot, target);
const srcDir = path.join(projectRoot, "src");
const compiledSrcDir = path.join(projectRoot, ".build", "src");
const distDir = path.join(packageRoot, "dist");
const unpackedDir = path.join(distDir, "unpacked");
const archiveExtension = target === "firefox" ? "xpi" : "zip";
const outputZip = path.join(distDir, `ccxpLite-${target}-v${version}.${archiveExtension}`);
const stagingDir = mkdtempSync(path.join(tmpdir(), "ccxp-lite-build-"));
const exportScriptPath = path.join(projectRoot, "scripts", "export_decaptcha_model.py");
const exportOauthScriptPath = path.join(projectRoot, "scripts", "export_oauth_decaptcha_model.py");
const generatedModelPath = path.join(srcDir, "login", "auth", "decaptcha.model.ts");
const generatedOauthModelPath = path.join(srcDir, "oauth", "decaptcha.model.ts");
const srcTsconfigPath = path.join(projectRoot, "tsconfig.src.json");
const baseManifestPath = path.join(srcDir, "manifest.base.json");
const targetManifestOverridePath = path.join(packageRoot, "src", "manifest.override.json");

function resolveCheckpointPath(relativeSegments: readonly string[]) {
  const repoCandidates = [
    path.resolve(projectRoot, "..", "ccxpDecaptcha"),
    path.resolve(projectRoot, "..", "..", "Archive", "ccxpDecaptcha"),
  ];
  for (const candidate of repoCandidates) {
    const resolved = path.join(candidate, ...relativeSegments);
    if (existsSync(resolved)) {
      return resolved;
    }
  }
  return undefined;
}

function copyTree(
  sourceDir: string,
  targetDir: string,
  shouldCopy: (sourcePath: string, isDirectory: boolean) => boolean,
) {
  mkdirSync(targetDir, { recursive: true });

  for (const entryName of readdirSync(sourceDir)) {
    const sourcePath = path.join(sourceDir, entryName);
    const targetPath = path.join(targetDir, entryName);
    const isDirectory = lstatSync(sourcePath).isDirectory();

    if (!shouldCopy(sourcePath, isDirectory)) {
      continue;
    }

    if (isDirectory) {
      copyTree(sourcePath, targetPath, shouldCopy);
      continue;
    }

    mkdirSync(path.dirname(targetPath), { recursive: true });
    copyFileSync(sourcePath, targetPath);
  }
}

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && value.constructor === Object;
}

function mergeManifestEntries(
  base: Readonly<Record<string, unknown>>,
  override: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const merged = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const baseValue = merged[key];

    if (value !== undefined && isRecordObject(value) && isRecordObject(baseValue)) {
      merged[key] = mergeManifestEntries(baseValue, value);
      continue;
    }

    merged[key] = value;
  }

  return merged;
}

function shouldCopySourcePath(sourcePath: string, isDirectory: boolean) {
  if (isDirectory) {
    return true;
  }

  return !sourcePath.endsWith(".ts") && path.basename(sourcePath) !== "manifest.base.json";
}

function writeManifest(outputPath: string) {
  const baseManifest = JSON.parse(readFileSync(baseManifestPath, "utf8")) as Record<
    string,
    unknown
  >;
  const targetOverride = JSON.parse(readFileSync(targetManifestOverridePath, "utf8")) as Record<
    string,
    unknown
  >;
  const manifest = mergeManifestEntries(baseManifest, targetOverride);
  manifest.version = version;
  writeFileSync(outputPath, `${JSON.stringify(manifest, undefined, 2)}\n`);
}

try {
  mkdirSync(distDir, { recursive: true });
  mkdirSync(unpackedDir, { recursive: true });
  rmSync(compiledSrcDir, { recursive: true, force: true });
  rmSync(unpackedDir, { recursive: true, force: true });
  rmSync(outputZip, { force: true });
  mkdirSync(unpackedDir, { recursive: true });

  const checkpointPath = resolveCheckpointPath(["out", "best.pt"]);
  if (existsSync(exportScriptPath) && checkpointPath !== undefined) {
    const exportResult = spawnSync(
      "python3",
      [exportScriptPath, "--checkpoint", checkpointPath, "--output", generatedModelPath],
      {
        cwd: projectRoot,
        stdio: "inherit",
      },
    );

    if (exportResult.status !== 0) {
      throw new Error("decaptcha model export failed");
    }
  }

  const oauthCheckpointPath = resolveCheckpointPath(["out", "oauth", "best.pt"]);
  if (existsSync(exportOauthScriptPath) && oauthCheckpointPath !== undefined) {
    const exportResult = spawnSync(
      "python3",
      [
        exportOauthScriptPath,
        "--checkpoint",
        oauthCheckpointPath,
        "--output",
        generatedOauthModelPath,
      ],
      {
        cwd: projectRoot,
        stdio: "inherit",
      },
    );

    if (exportResult.status !== 0) {
      throw new Error("oauth decaptcha model export failed");
    }
  }

  if (!existsSync(generatedModelPath)) {
    throw new Error(`Missing generated decaptcha model file: ${generatedModelPath}`);
  }

  if (!existsSync(generatedOauthModelPath)) {
    throw new Error(`Missing generated OAuth decaptcha model file: ${generatedOauthModelPath}`);
  }

  const prettierResult = spawnSync(
    "bunx",
    ["prettier", "--write", generatedModelPath, generatedOauthModelPath],
    {
      cwd: projectRoot,
      stdio: "inherit",
    },
  );

  if (prettierResult.status !== 0) {
    throw new Error("Generated model formatting failed");
  }

  const compileResult = spawnSync(
    "bunx",
    [
      "tsc",
      "-p",
      srcTsconfigPath,
      "--noEmit",
      "false",
      "--rootDir",
      "./src",
      "--outDir",
      "./.build/src",
    ],
    {
      cwd: projectRoot,
      stdio: "inherit",
    },
  );

  if (compileResult.status !== 0) {
    throw new Error("TypeScript extension build failed");
  }

  copyTree(srcDir, stagingDir, shouldCopySourcePath);
  copyTree(srcDir, unpackedDir, shouldCopySourcePath);
  copyTree(
    compiledSrcDir,
    stagingDir,
    (sourcePath, isDirectory) => isDirectory || sourcePath.endsWith(".js"),
  );
  copyTree(
    compiledSrcDir,
    unpackedDir,
    (sourcePath, isDirectory) => isDirectory || sourcePath.endsWith(".js"),
  );

  writeManifest(path.join(stagingDir, "manifest.json"));
  writeManifest(path.join(unpackedDir, "manifest.json"));

  const zipResult = spawnSync("zip", ["-q", "-r", outputZip, "."], {
    cwd: stagingDir,
    stdio: "inherit",
  });

  if (zipResult.status !== 0) {
    throw new Error("zip command failed");
  }

  process.stdout.write(
    `Built ${outputZip}\nUnpacked extension: ${unpackedDir}\nTarget: ${target}\nVersion: ${version}\n`,
  );
} finally {
  rmSync(stagingDir, { recursive: true, force: true });
}
