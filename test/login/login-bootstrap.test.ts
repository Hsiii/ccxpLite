import { describe, expect, test, vi } from "vitest";

import {
  createTestWindow,
  loginModulePaths,
  loadModules,
  requireElement,
  requireValue,
  sharedModulePaths,
} from "../helpers/module-loader.js";
import { createLoginHtml } from "../helpers/login-fixtures.js";

const loginBootstrapModulePaths = [
  ...sharedModulePaths,
  ...loginModulePaths.slice(sharedModulePaths.length),
  "src/login/pipeline/bootstrap.ts",
];

describe("login bootstrap", () => {
  test("runs the identify, rewrite, and style pipeline through simplifyLoginPage", async () => {
    const { window } = createTestWindow(createLoginHtml());
    const document = window.document as Document;
    window.CCXP_LITE.decaptcha = {
      predictDigits: vi.fn().mockResolvedValue("654321"),
    };
    window.fetch = vi.fn(
      async () =>
        await Promise.resolve({
          ok: true,
          arrayBuffer: async () => await Promise.resolve(new ArrayBuffer(8)),
        } as Response),
    ) as unknown as typeof window.fetch;
    loadModules(window, loginBootstrapModulePaths);
    const login = requireValue(window.CCXP_LITE.login, "login");

    login.simplifyLoginPage(document);
    await Promise.resolve();
    await Promise.resolve();

    const shell = requireElement(
      document.querySelector<HTMLElement>(".ccxp-lite-landing-shell"),
      "landing shell",
    );
    expect(document.body.dataset.ccxpLiteLandingApplied).toBe("true");
    expect(document.documentElement.dataset.ccxpLiteScope).toBe("landing");
    expect(shell.querySelector(".ccxp-lite-landing-login")).not.toBeNull();
    expect(shell.querySelector(".ccxp-lite-password-toggle")).not.toBeNull();
  });
});
