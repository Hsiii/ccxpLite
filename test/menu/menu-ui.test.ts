import { describe, expect, test } from "vitest";

import { createSidebarShellHtml } from "../helpers/menu-fixtures.js";
import {
  createTestWindow,
  loadModules,
  menuModulePaths,
  requireElement,
  requireValue,
} from "../helpers/module-loader.js";

describe("sidebar ui", () => {
  test("pins every link inside a second-layer classic folder without using the chevron slot", () => {
    const { window } = createTestWindow(createSidebarShellHtml());
    loadModules(window, menuModulePaths);

    const sidebarState = requireValue(window.CCXP_LITE.sidebarState, "sidebarState");
    const sidebarUi = requireValue(window.CCXP_LITE.sidebarUi, "sidebarUi");
    const sidebarFavorites = requireValue(window.CCXP_LITE.sidebarFavorites, "sidebarFavorites");
    const strings = window.CCXP_LITE.sharedConstants?.LOCALIZED_STRINGS.en;
    const document = window.document as unknown as Document;
    const state = sidebarState.getSidebarUiState(document);
    const gradesLink: CcxpLiteSidebarLinkItem = {
      id: "grades",
      legacyId: "legacy-grades",
      label: "Semester Grades",
      href: "/grades",
      target: "main",
    };
    const scheduleLink: CcxpLiteSidebarLinkItem = {
      id: "schedule",
      legacyId: "legacy-schedule",
      label: "Course Schedule",
      href: "/schedule",
      target: "main",
    };
    const model: CcxpLiteSidebarModel = {
      favorites: {
        id: "category-favorites",
        label: "Favorite",
        icon: "star",
        blocks: [],
        links: [],
        emptyMessage: "Press star at any function to save it here",
        kind: "category",
      },
      categories: [
        {
          id: "category-courses",
          label: "Courses & Grades",
          icon: "notepad-text",
          blocks: [
            {
              id: "section-academic",
              label: "Academic",
              links: [gradesLink, scheduleLink],
              kind: "block",
            },
          ],
          kind: "category",
        },
      ],
    };

    state.sidebarVariant = "classic";
    state.classicExpandedItemIds = ["category-courses"];
    sidebarFavorites.favoriteState.ids = new Set();
    sidebarFavorites.favoriteState.hasLoaded = true;

    sidebarUi.renderSidebar(document, document, model, strings);

    const blockRow = requireElement(
      document.querySelector('button[title="Academic"]'),
      "Expected classic block row",
    );
    expect(blockRow.classList.contains("ccxp-lite-row-button-has-dual-trailing")).toBe(true);
    expect(blockRow.querySelector(".ccxp-lite-chevron")).not.toBeNull();

    const favoriteToggle = requireElement(
      blockRow.querySelector(".ccxp-lite-favorite-toggle-block"),
      "Expected block favorite toggle",
    );
    const clickEvent = new Event("click", { bubbles: true });
    favoriteToggle.dispatchEvent(clickEvent);

    expect([...sidebarFavorites.getFavoriteIds()]).toEqual(["grades", "schedule"]);
  });
});
