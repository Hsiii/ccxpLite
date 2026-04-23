import { copyFileSync, cpSync, mkdtempSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const srcDir = join(projectRoot, "src");
const compiledSrcDir = join(projectRoot, ".build", "src");
const distDir = join(projectRoot, "dist");
const outputZip = join(distDir, "ccxpLite.zip");
const stagingDir = mkdtempSync(join(tmpdir(), "ccxp-lite-build-"));
const exportScriptPath = join(projectRoot, "scripts", "export_decaptcha_model.py");
const checkpointPath = join(projectRoot, "..", "ccxpDecaptcha", "out", "best.pt");
const generatedModelPath = join(srcDir, "content.decaptcha.model.ts");
const buildTsconfigPath = join(projectRoot, "tsconfig.build.json");
const filesToPack = [
  "manifest.json",
  "content.js",
  "content.shared.js",
  "content.sidebar.js",
  "content.decaptcha.model.js",
  "content.decaptcha.js",
  "content.landing.js",
  "content.css",
  "content.shared.css",
  "content.landing.css",
  "content.main.css",
  "content.sidebar.css",
  "assets",
  "_locales",
];
const recursiveEntries = new Set(["assets", "_locales"]);

try {
  mkdirSync(distDir, { recursive: true });
  rmSync(compiledSrcDir, { recursive: true, force: true });
  rmSync(outputZip, { force: true });

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

  for (const fileName of filesToPack) {
    const sourceBaseDir = fileName.endsWith(".js") ? compiledSrcDir : srcDir;
    const sourcePath = join(sourceBaseDir, fileName);

    if (!existsSync(sourcePath)) {
      throw new Error(`Missing required source file: ${sourcePath}`);
    }

    const destinationPath = join(stagingDir, fileName);

    if (recursiveEntries.has(fileName)) {
      cpSync(sourcePath, destinationPath, { recursive: true });
      continue;
    }

    copyFileSync(sourcePath, destinationPath);
  }

  const zipResult = spawnSync("zip", ["-q", "-r", outputZip, ...filesToPack], {
    cwd: stagingDir,
    stdio: "inherit",
  });

  if (zipResult.status !== 0) {
    throw new Error("zip command failed");
  }

  process.stdout.write(`Built ${outputZip}\n`);
} finally {
  rmSync(stagingDir, { recursive: true, force: true });
}
