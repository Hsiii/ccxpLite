import { describe, expect, test, vi } from "vitest";
import {
  createTestWindow,
  loadModules,
  requireValue,
  sharedModulePaths,
} from "../helpers/module-loader.js";

describe("shared locale", () => {
  test("normalizes locale families and defaults to zh", () => {
    const { window } = createTestWindow();
    const document = window.document as Document;
    loadModules(window, sharedModulePaths);
    const { normalizeLocale, resolveLocaleFromDocument, getLocalizedStrings, rememberLocale } =
      requireValue(window.CCXP_LITE.sharedLocale, "sharedLocale");
    expect(normalizeLocale("en-US")).toBe("en");
    expect(normalizeLocale("ch")).toBe("zh");
    expect(normalizeLocale("")).toBe("zh");
    document.documentElement.lang = "en-GB";
    expect(resolveLocaleFromDocument(document)).toBe("en");
    rememberLocale("zh", document);
    document.documentElement.lang = "";
    expect(resolveLocaleFromDocument(document)).toBe("zh");
    expect(getLocalizedStrings("fr").sidebarTitle).toBe("\u6821\u52D9\u8CC7\u8A0A\u7CFB\u7D71");
  });

  test("reuses the remembered locale when the authenticated page omits lang", () => {
    const { window } = createTestWindow("<!doctype html><html><head></head><body></body></html>");
    const document = window.document as Document;
    loadModules(window, sharedModulePaths);
    const { rememberLocale, resolveLocaleFromDocument } = requireValue(
      window.CCXP_LITE.sharedLocale,
      "sharedLocale",
    );
    expect(rememberLocale("en", document)).toBe("en");
    document.documentElement.lang = "";
    expect(resolveLocaleFromDocument(document)).toBe("en");
    expect(document.documentElement.lang).toBe("en");
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
    expect(document.documentElement.style.getPropertyValue("--ccxp-lite-primary")).toBe("#9F5FA5");
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
  test("creates a body when the document is missing one", () => {
    const { window } = createTestWindow("<!doctype html><html lang='zh'><head></head></html>");
    const document = window.document as Document;
    loadModules(window, sharedModulePaths);
    const sharedDom = requireValue(window.CCXP_LITE.sharedDom, "sharedDom");
    document.body.remove();
    expect(document.querySelector("body")).toBeNull();
    const injectedBody = sharedDom.ensureDocumentBody(document);
    expect(injectedBody?.tagName).toBe("BODY");
    expect(document.querySelector("body")).toBe(injectedBody);
  });
});

describe("shared analytics", () => {
  test("creates the data layer, injects GTM once, and tracks normalized events", () => {
    const { window } = createTestWindow();
    const document = window.document as Document;
    loadModules(window, sharedModulePaths);
    const sharedAnalytics = requireValue(window.CCXP_LITE.sharedAnalytics, "sharedAnalytics");

    const firstBootstrap = sharedAnalytics.ensureGoogleTagManager(document, {
      containerId: "GTM-TEST123",
    });
    const secondBootstrap = sharedAnalytics.ensureGoogleTagManager(document, {
      containerId: "GTM-TEST123",
    });

    expect(firstBootstrap.injected).toBe(true);
    expect(secondBootstrap.injected).toBe(true);
    expect(window.dataLayer).toHaveLength(1);
    expect(window.dataLayer?.[0]).toMatchObject({ event: "gtm.js" });
    expect(document.head.querySelectorAll("[data-ccxp-lite-gtm-script='true']")).toHaveLength(1);
    expect(document.head.querySelector("script")?.getAttribute("src")).toContain("GTM-TEST123");
    expect(document.body.querySelectorAll("[data-ccxp-lite-gtm-noscript='true']")).toHaveLength(1);
    expect(document.body.firstElementChild?.tagName).toBe("NOSCRIPT");
    expect(document.body.querySelector("noscript iframe")?.getAttribute("src")).toContain(
      "GTM-TEST123",
    );

    sharedAnalytics.trackEvent(document, {
      feature: "favorites",
      action: "add_favorite",
      surface: "sidebar",
      optional_field: undefined,
    });
    sharedAnalytics.trackPageView(document, {
      page_surface: "login",
    });

    expect(window.dataLayer).toHaveLength(3);
    expect(window.dataLayer?.[1]).toMatchObject({
      event: "ccxp_lite",
      feature: "favorites",
      action: "add_favorite",
      surface: "sidebar",
    });
    expect(window.dataLayer?.[1]).not.toHaveProperty("optional_field");
    expect(window.dataLayer?.[2]).toMatchObject({
      event: "ccxp_lite_page_view",
      feature: "page",
      action: "view",
      page_surface: "login",
    });
  });
});
