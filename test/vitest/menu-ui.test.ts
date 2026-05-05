import { describe, expect, test } from "vitest";

import {
  createTestWindow,
  loadModules,
  menuModulePaths,
  requireElement,
  requireValue,
} from "./helpers/module-loader.js";
import { createSidebarModel, createSidebarShellHtml } from "./helpers/menu-fixtures.js";

describe("sidebar ui", () => {
  test("renders dashboard root state and keeps search input synchronized", () => {
    const { window } = createTestWindow(createSidebarShellHtml());
    const document = window.document as Document;
    loadModules(window, menuModulePaths);

    const state = requireValue(window.CCXP_LITE.sidebarState, "sidebarState").getSidebarUiState(
      document,
    );
    state.sidebarVariant = "layered";
    state.searchQuery = "Semester";
    requireValue(window.CCXP_LITE.sidebarFavorites, "sidebarFavorites").favoriteState.hasLoaded =
      true;
    const model = createSidebarModel();

    requireValue(window.CCXP_LITE.sidebarUi, "sidebarUi").renderSidebar(document, document, model);

    const searchInput = requireElement(
      document.querySelector<HTMLInputElement>(".ccxp-lite-sidebar-search-input"),
      "sidebar search input",
    );
    expect(searchInput.value).toBe("Semester");
    expect(document.querySelector(".ccxp-lite-dashboard")).not.toBeNull();
    expect(document.querySelector(".ccxp-lite-pane-pinned .ccxp-lite-link-card")).not.toBeNull();
  });

  test("clears invalid currentCategoryId and shows search empty state when nothing matches", () => {
    const { window } = createTestWindow(createSidebarShellHtml());
    const document = window.document as Document;
    loadModules(window, menuModulePaths);

    const sidebarState = requireValue(window.CCXP_LITE.sidebarState, "sidebarState");
    const sidebarUi = requireValue(window.CCXP_LITE.sidebarUi, "sidebarUi");
    const state = sidebarState.getSidebarUiState(document);
    state.sidebarVariant = "layered";
    state.currentCategoryId = "category-missing";
    state.searchQuery = "zzzzz";

    sidebarUi.renderSidebar(document, document, createSidebarModel());

    expect(state.currentCategoryId).toBe("");
    expect(document.querySelector(".ccxp-lite-empty-title")?.textContent).toBe(
      "\u627E\u4E0D\u5230\u7B26\u5408\u9805\u76EE",
    );
  });

  test("switching the sidebar variant resets navigation state", () => {
    const { window } = createTestWindow(createSidebarShellHtml());
    const document = window.document as Document;
    loadModules(window, menuModulePaths);

    const sidebarState = requireValue(window.CCXP_LITE.sidebarState, "sidebarState");
    const sidebarUi = requireValue(window.CCXP_LITE.sidebarUi, "sidebarUi");
    const state = sidebarState.getSidebarUiState(document);
    state.sidebarVariant = "classic";
    state.currentCategoryId = "category-courses";
    state.activeLeaf = { id: "grades", label: "Semester Grades" };

    sidebarUi.mountSidebarVariantSwitch(
      document,
      state,
      requireValue(window.CCXP_LITE.shared, "shared").LOCALIZED_STRINGS.zh,
      () => undefined,
    );

    const switcherNode = requireElement(
      document.querySelector<HTMLElement>("[data-ccxp-lite-sidebar-lab-switch]"),
      "variant switcher",
    );
    switcherNode.click();

    expect(state.sidebarVariant).toBe("layered");
    expect(state.currentCategoryId).toBe("");
    expect(state.activeLeaf).toBeUndefined();
  });

  test("renders classic search empty and favorites empty states", () => {
    const { window } = createTestWindow(createSidebarShellHtml());
    const document = window.document as Document;
    loadModules(window, menuModulePaths);

    const sidebarState = requireValue(window.CCXP_LITE.sidebarState, "sidebarState");
    const sidebarFavorites = requireValue(window.CCXP_LITE.sidebarFavorites, "sidebarFavorites");
    const sidebarUi = requireValue(window.CCXP_LITE.sidebarUi, "sidebarUi");
    const state = sidebarState.getSidebarUiState(document);
    state.sidebarVariant = "classic";
    state.searchQuery = "missing";
    sidebarFavorites.favoriteState.hasLoaded = true;

    const model = createSidebarModel();
    model.favorites.directLinks = [];

    sidebarUi.renderSidebar(document, document, model);
    expect(document.querySelector(".ccxp-lite-empty")?.textContent).toContain(
      "\u8A66\u8A66\u5176\u4ED6\u95DC\u9375\u5B57",
    );

    state.searchQuery = "";
    sidebarUi.renderSidebar(document, document, model);
    expect(document.querySelector(".ccxp-lite-empty")?.textContent).toContain("No favorites yet");
  });
});
