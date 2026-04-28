import { describe, expect, test, vi } from "vitest";

import { createTestWindow, loadModules, sharedModulePaths } from "./helpers/module-loader.js";

describe("shared locale", () => {
  test("normalizes locale families and defaults to zh", () => {
    const { window } = createTestWindow();
    const document = window.document as Document;
    loadModules(window, sharedModulePaths);

    const { normalizeLocale, resolveLocaleFromDocument, getLocalizedStrings } =
      window.CCXP_LITE.sharedLocale!;

    expect(normalizeLocale("en-US")).toBe("en");
    expect(normalizeLocale("ch")).toBe("zh");
    expect(normalizeLocale("")).toBe("zh");

    document.documentElement.lang = "en-GB";
    expect(resolveLocaleFromDocument(document)).toBe("en");
    expect(getLocalizedStrings("fr").sidebarTitle).toBe("校務資訊系統");
  });
});

describe("shared theme", () => {
  test("appends stylesheet once and applies CSS variables", () => {
    const { window } = createTestWindow();
    const document = window.document as Document;
    loadModules(window, sharedModulePaths);

    const { ensureThemeDocument } = window.CCXP_LITE.sharedTheme!;

    expect(ensureThemeDocument(document, "nav")).toBe(true);
    expect(ensureThemeDocument(document, "nav")).toBe(true);

    const stylesheetLinks = document.head.querySelectorAll("[data-ccxp-lite-stylesheet='true']");
    expect(stylesheetLinks).toHaveLength(1);
    expect(document.documentElement.dataset.ccxpLiteScope).toBe("nav");
    expect(document.documentElement.style.getPropertyValue("--ccxp-lite-primary")).toBe(
      "rgb(121, 36, 133)",
    );
  });

  test("returns false when extension runtime is unavailable", () => {
    const { window } = createTestWindow();
    const document = window.document as Document;
    loadModules(window, sharedModulePaths);
    const sharedDom = window.CCXP_LITE.sharedDom!;
    const sharedTheme = window.CCXP_LITE.sharedTheme!;

    const getRuntimeSafely = vi.spyOn(sharedDom, "getRuntimeSafely").mockReturnValue(null);

    expect(sharedTheme.ensureThemeDocument(document, "landing")).toBe(false);
    expect(document.head.querySelector("[data-ccxp-lite-stylesheet='true']")).toBeNull();

    getRuntimeSafely.mockRestore();
  });
});
