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
});
