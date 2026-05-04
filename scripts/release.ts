import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const projectRoot = process.cwd();
const { version } = JSON.parse(readFileSync(path.join(projectRoot, "package.json"), "utf8")) as {
  version: string;
};
const tag = `v${version}`;
const zipPath = path.join(projectRoot, "dist", `ccxpLite-v${version}.zip`);

if (!existsSync(zipPath)) {
  process.stderr.write(`Zip not found: ${zipPath}\nRun "bun run build" first.\n`);
  process.exit(1);
}

const gitTagResult = spawnSync("git", ["tag", tag], {
  cwd: projectRoot,
  stdio: "inherit",
});

if (gitTagResult.status !== 0) {
  throw new Error(`git tag ${tag} failed (may already exist)`);
}

const gitPushTagResult = spawnSync("git", ["push", "origin", tag], {
  cwd: projectRoot,
  stdio: "inherit",
});

if (gitPushTagResult.status !== 0) {
  throw new Error("git push tag failed");
}

const ghResult = spawnSync(
  "gh",
  ["release", "create", tag, zipPath, "--title", `ccxpLite ${tag}`, "--draft", "--generate-notes"],
  {
    cwd: projectRoot,
    stdio: "inherit",
  },
);

if (ghResult.status !== 0) {
  throw new Error("gh release create failed");
}

const openResult = spawnSync("gh", ["release", "view", tag, "--web"], {
  cwd: projectRoot,
  stdio: "inherit",
});

if (openResult.status !== 0) {
  process.stderr.write("Failed to open release in browser\n");
}

process.stdout.write(`Draft release ${tag} created with ${zipPath}\n`);
