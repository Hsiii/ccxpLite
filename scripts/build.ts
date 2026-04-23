import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const srcDir = join(projectRoot, "src");
const compiledSrcDir = join(projectRoot, ".build", "src");
const distDir = join(projectRoot, "dist");
const unpackedDir = join(distDir, "unpacked");
const outputZip = join(distDir, "ccxpLite.zip");
const stagingDir = mkdtempSync(join(tmpdir(), "ccxp-lite-build-"));
const exportScriptPath = join(projectRoot, "scripts", "export_decaptcha_model.py");
const checkpointPath = join(projectRoot, "..", "ccxpDecaptcha", "out", "best.pt");
const generatedModelPath = join(srcDir, "content.decaptcha.model.ts");
const buildTsconfigPath = join(projectRoot, "tsconfig.build.json");
function copyTree(
  sourceDir: string,
  targetDir: string,
  shouldCopy: (sourcePath: string, isDirectory: boolean) => boolean,
) {
  mkdirSync(targetDir, { recursive: true });

  for (const entryName of readdirSync(sourceDir)) {
    const sourcePath = join(sourceDir, entryName);
    const targetPath = join(targetDir, entryName);
    const isDirectory = lstatSync(sourcePath).isDirectory();

    if (!shouldCopy(sourcePath, isDirectory)) {
      continue;
    }

    if (isDirectory) {
      copyTree(sourcePath, targetPath, shouldCopy);
      continue;
    }

    mkdirSync(dirname(targetPath), { recursive: true });
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

  if (existsSync(exportScriptPath) && existsSync(checkpointPath)) {
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

  if (!existsSync(generatedModelPath)) {
    throw new Error(`Missing generated decaptcha model file: ${generatedModelPath}`);
  }

  const compileResult = spawnSync("bunx", ["tsc", "-p", buildTsconfigPath], {
    cwd: projectRoot,
    stdio: "inherit",
  });

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

  process.stdout.write(`Built ${outputZip}\nUnpacked extension: ${unpackedDir}\n`);
} finally {
  rmSync(stagingDir, { recursive: true, force: true });
}
