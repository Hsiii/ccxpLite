import { describe, expect, test } from "vitest";

import {
  createTestWindow,
  landingModulePaths,
  loadModules,
  requireElement,
  requireValue,
} from "./helpers/module-loader.js";
import { createLandingLoginHtml } from "./helpers/landing-fixtures.js";

describe("landing login ui", () => {
  test("wraps the password field once and toggles visibility with localized labels", () => {
    const { window } = createTestWindow(createLandingLoginHtml());
    const document = window.document as Document;
    loadModules(window, landingModulePaths);
    const landingLogin = requireValue(window.CCXP_LITE.landingLogin, "landingLogin");

    landingLogin.enhancePasswordVisibilityToggle(document, document);
    landingLogin.enhancePasswordVisibilityToggle(document, document);

    const passwordField = requireElement(
      document.querySelector<HTMLInputElement>("input[name='passwd']"),
      "password input",
    );
    const toggle = requireElement(
      document.querySelector<HTMLButtonElement>(".ccxp-lite-password-toggle"),
      "password toggle",
    );

    expect(document.querySelectorAll(".ccxp-lite-password-field")).toHaveLength(1);
    expect(toggle.getAttribute("aria-label")).toBe("\u986F\u793A\u5BC6\u78BC");

    toggle.click();
    expect(passwordField.type).toBe("text");
    expect(toggle.getAttribute("aria-label")).toBe("\u96B1\u85CF\u5BC6\u78BC");
  });

  test("marks the login form as structured without duplicating work", () => {
    const { window } = createTestWindow(createLandingLoginHtml());
    const document = window.document as Document;
    loadModules(window, landingModulePaths);
    const landingLocale = requireValue(window.CCXP_LITE.landingLocale, "landingLocale");
    const landingLogin = requireValue(window.CCXP_LITE.landingLogin, "landingLogin");

    const form = requireValue(landingLocale.getLoginForm(document), "loginForm");
    landingLogin.normalizeLoginFormLayout(document);
    landingLogin.normalizeLoginFormLayout(document);

    expect(form.classList.contains("ccxp-lite-login-form")).toBe(true);
    expect(form.dataset.ccxpLiteFormStructured).toBe("true");
    expect(document.querySelectorAll(".ccxp-lite-login-form")).toHaveLength(1);
  });
});
