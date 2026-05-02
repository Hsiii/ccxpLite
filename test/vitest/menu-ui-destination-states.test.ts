import { describe, expect, test, vi } from "vitest";
import {
  createTestWindow,
  loadModules,
  menuModulePaths,
  requireValue,
} from "./helpers/module-loader.js";
import { createSidebarModel, createSidebarShellHtml } from "./helpers/menu-fixtures.js";

describe("sidebar destination states", () => {
  test("shows loading first and settles into success on iframe load", () => {
    const { window } = createTestWindow(createSidebarShellHtml());
    const document = window.document as Document;
    loadModules(window, menuModulePaths);
    const state = requireValue(window.CCXP_LITE.sidebarState, "sidebarState").getSidebarUiState(
      document,
    );
    state.sidebarVariant = "layered";
    state.currentCategoryId = "category-courses";
    state.activeLeaf = createSidebarModel().categories[0].sections[0].directLinks[0];
    window.setTimeout = vi.fn(() => 1) as unknown as typeof window.setTimeout;
    requireValue(window.CCXP_LITE.sidebarUi, "sidebarUi").renderSidebar(
      window.document,
      document,
      createSidebarModel(),
    );
    const loading = document.querySelector(".ccxp-lite-destination-loading");
    const frame = document.querySelector(".ccxp-lite-destination-frame");
    const error = document.querySelector(".ccxp-lite-destination-error");
    expect(loading.hidden).toBe(false);
    frame.dispatchEvent(new Event("load"));
    expect(loading.hidden).toBe(true);
    expect(frame.hidden).toBe(false);
    expect(error.hidden).toBe(true);
  });
  test("shows error on timeout and retry refreshes the active leaf nonce", () => {
    const { window } = createTestWindow(createSidebarShellHtml());
    const document = window.document as Document;
    loadModules(window, menuModulePaths);
    const rerenderModel = createSidebarModel();
    const state = requireValue(window.CCXP_LITE.sidebarState, "sidebarState").getSidebarUiState(
      document,
    );
    state.sidebarVariant = "layered";
    state.currentCategoryId = "category-courses";
    state.activeLeaf = {
      ...rerenderModel.categories[0].sections[0].directLinks[0],
      nonce: 1,
    };
    window.setTimeout = ((callback: TimerHandler) => {
      if (typeof callback === "function") {
        (callback as () => void)();
      }
      return 1;
    }) as typeof window.setTimeout;
    window.CCXP_LITE.sidebarUi.renderSidebar(document, document, rerenderModel);
    const error = document.querySelector(".ccxp-lite-destination-error");
    expect(error.hidden).toBe(false);
    const retryButton = [...document.querySelectorAll<HTMLButtonElement>("button")].find(
      (button) => button.textContent === "\u91CD\u8A66",
    );
    retryButton.click();
    expect(state.activeLeaf?.nonce).not.toBe(1);
  });
  test("open in new tab delegates to window.open", () => {
    const { window } = createTestWindow(createSidebarShellHtml());
    const document = window.document as Document;
    loadModules(window, menuModulePaths);
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => undefined);
    const model = createSidebarModel();
    const state = requireValue(window.CCXP_LITE.sidebarState, "sidebarState").getSidebarUiState(
      document,
    );
    state.sidebarVariant = "layered";
    state.currentCategoryId = "category-courses";
    state.activeLeaf = model.categories[0].sections[0].directLinks[0];
    window.setTimeout = vi.fn(() => 1) as unknown as typeof window.setTimeout;
    window.CCXP_LITE.sidebarUi.renderSidebar(document, document, model);
    const openButton = [...document.querySelectorAll<HTMLButtonElement>("button")].find(
      (button) => button.textContent === "\u65B0\u5206\u9801\u958B\u555F",
    );
    openButton.click();
    expect(openSpy).toHaveBeenCalledWith(
      "https://www.ccxp.nthu.edu.tw/grades",
      "_blank",
      "noopener",
    );
  });
});
