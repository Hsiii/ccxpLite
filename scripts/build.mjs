import { copyFileSync, cpSync, mkdtempSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const srcDir = join(projectRoot, "src");
const distDir = join(projectRoot, "dist");
const outputZip = join(distDir, "ccxpLite.zip");
const stagingDir = mkdtempSync(join(tmpdir(), "ccxp-lite-build-"));
const exportScriptPath = join(projectRoot, "scripts", "export_decaptcha_model.py");
const checkpointPath = join(projectRoot, "..", "ccxpDecaptcha", "decaptcha_best_val_seq.pt");
const generatedModelPath = join(srcDir, "content.decaptcha.model.js");
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
  "_locales"
];
const recursiveEntries = new Set(["assets", "_locales"]);

try {
  mkdirSync(distDir, { recursive: true });
  rmSync(outputZip, { force: true });

  if (existsSync(exportScriptPath) && existsSync(checkpointPath)) {
    const exportResult = spawnSync("python3", [exportScriptPath, "--checkpoint", checkpointPath, "--output", generatedModelPath], {
      cwd: projectRoot,
      stdio: "inherit"
    });

    if (exportResult.status !== 0) {
      throw new Error("decaptcha model export failed");
    }
  }

  if (!existsSync(generatedModelPath)) {
    throw new Error(`Missing generated decaptcha model file: ${generatedModelPath}`);
  }

  for (const fileName of filesToPack) {
    const sourcePath = join(srcDir, fileName);

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
    stdio: "inherit"
  });

  if (zipResult.status !== 0) {
    throw new Error("zip command failed");
  }

  process.stdout.write(`Built ${outputZip}\n`);
} finally {
  rmSync(stagingDir, { recursive: true, force: true });
}
