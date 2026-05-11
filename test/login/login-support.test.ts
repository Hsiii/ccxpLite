import { describe, expect, test } from "vitest";

import {
  createTestWindow,
  loginModulePaths,
  loadModules,
  requireValue,
} from "../helpers/module-loader.js";
import { createEnglishLoginAnnouncementHtml } from "../helpers/login-fixtures.js";

describe("login support", () => {
  test("finds and prepares the English system news table from the right rail", () => {
    const { window } = createTestWindow(createEnglishLoginAnnouncementHtml());
    const document = window.document as Document;
    loadModules(window, loginModulePaths);
    const loginSupport = requireValue(window.CCXP_LITE.loginSupport, "loginSupport");

    const announcementTable = loginSupport.findAnnouncementTable(document);
    expect(announcementTable).toBeDefined();

    loginSupport.prepareAnnouncementTable(announcementTable, {
      sidebarCategoryAnnouncementsAndVoting: "Notices & Voting",
    });

    expect(announcementTable?.dataset.ccxpLiteAnnouncementPrepared).toBe("true");
    expect(announcementTable?.querySelector(".ccxp-lite-announcement-title")?.textContent).toBe(
      "System News",
    );
    expect(announcementTable?.querySelectorAll(".ccxp-lite-announcement-row")).toHaveLength(3);
  });

  test("detects English support-link equivalents for cannot sign in and information", () => {
    const { window } = createTestWindow(createEnglishLoginAnnouncementHtml());
    const document = window.document as Document;
    loadModules(window, loginModulePaths);
    const loginSupport = requireValue(window.CCXP_LITE.loginSupport, "loginSupport");

    const cannotLoginLink = loginSupport.findCannotLoginLink(document, undefined);
    const serviceLink = loginSupport.findServiceLink(document);
    const supportLinks = loginSupport.buildSupportLinks(document, serviceLink, cannotLoginLink, {
      cannotLogin: "Cannot sign in?",
      servicePhone: "Service Phone",
    });

    expect(cannotLoginLink?.getAttribute("href")).toContain("forget_en.php");
    expect(
      serviceLink?.querySelector("a")?.getAttribute("href") ?? serviceLink?.getAttribute("href"),
    ).toContain("inquire_cpr_en.html");
    expect(supportLinks?.textContent).toContain("Cannot sign in?");
    expect(supportLinks?.textContent).toContain("Information");
  });
});
