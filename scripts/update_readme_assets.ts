import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const captureDir = path.join(projectRoot, "assets", "showcase", "readme");
const demoDir = path.join(projectRoot, "demo");

const targets = [
  { mode: "menu", stage: "login" },
  { mode: "menu", stage: "main" },
  { mode: "menu", stage: "main-expanded" },
  { mode: "menu", stage: "select-courses-selected" },
  { mode: "sidebar", stage: "login" },
  { mode: "sidebar", stage: "main" },
  { mode: "sidebar", stage: "main-expanded" },
  { mode: "sidebar", stage: "select-courses-selected" },
] as const;

type CaptureTarget = (typeof targets)[number];

function resolveSourcePath(target: CaptureTarget) {
  return path.join(captureDir, `${target.mode}-${target.stage}.png`);
}

function resolveDestinationPath(target: CaptureTarget) {
  return path.join(demoDir, target.mode, `${target.stage}.png`);
}

const missingSources = targets.filter((target) => !existsSync(resolveSourcePath(target)));

if (missingSources.length > 0) {
  const message = [
    "Missing README capture assets.",
    "Run `bun run capture` first and complete all prompts.",
    ...missingSources.map((target) => `- ${path.relative(projectRoot, resolveSourcePath(target))}`),
  ].join("\n");
  throw new Error(message);
}

for (const target of targets) {
  const destinationDir = path.dirname(resolveDestinationPath(target));
  mkdirSync(destinationDir, { recursive: true });
  copyFileSync(resolveSourcePath(target), resolveDestinationPath(target));
}

const summary = [
  "Updated README demo assets from capture outputs:",
  ...targets.map(
    (target) =>
      `- ${path.relative(projectRoot, resolveSourcePath(target))} -> ${path.relative(projectRoot, resolveDestinationPath(target))}`,
  ),
];

process.stdout.write(`${summary.join("\n")}\n`);
