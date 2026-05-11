import { existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { BrowserContext, Page } from "playwright";
import { chromium } from "playwright";

const projectRoot = process.cwd();
const extensionDir = path.join(projectRoot, "dist", "unpacked");
const outputReadmeDir = path.join(projectRoot, "assets", "showcase", "readme");
const outputStoreDir = path.join(projectRoot, "assets", "showcase", "store");
const captureProfileDir = path.join(projectRoot, ".capture-profile", "marketing");
const viewport = { width: 1600, height: 1000 };
const storeSize = { width: 1280, height: 800 };
const loginUrl = "https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/";

type StageId = "login" | "main" | "main-expanded" | "select-courses-selected";
type ModeId = "menu" | "sidebar";

interface CaptureTarget {
  mode: ModeId;
  stage: StageId;
  instructions: string;
}

const captureTargets: readonly CaptureTarget[] = [
  {
    mode: "menu",
    stage: "login",
    instructions:
      "Open the login page with the extension applied and stop on the final login state.",
  },
  {
    mode: "sidebar",
    stage: "login",
    instructions:
      "Keep the same login page visible. This capture is duplicated in the matrix for the sidebar set.",
  },
  {
    mode: "menu",
    stage: "main",
    instructions: "Open the layered menu home state after login.",
  },
  {
    mode: "menu",
    stage: "main-expanded",
    instructions: "Open the layered menu with the Planning & Enrollment section expanded.",
  },
  {
    mode: "menu",
    stage: "select-courses-selected",
    instructions: "Open the layered menu and navigate into the Select courses page.",
  },
  {
    mode: "sidebar",
    stage: "main",
    instructions: "Switch to the classic sidebar mode and stop on the top-level sidebar view.",
  },
  {
    mode: "sidebar",
    stage: "main-expanded",
    instructions: "Stay in classic sidebar mode and expand the Planning & Enrollment branch.",
  },
  {
    mode: "sidebar",
    stage: "select-courses-selected",
    instructions:
      "Stay in classic sidebar mode and open the Select courses page in the main panel.",
  },
];

function runOrThrow(command: string, args: readonly string[], description: string) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`${description} failed`);
  }
}

function resizeOrThrow(sourcePath: string, targetPath: string, width: number, height: number) {
  runOrThrow(
    "sips",
    ["-z", String(height), String(width), sourcePath, "--out", targetPath],
    `resizing ${path.basename(targetPath)}`,
  );
}

function assertPrerequisites() {
  if (!existsSync(path.join(projectRoot, "node_modules", "playwright"))) {
    throw new Error("playwright is not installed");
  }
}

function ensureOutputDirectories() {
  rmSync(outputReadmeDir, { recursive: true, force: true });
  rmSync(outputStoreDir, { recursive: true, force: true });
  mkdirSync(outputReadmeDir, { recursive: true });
  mkdirSync(outputStoreDir, { recursive: true });
}

function resolveCapturePage(context: BrowserContext, fallbackPage: Page) {
  return (
    [...context.pages()]
      .toReversed()
      .find((page) => !page.url().startsWith("chrome-extension://")) ?? fallbackPage
  );
}

async function promptForCaptureTarget(
  page: Page,
  readline: ReturnType<typeof createInterface>,
  target: CaptureTarget,
) {
  await page.bringToFront();
  const prompt = [
    "",
    `Capture target: ${target.mode}/${target.stage}`,
    target.instructions,
    "Arrange the real CCXP page in Chrome, then press Enter here to capture.",
  ].join("\n");
  await readline.question(`${prompt}\n`);
}

async function main() {
  assertPrerequisites();
  ensureOutputDirectories();
  runOrThrow("bun", ["run", "build"], "extension build");
  const readline = createInterface({ input, output });
  mkdirSync(captureProfileDir, { recursive: true });
  const context = await chromium.launchPersistentContext(captureProfileDir, {
    channel: "chromium",
    headless: false,
    viewport,
    args: [
      `--disable-extensions-except=${extensionDir}`,
      `--load-extension=${extensionDir}`,
      "--no-first-run",
      "--no-default-browser-check",
    ],
  });

  try {
    const initialPage = context.pages()[0] ?? (await context.newPage());
    await initialPage.goto(loginUrl, { waitUntil: "domcontentloaded" });
    await initialPage.bringToFront();

    output.write(
      `${[
        "",
        "Opened the dedicated marketing capture Chromium profile.",
        `Use the page at ${loginUrl} and keep working in that browser window while the script prompts for each capture.`,
      ].join("\n")}\n`,
    );

    // Captures stay sequential so each prompt matches the current manual browser state.
    /* eslint-disable no-await-in-loop */
    for (const target of captureTargets) {
      const page = resolveCapturePage(context, initialPage);
      await promptForCaptureTarget(page, readline, target);
      await page.bringToFront();
      await page.setViewportSize(viewport);
      await page.waitForTimeout(400);

      const readmeOutputPath = path.join(outputReadmeDir, `${target.mode}-${target.stage}.png`);
      const storeOutputPath = path.join(outputStoreDir, `${target.mode}-${target.stage}.png`);

      await page.screenshot({
        path: readmeOutputPath,
        type: "png",
        animations: "disabled",
      });
      resizeOrThrow(readmeOutputPath, storeOutputPath, storeSize.width, storeSize.height);
    }
    /* eslint-enable no-await-in-loop */
  } finally {
    readline.close();
    await context.close();
  }

  output.write(
    `\nGenerated ${captureTargets.length * 2} images.\nREADME-ready: ${outputReadmeDir}\nStore-ready: ${outputStoreDir}\n`,
  );
}

// eslint-disable-next-line unicorn/prefer-top-level-await
main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
