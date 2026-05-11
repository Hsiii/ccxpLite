import {
  copyFileSync,
  existsSync,
  lstatSync,
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
const { version } = JSON.parse(readFileSync(path.join(projectRoot, "package.json"), "utf8")) as {
  version: string;
};
const srcDir = path.join(projectRoot, "src");
const compiledSrcDir = path.join(projectRoot, ".build", "src");
const distDir = path.join(projectRoot, "dist");
const unpackedDir = path.join(distDir, "unpacked");
const outputZip = path.join(distDir, `ccxpLite-v${version}.zip`);
const stagingDir = mkdtempSync(path.join(tmpdir(), "ccxp-lite-build-"));
const exportScriptPath = path.join(projectRoot, "scripts", "export_decaptcha_model.py");
const exportOauthScriptPath = path.join(projectRoot, "scripts", "export_oauth_decaptcha_model.py");
const generatedModelPath = path.join(srcDir, "login", "auth", "decaptcha.model.ts");
const generatedOauthModelPath = path.join(srcDir, "oauth", "decaptcha.model.ts");
const srcTsconfigPath = path.join(projectRoot, "tsconfig.src.json");

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

  copyTree(
    srcDir,
    stagingDir,
    (sourcePath, isDirectory) => isDirectory || !sourcePath.endsWith(".ts"),
  );
  copyTree(
    srcDir,
    unpackedDir,
    (sourcePath, isDirectory) => isDirectory || !sourcePath.endsWith(".ts"),
  );
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

  const zipResult = spawnSync("zip", ["-q", "-r", outputZip, "."], {
    cwd: stagingDir,
    stdio: "inherit",
  });

  if (zipResult.status !== 0) {
    throw new Error("zip command failed");
  }

  process.stdout.write(
    `Built ${outputZip}\nUnpacked extension: ${unpackedDir}\nVersion: ${version}\n`,
  );
} finally {
  rmSync(stagingDir, { recursive: true, force: true });
}
