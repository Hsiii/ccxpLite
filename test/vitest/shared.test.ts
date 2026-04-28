import { describe, expect, test, vi } from "vitest";

import { createTestWindow, loadModules, sharedModulePaths } from "./helpers/module-loader";

describe("shared locale", () => {
  test("normalizes locale families and defaults to zh", () => {
    const { window } = createTestWindow();
    loadModules(window, sharedModulePaths);

    const { normalizeLocale, resolveLocaleFromDocument, getLocalizedStrings } =
      window.CCXP_LITE.sharedLocale;

    expect(normalizeLocale("en-US")).toBe("en");
    expect(normalizeLocale("ch")).toBe("zh");
    expect(normalizeLocale("")).toBe("zh");

    window.document.documentElement.lang = "en-GB";
    expect(resolveLocaleFromDocument(window.document)).toBe("en");
    expect(getLocalizedStrings("fr").sidebarTitle).toBe("校務資訊系統");
  });
});

describe("shared theme", () => {
  test("appends stylesheet once and applies CSS variables", () => {
    const { window } = createTestWindow();
    loadModules(window, sharedModulePaths);

    const { ensureThemeDocument } = window.CCXP_LITE.sharedTheme;

    expect(ensureThemeDocument(window.document, "nav")).toBe(true);
    expect(ensureThemeDocument(window.document, "nav")).toBe(true);

    const stylesheetLinks = window.document.head.querySelectorAll(
      "[data-ccxp-lite-stylesheet='true']",
    );
    expect(stylesheetLinks).toHaveLength(1);
    expect(window.document.documentElement.dataset.ccxpLiteScope).toBe("nav");
    expect(window.document.documentElement.style.getPropertyValue("--ccxp-lite-primary")).toBe(
      "rgb(121, 36, 133)",
    );
  });

  test("returns false when extension runtime is unavailable", () => {
    const { window } = createTestWindow();
    loadModules(window, sharedModulePaths);

    const getRuntimeSafely = vi
      .spyOn(window.CCXP_LITE.sharedDom, "getRuntimeSafely")
      .mockReturnValue(null);

    expect(window.CCXP_LITE.sharedTheme.ensureThemeDocument(window.document, "landing")).toBe(
      false,
    );
    expect(window.document.head.querySelector("[data-ccxp-lite-stylesheet='true']")).toBeNull();

    getRuntimeSafely.mockRestore();
  });
});
