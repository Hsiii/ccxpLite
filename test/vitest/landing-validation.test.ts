import { describe, expect, test, vi } from "vitest";

import { createTestWindow, loadModules, landingModulePaths } from "./helpers/module-loader.js";
import { createLandingLoginHtml } from "./helpers/landing-fixtures.js";

describe("landing validation", () => {
  test("captures parsed fnstr state and falls back to startedAt for malformed values", () => {
    const { window } = createTestWindow(createLandingLoginHtml());
    loadModules(window, landingModulePaths);

    const validation = window.CCXP_LITE.landingValidation;
    expect(validation.captureLoginValidationState(window.document)).toMatchObject({
      fnstrDate: "20260428",
      fnstrSeed: "777",
    });

    (window.document.querySelector("input[name='fnstr']") as HTMLInputElement).value = "invalid";
    expect(validation.captureLoginValidationState(window.document)).toHaveProperty("startedAt");
  });

  test("reloads the page when a guarded field is touched after expiry", () => {
    const { window } = createTestWindow(createLandingLoginHtml());
    loadModules(window, landingModulePaths);

    const reloadSpy = vi.fn();
    Object.defineProperty(window.document, "location", {
      configurable: true,
      value: { reload: reloadSpy, href: "https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/index.php" },
    });

    window.CCXP_LITE.landingValidation.restoreLoginValidationGuards(window.document, {
      startedAt: Date.now() - 31 * 60 * 1000,
    });

    const account = window.document.querySelector("input[name='account']") as HTMLInputElement;
    account.dispatchEvent(new window.Event("click"));
    expect(reloadSpy).toHaveBeenCalled();
  });

  test("keeps fnstr in sync with the captcha image on submit and extracts with regex fallback", () => {
    const { window } = createTestWindow(createLandingLoginHtml());
    loadModules(window, landingModulePaths);

    const form = window.CCXP_LITE.landingLocale.getLoginForm(window.document);
    const image = form.querySelector("img") as HTMLImageElement;
    image.setAttribute("src", "auth_img.php?pwdstr=20260501-123");

    window.CCXP_LITE.landingValidation.ensureLoginSubmissionPayload(form, window.document);
    expect((form.querySelector("input[name='fnstr']") as HTMLInputElement).value).toBe(
      "20260501-123",
    );

    expect(
      window.CCXP_LITE.landingValidation.extractPwdstrFromImage(
        {
          getAttribute: () => "auth_img.php?pwdstr=20260502-456",
        },
        { location: null },
      ),
    ).toBe("20260502-456");
  });
});
