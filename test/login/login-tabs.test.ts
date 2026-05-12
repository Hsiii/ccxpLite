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
  test("flattens legacy login guidance into a localized account list", () => {
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

    expect(
      requireElement(
        result.shell.querySelector<HTMLElement>(".ccxp-lite-account-guide-title"),
        "guide title",
      ).textContent,
    ).toBe("\u767B\u5165\u8CC7\u8A0A");
    expect(
      requireElement(
        result.shell.querySelector<HTMLElement>(".ccxp-lite-account-guide-info-list"),
        "info list",
      ).textContent,
    ).toContain(
      "\u9996\u6B21\u767B\u5165\u3001\u5E33\u865F\u555F\u7528\u3001\u5FD8\u8A18\u5BC6\u78BC",
    );
    const accountItems = [
      ...result.shell.querySelectorAll<HTMLElement>(".ccxp-lite-account-guide-account-item"),
    ].map((item) => item.textContent.trim());
    expect(accountItems[0]).toContain(
      "\u5B78\u751F\uFF0F\u6821\u53CB\u5E33\u865F:\u5B78\u865F\uFF08\u4F8B\uFF1A110061190\u3001X1106099\u3001102061190\uFF09",
    );
    expect(accountItems[2]).toContain("\u7D71\u4E00\u7DE8\u865F");
    expect(accountItems[6]).toContain(
      "\u59D4\u8A17\u6388\u6B0A\u5E33\u865F:\u59D4\u8A17\u4EBA\u54E1\u5DE5\u7DE8\u865F-01\uFF08\u4F8B\uFF1AA11111-01\uFF09",
    );
    expect(
      requireElement(
        result.shell.querySelector<HTMLElement>(".ccxp-lite-account-guide-info-popup"),
        "student alumni popup",
      ).textContent,
    ).toContain("\u5357\u5927\u6821\u5340 105 \u5E74\u524D\u5165\u5B78\u8005");
    const ctas = [
      ...result.shell.querySelectorAll<HTMLElement>(".ccxp-lite-landing-service-link"),
    ].map((link) => ({
      text: link.textContent.trim(),
      className: link.className,
    }));
    expect(ctas[0]?.text).toContain("\u7121\u6CD5\u767B\u5165");
    expect(ctas[0]?.className).toContain("ccxp-lite-landing-service-link-primary");
    expect(ctas[1]?.className).toContain("ccxp-lite-landing-service-link-secondary");
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

    const guide = loginTabs.createAccountGuide(document, shared.getLocalizedStrings("en"));

    const accountItems = [
      ...guide.querySelectorAll<HTMLElement>(".ccxp-lite-account-guide-account-item"),
    ].map((item) => item.textContent.trim());
    expect(accountItems[0]).toContain("Student / alumni account");
    expect(accountItems[0]).toContain("student ID (e.g. 110061190, X1106099, 102061190)");
    expect(requireElement(guide, "english account guide").textContent).toContain(
      "First-time sign-in, account activation, and password reset",
    );
    expect(requireElement(guide, "english account guide").textContent).toContain("Login Info");
  });
});
