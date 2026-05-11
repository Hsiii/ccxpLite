import { describe, expect, test } from "vitest";

import {
  createTestWindow,
  landingModulePaths,
  loadModules,
  requireValue,
} from "./helpers/module-loader.js";
import { createEnglishLandingAnnouncementHtml } from "./helpers/landing-fixtures.js";

describe("landing support", () => {
  test("finds and prepares the English system news table from the right rail", () => {
    const { window } = createTestWindow(createEnglishLandingAnnouncementHtml());
    const document = window.document as Document;
    loadModules(window, landingModulePaths);
    const landingSupport = requireValue(window.CCXP_LITE.landingSupport, "landingSupport");

    const announcementTable = landingSupport.findAnnouncementTable(document);
    expect(announcementTable).toBeDefined();

    landingSupport.prepareAnnouncementTable(announcementTable, {
      sidebarCategoryAnnouncementsAndVoting: "Notices & Voting",
    });

    expect(announcementTable?.dataset.ccxpLiteAnnouncementPrepared).toBe("true");
    expect(announcementTable?.querySelector(".ccxp-lite-announcement-title")?.textContent).toBe(
      "System News",
    );
    expect(announcementTable?.querySelectorAll(".ccxp-lite-announcement-row")).toHaveLength(3);
  });

  test("detects English support-link equivalents for cannot sign in and information", () => {
    const { window } = createTestWindow(createEnglishLandingAnnouncementHtml());
    const document = window.document as Document;
    loadModules(window, landingModulePaths);
    const landingSupport = requireValue(window.CCXP_LITE.landingSupport, "landingSupport");

    const cannotLoginLink = landingSupport.findCannotLoginLink(document, undefined);
    const serviceLink = landingSupport.findServiceLink(document);
    const supportLinks = landingSupport.buildLandingSupportLinks(
      document,
      serviceLink,
      cannotLoginLink,
      {
        cannotLogin: "Cannot sign in?",
        servicePhone: "Service Phone",
      },
    );

    expect(cannotLoginLink?.getAttribute("href")).toContain("forget_en.php");
    expect(
      serviceLink?.querySelector("a")?.getAttribute("href") ?? serviceLink?.getAttribute("href"),
    ).toContain("inquire_cpr_en.html");
    expect(supportLinks?.textContent).toContain("Cannot sign in?");
    expect(supportLinks?.textContent).toContain("Information");
  });
});
