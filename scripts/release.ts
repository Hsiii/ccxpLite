import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const projectRoot = process.cwd();
const supportedTargets = new Set(["all", "crx", "firefox"]);
const targetArgIndex = process.argv.indexOf("--target");
const target =
  targetArgIndex !== -1 && targetArgIndex + 1 < process.argv.length
    ? process.argv[targetArgIndex + 1]
    : "all";

if (!supportedTargets.has(target)) {
  throw new Error(`Unsupported release target: ${target}`);
}

const headCommitResult = spawnSync("git", ["rev-parse", "HEAD"], {
  cwd: projectRoot,
  encoding: "utf8",
});

if (headCommitResult.status !== 0) {
  throw new Error("Failed to resolve HEAD commit");
}

const targetCommitish = headCommitResult.stdout.trim();

const { version } = JSON.parse(readFileSync(path.join(projectRoot, "package.json"), "utf8")) as {
  version: string;
};
const tag = target === "all" ? `v${version}` : `${target}-v${version}`;
const releaseTitle = target === "all" ? `ccxpLite v${version}` : `ccxpLite ${target} ${tag}`;
const releaseAssets =
  target === "all"
    ? [
        path.join(projectRoot, "dist", "crx", `ccxpLite-crx-v${version}.zip`),
        path.join(projectRoot, "dist", "firefox", `ccxpLite-firefox-v${version}.xpi`),
      ]
    : [
        path.join(
          projectRoot,
          "dist",
          target,
          `ccxpLite-${target}-v${version}.${target === "firefox" ? "xpi" : "zip"}`,
        ),
      ];
const firefoxSourceZipPath = path.join(
  projectRoot,
  "dist",
  "firefox",
  `ccxpLite-firefox-v${version}-sources.zip`,
);

for (const releaseAsset of releaseAssets) {
  if (!existsSync(releaseAsset)) {
    if (target === "all") {
      process.stderr.write(`Archive not found: ${releaseAsset}\nRun "bun run build" first.\n`);
    } else {
      process.stderr.write(
        `Archive not found: ${releaseAsset}\nRun "bun run build:${target}" first.\n`,
      );
    }
    process.exit(1);
  }
}

if (target === "all" || target === "firefox") {
  if (!existsSync(firefoxSourceZipPath)) {
    process.stderr.write(
      `Firefox source archive not found: ${firefoxSourceZipPath}\nRun "bun run build:firefox" first.\n`,
    );
    process.exit(1);
  }
  releaseAssets.push(firefoxSourceZipPath);
}

const ghResult = spawnSync(
  "gh",
  [
    "release",
    "create",
    tag,
    ...releaseAssets,
    "--title",
    releaseTitle,
    "--draft",
    "--generate-notes",
    "--target",
    targetCommitish,
  ],
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

process.stdout.write(`Draft ${target} release ${tag} created with ${releaseAssets.join(", ")}\n`);
