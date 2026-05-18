import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const projectRoot = process.cwd();
const firefoxSourceDir = path.join(projectRoot, "dist", "firefox", "unpacked");
const artifactsDir = path.join(projectRoot, "dist", "firefox", "signed");
const { version } = JSON.parse(readFileSync(path.join(projectRoot, "package.json"), "utf8")) as {
  version: string;
};

const issuer = process.env.AMO_JWT_ISSUER ?? "";
const secret = process.env.AMO_JWT_SECRET ?? "";

if (issuer === "" || secret === "") {
  throw new Error(
    "Missing AMO credentials. Set AMO_JWT_ISSUER and AMO_JWT_SECRET before signing Firefox builds.",
  );
}

if (!existsSync(firefoxSourceDir)) {
  throw new Error(
    `Missing Firefox build output at ${firefoxSourceDir}. Run "bun run build:firefox".`,
  );
}

mkdirSync(artifactsDir, { recursive: true });

const signResult = spawnSync(
  "bunx",
  [
    "web-ext",
    "sign",
    "--source-dir",
    firefoxSourceDir,
    "--artifacts-dir",
    artifactsDir,
    "--channel",
    "unlisted",
    "--api-key",
    issuer,
    "--api-secret",
    secret,
    "--no-input",
  ],
  {
    cwd: projectRoot,
    stdio: "inherit",
  },
);

if (signResult.status !== 0) {
  throw new Error("Firefox signing failed");
}

process.stdout.write(
  `Signed Firefox artifact created in ${artifactsDir} for version ${version}. Review AMO output for the exact filename.\n`,
);
