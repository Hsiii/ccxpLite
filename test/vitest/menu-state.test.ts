import { describe, expect, test } from "vitest";

import { createTestWindow, loadModules, menuModulePaths } from "./helpers/module-loader";

describe("sidebar state", () => {
  test("returns a stable state object per document with the expected defaults", () => {
    const { window } = createTestWindow();
    loadModules(window, menuModulePaths);

    const { getSidebarUiState } = window.CCXP_LITE.sidebarState;
    const state = getSidebarUiState(window.document);

    expect(getSidebarUiState(window.document)).toBe(state);
    expect(state).toMatchObject({
      currentCategoryId: "",
      searchQuery: "",
      activeLeaf: null,
      sidebarVariant: "classic",
      classicExpandedItemIds: ["category-favorites"],
      scrollTopByView: {
        root: 0,
        category: 0,
        destination: 0,
      },
    });
  });

  test("persists normalized variants and falls back to classic on storage failure", () => {
    const { window } = createTestWindow();
    loadModules(window, menuModulePaths);

    const { getPersistedSidebarVariant, setPersistedSidebarVariant } =
      window.CCXP_LITE.sidebarState;

    expect(setPersistedSidebarVariant("layered")).toBe("layered");
    expect(window.localStorage.getItem("ccxp-lite-sidebar-variant")).toBe("layered");
    expect(setPersistedSidebarVariant("unexpected")).toBe("layered");
    expect(getPersistedSidebarVariant()).toBe("layered");

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("storage blocked");
      },
    });

    expect(window.CCXP_LITE.sidebarState.getPersistedSidebarVariant()).toBe("layered");
    expect(window.CCXP_LITE.sidebarState.setPersistedSidebarVariant("classic")).toBe("classic");
  });

  test("persists and restores scroll positions by view", () => {
    const { window } = createTestWindow(
      "<!doctype html><html><body><div class='ccxp-lite-sidebar-content'></div></body></html>",
    );
    loadModules(window, menuModulePaths);

    const content = window.document.querySelector(".ccxp-lite-sidebar-content") as HTMLElement;
    content.scrollTop = 48;

    const { getSidebarUiState, persistSidebarScroll, restoreSidebarScroll } =
      window.CCXP_LITE.sidebarState;

    persistSidebarScroll(window.document, "category");
    expect(getSidebarUiState(window.document).scrollTopByView.category).toBe(48);

    restoreSidebarScroll(content, 96);
    expect(content.scrollTop).toBe(96);
  });
});
