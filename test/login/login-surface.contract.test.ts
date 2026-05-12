import { describe, expect, test, vi } from "vitest";

import {
  createTestWindow,
  requireElement,
  loadModules,
  loginModulePaths,
  requireValue,
  sharedModulePaths,
} from "../helpers/module-loader.js";
import {
  createChineseLoginAnnouncementHtml,
  createEnglishLoginAnnouncementHtml,
  createLoginHtml,
  createLoginWithTabsHtml,
} from "../helpers/login-fixtures.js";
import { summarizeLoginSurface } from "../helpers/ui-contracts.js";

const loginBootstrapModulePaths = [
  ...sharedModulePaths,
  ...loginModulePaths.slice(sharedModulePaths.length),
  "src/login/pipeline/bootstrap.ts",
];

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("login surface contract", () => {
  test("simplifyLoginPage applies a stable landing contract", async () => {
    const { window } = createTestWindow(createLoginHtml());
    const document = window.document as Document;
    window.CCXP_LITE.decaptcha = {
      predictDigits: vi.fn().mockResolvedValue("654321"),
    };
    window.fetch = vi.fn(
      async () =>
        await Promise.resolve({
          ok: true,
          arrayBuffer: async () => await Promise.resolve(new ArrayBuffer(8)),
        } as Response),
    ) as unknown as typeof window.fetch;
    loadModules(window, loginBootstrapModulePaths);
    const login = requireValue(window.CCXP_LITE.login, "login");

    login.simplifyLoginPage(document);
    login.simplifyLoginPage(document);
    await flushPromises();

    expect(document.body.dataset.ccxpLiteLandingApplied).toBe("true");
    expect(document.documentElement.dataset.ccxpLiteScope).toBe("landing");
    expect(summarizeLoginSurface(document)).toMatchObject({
      hasLandingShell: true,
      hasPasswordToggle: true,
      hasAccountGuide: false,
      supportLinkCount: 0,
    });
    expect(document.querySelectorAll(".ccxp-lite-password-toggle")).toHaveLength(1);
    const accountLabelCell = requireElement(
      document.querySelector("input[name='account']")?.closest("tr")?.querySelector("td"),
      "account label cell",
    );
    expect(accountLabelCell.textContent).toContain("\u5E33\u865F");
    expect(accountLabelCell.querySelector(".ccxp-lite-account-guide-info-button")).not.toBeNull();
    const popup = requireElement(
      accountLabelCell.querySelector(".ccxp-lite-account-format-popup"),
      "account format popup",
    );
    expect(popup.textContent).toContain("\u5B78\u751F\uFF0F\u6821\u53CB\u5E33\u865F");
    expect(popup.querySelectorAll(".ccxp-lite-account-format-item")).toHaveLength(7);
  });

  test("rewriteLoginSurface keeps the tabbed login experience behind a small contract", () => {
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
    const contract = summarizeLoginSurface(result.shell);

    expect(contract).toMatchObject({
      hasAccountGuide: true,
      accountGuideItemCount: 7,
      supportLinkCount: 2,
      announcementRowCount: 0,
      title: "\u767B\u5165\u8CC7\u8A0A",
    });
    expect(contract.supportLinkLabels.join(" ")).toContain("\u7121\u6CD5\u767B\u5165");
  });

  test("support links and announcements localize without asserting the full rendered copy", () => {
    const { window } = createTestWindow(createEnglishLoginAnnouncementHtml());
    const document = window.document as Document;
    loadModules(window, loginModulePaths);
    const loginSupport = requireValue(window.CCXP_LITE.loginSupport, "loginSupport");
    const loginTabs = requireValue(window.CCXP_LITE.loginTabs, "loginTabs");
    const shared = requireValue(window.CCXP_LITE.shared, "shared");

    const announcementTable = requireValue(
      loginSupport.findAnnouncementTable(document),
      "announcementTable",
    );
    loginSupport.prepareAnnouncementTable(announcementTable, {
      sidebarCategoryAnnouncementsAndVoting: "Notices & Voting",
    });

    const supportLinks = requireValue(
      loginSupport.buildSupportLinks(
        document,
        loginSupport.findServiceLink(document),
        loginSupport.findCannotLoginLink(document, undefined),
        {
          cannotLogin: "Cannot sign in?",
          servicePhone: "Service Phone",
        },
      ),
      "supportLinks",
    );
    const guide = loginTabs.createAccountGuide(
      document,
      shared.getLocalizedStrings("en"),
      supportLinks,
    );
    const contract = summarizeLoginSurface(guide);

    expect(summarizeLoginSurface(document)).toMatchObject({
      hasAnnouncementTable: true,
      announcementRowCount: 3,
    });
    expect(contract).toMatchObject({
      accountGuideItemCount: 7,
      supportLinkCount: 2,
      title: "Login Info",
    });
    expect(guide.textContent).toContain("Student / alumni account");
  });

  test("tokenizes bracketed Chinese announcement labels with the date inline", () => {
    const { window } = createTestWindow(createChineseLoginAnnouncementHtml());
    const document = window.document as Document;
    loadModules(window, loginModulePaths);
    const loginSupport = requireValue(window.CCXP_LITE.loginSupport, "loginSupport");

    const announcementTable = requireValue(
      loginSupport.findAnnouncementTable(document),
      "announcementTable",
    );
    loginSupport.prepareAnnouncementTable(announcementTable, {
      sidebarCategoryAnnouncementsAndVoting: "\u516C\u544A\u8207\u6295\u7968",
    });

    const topics = [...announcementTable.querySelectorAll(".ccxp-lite-announcement-topic")];
    const firstTopic = requireValue(topics[0], "firstTopic");

    expect(firstTopic.textContent.replaceAll(/\s+/g, " ").trim()).toContain(
      "2022/12/03 \u7CFB\u7D71\u516C\u544A \u9078\u8AB2\u7CFB\u7D71\u7DAD\u8B77\u901A\u77E5",
    );
    expect(firstTopic.querySelector(".ccxp-lite-announcement-topic-header")?.textContent).toBe(
      "2022/12/03 \u7CFB\u7D71\u516C\u544A",
    );
    expect(announcementTable.querySelectorAll(".ccxp-lite-announcement-date")).toHaveLength(1);
  });
});
