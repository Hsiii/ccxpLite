import { describe, expect, test } from "vitest";

import {
  createTestWindow,
  loginModulePaths,
  loadModules,
  requireElement,
  requireValue,
} from "../helpers/module-loader.js";
import { createLoginWithTabsHtml } from "../helpers/login-fixtures.js";

describe("login tabs", () => {
  test("overwrites legacy login guidance with concise localized content", () => {
    const { window } = createTestWindow(createLoginWithTabsHtml());
    const document = window.document as Document;
    loadModules(window, loginModulePaths);
    const loginIdentify = requireValue(window.CCXP_LITE.loginIdentify, "loginIdentify");
    const loginRewrite = requireValue(window.CCXP_LITE.loginRewrite, "loginRewrite");

    const identifiedSurface = requireValue(
      loginIdentify.identifyLoginSurface(document),
      "identifiedSurface",
    );
    const result = requireValue(
      loginRewrite.rewriteLoginSurface(document, identifiedSurface),
      "rewriteResult",
    );

    const rewrittenButtons = [
      ...result.shell.querySelectorAll<HTMLElement>(".ccxp-lite-landing-tabs .tab [role='tab']"),
    ].map((button) => button.textContent.trim());
    expect(rewrittenButtons).toEqual([
      "\u5E33\u865F\u554F\u984C",
      "\u5B78\u751F\uFF0F\u6821\u53CB",
      "\u6559\u8077\u54E1",
      "\u53D7\u6B3E\u4EBA\uFF0F\u5EE0\u5546",
      "\u5176\u4ED6",
      "\u63D0\u9192\u4E8B\u9805",
    ]);

    const panels = result.shell.querySelectorAll<HTMLElement>(
      ".ccxp-lite-landing-tabs .tabcontent",
    );
    expect(requireElement(panels[0], "account help panel").textContent).toContain(
      "\u9996\u6B21\u767B\u5165\u3001\u5E33\u865F\u555F\u7528\u3001\u5FD8\u8A18\u5BC6\u78BC",
    );
    expect(requireElement(panels[1], "student alumni panel").textContent).toContain(
      "\u5B78\u751F\uFF0F\u6821\u53CB",
    );
    expect(requireElement(panels[1], "student alumni panel").textContent).toContain(
      "\u5E33\u865F\uFF1A\u5B78\u865F\uFF08\u4F8B\uFF1A110061190\u3001X1106099\u3001102061190\uFF09",
    );
    expect(requireElement(panels[3], "vendor panel").textContent).toContain(
      "\u7D71\u4E00\u7DE8\u865F",
    );
    expect(requireElement(panels[4], "other panel").textContent).toContain(
      "\u59D4\u8A17\u6388\u6B0A\u5E33\u865F\uFF1A\u59D4\u8A17\u4EBA\u54E1\u5DE5\u7DE8\u865F-01\uFF08\u4F8B\uFF1AA11111-01\uFF09",
    );
  });

  test("uses english copy when the login page locale is english", () => {
    const { window } = createTestWindow(
      createLoginWithTabsHtml().replace('<html lang="zh">', '<html lang="en">'),
      "https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/index.php?lang=E",
    );
    const document = window.document as Document;
    loadModules(window, loginModulePaths);
    const loginTabs = requireValue(window.CCXP_LITE.loginTabs, "loginTabs");
    const shared = requireValue(window.CCXP_LITE.shared, "shared");
    const tabNavigation = requireElement(document.querySelector<HTMLElement>(".tab"), "tab nav");
    const tabContents = [...document.querySelectorAll<HTMLElement>(".tabcontent")];

    loginTabs.normalizeLandingTabs(
      document,
      tabNavigation,
      tabContents,
      shared.getLocalizedStrings("en"),
    );

    const tabButtons = [...tabNavigation.querySelectorAll<HTMLElement>("button")].map((button) =>
      button.textContent.trim(),
    );
    expect(tabButtons).toEqual([
      "Account Help",
      "Students / Alumni",
      "Faculty / Staff",
      "Payees / Vendors",
      "Other",
      "Reminders",
    ]);
    expect(requireElement(tabContents[0], "english account help").textContent).toContain(
      "First-time sign-in, account activation, and password reset",
    );
  });
});
