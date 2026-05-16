import { describe, expect, test, vi } from "vitest";

import { createLoginHtml } from "../helpers/login-fixtures.js";
import { createTestWindow, loadModules } from "../helpers/module-loader.js";

const loginBootstrapModulePaths = [
  "src/shared/constants.ts",
  "src/shared/locale.ts",
  "src/shared/theme.ts",
  "src/shared/brand.ts",
  "src/shared/dom.ts",
  "src/shared/analytics.ts",
  "src/login/locale.ts",
  "src/login/ui/support.ts",
  "src/login/ui/tabs.ts",
  "src/login/auth/validation.ts",
  "src/login/ui/login.ts",
  "src/login/auth/captcha.ts",
  "src/login/pipeline/identify.ts",
  "src/login/pipeline/rewrite.ts",
  "src/login/pipeline/style.ts",
  "src/login/pipeline/bootstrap.ts",
  "src/main/bootstrap.ts",
];

describe("main bootstrap login path", () => {
  test("rewrites the login page without requiring sidebar registration", async () => {
    const { window } = createTestWindow(
      createLoginHtml(),
      "https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/",
    );
    window.fetch = vi
      .fn()
      .mockRejectedValue(
        new Error("captcha fetch disabled in test"),
      ) as unknown as typeof window.fetch;

    loadModules(window, loginBootstrapModulePaths);

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });

    const document = window.document as Document;
    const body = document.body as HTMLBodyElement;
    const landingShell = document.querySelector("main.ccxp-lite-landing-shell");

    expect(body.dataset.ccxpLiteLandingApplied).toBe("true");
    expect(landingShell).not.toBeNull();
  });

  test("rewrites the login page when bootstrap starts before the form is parsed", async () => {
    const { window } = createTestWindow(
      "<!doctype html><html lang='zh'><head></head><body></body></html>",
      "https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/",
    );
    window.fetch = vi
      .fn()
      .mockRejectedValue(
        new Error("captcha fetch disabled in test"),
      ) as unknown as typeof window.fetch;

    let readyState: DocumentReadyState = "loading";
    Object.defineProperty(window.document, "readyState", {
      configurable: true,
      get: () => readyState,
    });

    loadModules(window, loginBootstrapModulePaths);

    const parsedDocument = new window.DOMParser().parseFromString(createLoginHtml(), "text/html");
    const targetBody = window.document.body as HTMLBodyElement;
    const replacementBody = parsedDocument.body.cloneNode(true) as HTMLBodyElement;
    targetBody.replaceChildren(...replacementBody.childNodes);
    readyState = "complete";

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 300);
    });

    const document = window.document as Document;
    const body = document.body as HTMLBodyElement;
    const landingShell = document.querySelector("main.ccxp-lite-landing-shell");

    expect(body.dataset.ccxpLiteLandingApplied).toBe("true");
    expect(landingShell).not.toBeNull();
  });
});
