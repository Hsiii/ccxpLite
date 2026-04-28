import { describe, expect, test, vi } from "vitest";

import { createTestWindow, loadModules, menuModulePaths } from "./helpers/module-loader.js";
import { createSidebarModel, createSidebarShellHtml } from "./helpers/menu-fixtures.js";

describe("sidebar ui", () => {
  test("renders dashboard root state and keeps search input synchronized", () => {
    const { window } = createTestWindow(createSidebarShellHtml());
    loadModules(window, menuModulePaths);

    const state = window.CCXP_LITE.sidebarState.getSidebarUiState(window.document);
    state.sidebarVariant = "layered";
    state.searchQuery = "Semester";
    window.CCXP_LITE.sidebarFavorites.favoriteState.hasLoaded = true;
    const model = createSidebarModel();

    window.CCXP_LITE.sidebarUi.renderSidebar(window.document, window.document, model);

    const searchInput = window.document.querySelector(
      ".ccxp-lite-sidebar-search-input",
    ) as HTMLInputElement;
    expect(searchInput.value).toBe("Semester");
    expect(window.document.querySelector(".ccxp-lite-dashboard")).not.toBeNull();
    expect(
      window.document.querySelector(".ccxp-lite-pane-pinned .ccxp-lite-link-card"),
    ).not.toBeNull();
  });

  test("clears invalid currentCategoryId and shows search empty state when nothing matches", () => {
    const { window } = createTestWindow(createSidebarShellHtml());
    loadModules(window, menuModulePaths);

    const state = window.CCXP_LITE.sidebarState.getSidebarUiState(window.document);
    state.sidebarVariant = "layered";
    state.currentCategoryId = "category-missing";
    state.searchQuery = "zzzzz";

    window.CCXP_LITE.sidebarUi.renderSidebar(
      window.document,
      window.document,
      createSidebarModel(),
    );

    expect(state.currentCategoryId).toBe("");
    expect(window.document.querySelector(".ccxp-lite-empty-title")?.textContent).toBe(
      "找不到符合項目",
    );
  });

  test("switching the sidebar variant resets navigation state", () => {
    const { window } = createTestWindow(createSidebarShellHtml());
    loadModules(window, menuModulePaths);

    const state = window.CCXP_LITE.sidebarState.getSidebarUiState(window.document);
    state.sidebarVariant = "classic";
    state.currentCategoryId = "category-courses";
    state.activeLeaf = { id: "grades" };

    window.CCXP_LITE.sidebarUi.mountSidebarVariantSwitch(
      window.document,
      state,
      window.CCXP_LITE.shared.LOCALIZED_STRINGS.zh,
      vi.fn(),
    );

    const switcherNode = window.document.querySelector(
      "[data-ccxp-lite-sidebar-lab-switch]",
    ) as HTMLButtonElement;
    switcherNode.click();

    expect(state.sidebarVariant).toBe("layered");
    expect(state.currentCategoryId).toBe("");
    expect(state.activeLeaf).toBeNull();
  });

  test("renders classic search empty and favorites empty states", () => {
    const { window } = createTestWindow(createSidebarShellHtml());
    loadModules(window, menuModulePaths);

    const state = window.CCXP_LITE.sidebarState.getSidebarUiState(window.document);
    state.sidebarVariant = "classic";
    state.searchQuery = "missing";
    window.CCXP_LITE.sidebarFavorites.favoriteState.hasLoaded = true;

    const model = createSidebarModel();
    model.favorites.directLinks = [];

    window.CCXP_LITE.sidebarUi.renderSidebar(window.document, window.document, model);
    expect(window.document.querySelector(".ccxp-lite-empty")?.textContent).toContain(
      "試試其他關鍵字",
    );

    state.searchQuery = "";
    window.CCXP_LITE.sidebarUi.renderSidebar(window.document, window.document, model);
    expect(window.document.querySelector(".ccxp-lite-empty")?.textContent).toContain(
      "No favorites yet",
    );
  });
});
