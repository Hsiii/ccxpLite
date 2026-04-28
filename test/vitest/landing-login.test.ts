import { describe, expect, test } from "vitest";

import { createTestWindow, loadModules, landingModulePaths } from "./helpers/module-loader";
import { createLandingLoginHtml } from "./helpers/landing-fixtures";

describe("landing login ui", () => {
  test("wraps the password field once and toggles visibility with localized labels", () => {
    const { window } = createTestWindow(createLandingLoginHtml());
    loadModules(window, landingModulePaths);

    window.CCXP_LITE.landingLogin.enhancePasswordVisibilityToggle(window.document, window.document);
    window.CCXP_LITE.landingLogin.enhancePasswordVisibilityToggle(window.document, window.document);

    const passwordField = window.document.querySelector("input[name='passwd']") as HTMLInputElement;
    const toggle = window.document.querySelector(".ccxp-lite-password-toggle") as HTMLButtonElement;

    expect(window.document.querySelectorAll(".ccxp-lite-password-field")).toHaveLength(1);
    expect(toggle.getAttribute("aria-label")).toBe("顯示密碼");

    toggle.click();
    expect(passwordField.type).toBe("text");
    expect(toggle.getAttribute("aria-label")).toBe("隱藏密碼");
  });

  test("marks the login form as structured without duplicating work", () => {
    const { window } = createTestWindow(createLandingLoginHtml());
    loadModules(window, landingModulePaths);

    const form = window.CCXP_LITE.landingLocale.getLoginForm(window.document);
    window.CCXP_LITE.landingLogin.normalizeLoginFormLayout(window.document);
    window.CCXP_LITE.landingLogin.normalizeLoginFormLayout(window.document);

    expect(form.classList.contains("ccxp-lite-login-form")).toBe(true);
    expect(form.dataset.ccxpLiteFormStructured).toBe("true");
    expect(window.document.querySelectorAll(".ccxp-lite-login-form").length).toBe(1);
  });
});
