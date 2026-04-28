import { describe, expect, test, vi } from "vitest";

import {
  createTestWindow,
  landingModulePaths,
  loadModules,
  requireValue,
} from "./helpers/module-loader.js";
import { createLandingLoginHtml } from "./helpers/landing-fixtures.js";

describe("landing validation", () => {
  test("captures parsed fnstr state and falls back to startedAt for malformed values", () => {
    const { window } = createTestWindow(createLandingLoginHtml());
    const document = window.document as Document;
    loadModules(window, landingModulePaths);

    const validation = requireValue(window.CCXP_LITE.landingValidation, "landingValidation");
    expect(validation.captureLoginValidationState(document)).toMatchObject({
      fnstrDate: "20260428",
      fnstrSeed: "777",
    });

    document.querySelector("input[name='fnstr']").value = "invalid";
    expect(validation.captureLoginValidationState(document)).toHaveProperty("startedAt");
  });

  test("reloads the page when a guarded field is touched after expiry", () => {
    const { window } = createTestWindow(createLandingLoginHtml());
    const document = window.document as Document;
    loadModules(window, landingModulePaths);
    const landingValidation = requireValue(window.CCXP_LITE.landingValidation, "landingValidation");

    const reloadSpy = vi.fn();
    Object.defineProperty(document, "location", {
      configurable: true,
      value: { reload: reloadSpy, href: "https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/index.php" },
    });

    landingValidation.restoreLoginValidationGuards(document, {
      startedAt: Date.now() - 31 * 60 * 1000,
    });

    const account = document.querySelector("input[name='account']");
    account.dispatchEvent(new Event("click"));
    expect(reloadSpy).toHaveBeenCalled();
  });

  test("keeps fnstr in sync with the captcha image on submit and extracts with regex fallback", () => {
    const { window } = createTestWindow(createLandingLoginHtml());
    const document = window.document as Document;
    loadModules(window, landingModulePaths);
    const landingLocale = requireValue(window.CCXP_LITE.landingLocale, "landingLocale");
    const landingValidation = requireValue(window.CCXP_LITE.landingValidation, "landingValidation");

    const form = requireValue(landingLocale.getLoginForm(document), "loginForm");
    const image = form.querySelector("img");
    image.setAttribute("src", "auth_img.php?pwdstr=20260501-123");

    landingValidation.ensureLoginSubmissionPayload(form, document);
    expect(form.querySelector("input[name='fnstr']").value).toBe("20260501-123");

    expect(
      landingValidation.extractPwdstrFromImage(
        {
          getAttribute: () => "auth_img.php?pwdstr=20260502-456",
        },
        { location: null },
      ),
    ).toBe("20260502-456");
  });
});
