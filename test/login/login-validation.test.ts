import { describe, expect, test, vi } from "vitest";
import {
  createTestWindow,
  loginModulePaths,
  loadModules,
  requireElement,
  requireValue,
} from "../helpers/module-loader.js";
import { createLoginHtml } from "../helpers/login-fixtures.js";

describe("login validation", () => {
  test("captures parsed fnstr state and falls back to startedAt for malformed values", () => {
    const { window } = createTestWindow(createLoginHtml());
    const document = window.document as Document;
    loadModules(window, loginModulePaths);
    const validation = requireValue(window.CCXP_LITE.loginValidation, "loginValidation");
    expect(validation.captureValidationState(document)).toMatchObject({
      fnstrDate: "20260428",
      fnstrSeed: "777",
    });
    requireElement(
      document.querySelector<HTMLInputElement>("input[name='fnstr']"),
      "fnstr input",
    ).value = "invalid";
    expect(validation.captureValidationState(document)).toHaveProperty("startedAt");
  });
  test("reloads the page when a guarded field is touched after expiry", () => {
    const { window } = createTestWindow(createLoginHtml());
    const document = window.document as Document;
    loadModules(window, loginModulePaths);
    const loginValidation = requireValue(window.CCXP_LITE.loginValidation, "loginValidation");
    const reloadSpy = vi.fn();
    Object.defineProperty(document, "location", {
      configurable: true,
      value: { reload: reloadSpy, href: "https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/index.php" },
    });
    loginValidation.restoreValidationGuards(document, {
      startedAt: Date.now() - 31 * 60 * 1000,
    });
    const account = requireElement(
      document.querySelector<HTMLInputElement>("input[name='account']"),
      "account input",
    );
    account.dispatchEvent(new Event("click"));
    expect(reloadSpy).toHaveBeenCalled();
  });
  test("keeps fnstr in sync with the captcha image on submit and extracts with regex fallback", () => {
    const { window } = createTestWindow(createLoginHtml());
    const document = window.document as Document;
    loadModules(window, loginModulePaths);
    const loginLocale = requireValue(window.CCXP_LITE.loginLocale, "loginLocale");
    const loginValidation = requireValue(window.CCXP_LITE.loginValidation, "loginValidation");
    const form = requireValue(loginLocale.getLoginForm(document), "loginForm");
    const image = requireElement(form.querySelector<HTMLImageElement>("img"), "captcha image");
    image.setAttribute("src", "auth_img.php?pwdstr=20260501-123");
    loginValidation.ensureSubmissionPayload(form, document);
    expect(
      requireElement(form.querySelector<HTMLInputElement>("input[name='fnstr']"), "fnstr input")
        .value,
    ).toBe("20260501-123");
    expect(
      loginValidation.extractPwdstrFromImage(
        {
          getAttribute: () => "auth_img.php?pwdstr=20260502-456",
        } as unknown as HTMLImageElement,
        {} as Document,
      ),
    ).toBe("20260502-456");
  });
});
