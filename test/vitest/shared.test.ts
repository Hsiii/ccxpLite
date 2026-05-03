import { describe, expect, test, vi } from "vitest";
import {
  createTestWindow,
  loadModules,
  requireValue,
  sharedModulePaths,
} from "./helpers/module-loader.js";

describe("shared locale", () => {
  test("normalizes locale families and defaults to zh", () => {
    const { window } = createTestWindow();
    const document = window.document as Document;
    loadModules(window, sharedModulePaths);
    const { normalizeLocale, resolveLocaleFromDocument, getLocalizedStrings } = requireValue(
      window.CCXP_LITE.sharedLocale,
      "sharedLocale",
    );
    expect(normalizeLocale("en-US")).toBe("en");
    expect(normalizeLocale("ch")).toBe("zh");
    expect(normalizeLocale("")).toBe("zh");
    document.documentElement.lang = "en-GB";
    expect(resolveLocaleFromDocument(document)).toBe("en");
    expect(getLocalizedStrings("fr").sidebarTitle).toBe("\u6821\u52D9\u8CC7\u8A0A\u7CFB\u7D71");
  });
});
describe("shared theme", () => {
  test("appends stylesheet once and applies CSS variables", () => {
    const { window } = createTestWindow();
    const document = window.document as Document;
    loadModules(window, sharedModulePaths);
    const { ensureThemeDocument } = requireValue(window.CCXP_LITE.sharedTheme, "sharedTheme");
    expect(ensureThemeDocument(document, "nav")).toBe(true);
    expect(ensureThemeDocument(document, "nav")).toBe(true);
    const stylesheetLinks = document.head.querySelectorAll("[data-ccxp-lite-stylesheet='true']");
    expect(stylesheetLinks).toHaveLength(1);
    expect(document.documentElement.dataset.ccxpLiteScope).toBe("nav");
    expect(document.documentElement.style.getPropertyValue("--ccxp-lite-primary")).toBe(
      "rgb(121, 36, 133)",
    );
  });
  test("creates a head before injecting the stylesheet", () => {
    const { window } = createTestWindow("<!doctype html><html lang='zh'><body></body></html>");
    const document = window.document as Document;
    loadModules(window, sharedModulePaths);
    const sharedDom = requireValue(window.CCXP_LITE.sharedDom, "sharedDom");
    const sharedTheme = requireValue(window.CCXP_LITE.sharedTheme, "sharedTheme");
    document.head.remove();
    expect(document.head).toBeNull();
    const injectedHead = sharedDom.ensureDocumentHead(document);
    expect(injectedHead?.tagName).toBe("HEAD");
    expect(sharedTheme.ensureThemeDocument(document, "main")).toBe(true);
    expect(document.head.querySelector("[data-ccxp-lite-stylesheet='true']")).not.toBeNull();
  });
  test("returns false when extension runtime is unavailable", () => {
    const { window } = createTestWindow();
    const document = window.document as Document;
    loadModules(window, sharedModulePaths);
    const sharedDom = requireValue(window.CCXP_LITE.sharedDom, "sharedDom");
    const sharedTheme = requireValue(window.CCXP_LITE.sharedTheme, "sharedTheme");
    const getRuntimeSafely = vi.spyOn(sharedDom, "getRuntimeSafely").mockReturnValue(undefined);
    expect(sharedTheme.ensureThemeDocument(document, "landing")).toBe(false);
    expect(document.head.querySelector("[data-ccxp-lite-stylesheet='true']")).toBeNull();
    getRuntimeSafely.mockRestore();
  });
});
