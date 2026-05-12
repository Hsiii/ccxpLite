import { describe, expect, test, vi } from "vitest";

import {
  createTestWindow,
  loadModules,
  menuModulePaths,
  requireValue,
} from "../helpers/module-loader.js";
import { createSidebarModel, createSidebarShellHtml } from "../helpers/menu-fixtures.js";
import { summarizeSidebarSurface } from "../helpers/ui-contracts.js";

function createSidebarTreeDocument() {
  return `
    <!doctype html>
    <html>
      <body>
        <script>
          foldersTree = gFld("root", "");
          aux0 = insFld(foldersTree, gFld("\u8AB2\u7A0B\u3001\u6210\u7E3E Courses, transcript", ""));
          insDoc(aux0, gLnk(0, "\u5B78\u671F\u6210\u7E3E", "/grades?sid=1&keep=yes"));
        </script>
      </body>
    </html>
  `;
}

describe("sidebar surface contract", () => {
  test("renderSidebar exposes a stable layered dashboard contract", () => {
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

    requireValue(window.CCXP_LITE.sidebarUi, "sidebarUi").renderSidebar(
      document,
      document,
      createSidebarModel(),
    );

    expect(summarizeSidebarSurface(document)).toMatchObject({
      variant: "layered",
      hasVariantSwitch: true,
      hasDashboard: true,
      searchValue: "Semester",
      pinnedLinkCount: 1,
    });
  });

  test("classic mode and variant switching stay behind a state contract", () => {
    const { window } = createTestWindow(createSidebarShellHtml());
    const document = window.document as Document;
    loadModules(window, menuModulePaths);

    const sidebarState = requireValue(window.CCXP_LITE.sidebarState, "sidebarState");
    const sidebarFavorites = requireValue(window.CCXP_LITE.sidebarFavorites, "sidebarFavorites");
    const sidebarUi = requireValue(window.CCXP_LITE.sidebarUi, "sidebarUi");
    const state = sidebarState.getSidebarUiState(document);
    state.sidebarVariant = "classic";
    state.currentCategoryId = "category-courses";
    state.activeLeaf = { id: "grades", label: "Semester Grades" };
    state.searchQuery = "missing";
    sidebarFavorites.favoriteState.hasLoaded = true;

    const model = createSidebarModel();
    model.favorites.links = [];
    sidebarUi.renderSidebar(document, document, model);

    expect(summarizeSidebarSurface(document)).toMatchObject({
      variant: "classic",
      hasClassicList: true,
      emptyTitle: "\u627E\u4E0D\u5230\u7B26\u5408\u9805\u76EE",
    });

    const switcherNode = requireValue(
      document.querySelector<HTMLElement>("[data-ccxp-lite-sidebar-lab-switch]"),
      "variant switcher",
    );
    switcherNode.click();

    expect(state.sidebarVariant).toBe("layered");
    expect(state.currentCategoryId).toBe("");
    expect(state.activeLeaf).toBeUndefined();
  });

  test("destination rendering only asserts loading, success, error, and open-in-new-tab behavior", () => {
    const { window } = createTestWindow(createSidebarShellHtml());
    const document = window.document as Document;
    loadModules(window, menuModulePaths);

    const state = requireValue(window.CCXP_LITE.sidebarState, "sidebarState").getSidebarUiState(
      document,
    );
    state.sidebarVariant = "layered";
    state.currentCategoryId = "category-courses";
    state.activeLeaf = createSidebarModel().categories[0].blocks[0].links[0];
    window.setTimeout = vi.fn(() => 1) as unknown as typeof window.setTimeout;

    requireValue(window.CCXP_LITE.sidebarUi, "sidebarUi").renderSidebar(
      document,
      document,
      createSidebarModel(),
    );
    expect(summarizeSidebarSurface(document).destinationState).toBe("loading");

    const frame = requireValue(
      document.querySelector<HTMLElement>(".ccxp-lite-destination-frame"),
      "destination frame",
    );
    frame.dispatchEvent(new Event("load"));
    expect(summarizeSidebarSurface(document).destinationState).toBe("success");

    const openSpy = vi
      .spyOn(window, "open")
      .mockImplementation((() => undefined) as unknown as typeof window.open);
    const openButton = requireValue(
      [...document.querySelectorAll<HTMLButtonElement>("button")].find(
        (button) => button.textContent === "\u65B0\u5206\u9801\u958B\u555F",
      ),
      "open button",
    );
    openButton.click();
    expect(openSpy).toHaveBeenCalledWith(
      "https://www.ccxp.nthu.edu.tw/grades",
      "_blank",
      "noopener",
    );
  });

  test("timeout and simplifySidebar keep the bootstrap contract small and stable", () => {
    const { window } = createTestWindow(createSidebarTreeDocument());
    const document = window.document as Document;
    loadModules(window, [...menuModulePaths, "src/menu/ui/bootstrap.ts"]);

    const sidebar = requireValue(window.CCXP_LITE.sidebar, "sidebar");
    const sidebarFavorites = requireValue(window.CCXP_LITE.sidebarFavorites, "sidebarFavorites");

    sidebar.simplifySidebar(
      {
        contentDocument: document,
      } as unknown as HTMLIFrameElement,
      () => undefined,
    );
    sidebar.simplifySidebar(
      {
        contentDocument: document,
      } as unknown as HTMLIFrameElement,
      () => undefined,
    );

    expect(sidebarFavorites.favoriteSubscribers.size).toBe(1);

    const shellContract = summarizeSidebarSurface(document);
    expect(shellContract.hasVariantSwitch).toBe(true);

    const rerenderModel = createSidebarModel();
    const rerenderState = requireValue(
      window.CCXP_LITE.sidebarState,
      "sidebarState",
    ).getSidebarUiState(document);
    rerenderState.sidebarVariant = "layered";
    rerenderState.currentCategoryId = "category-courses";
    rerenderState.activeLeaf = {
      ...rerenderModel.categories[0].blocks[0].links[0],
      nonce: 1,
    };
    window.setTimeout = ((callback: TimerHandler) => {
      if (typeof callback === "function") {
        (callback as () => void)();
      }
      return 1;
    }) as typeof window.setTimeout;

    requireValue(window.CCXP_LITE.sidebarUi, "sidebarUi").renderSidebar(
      document,
      document,
      rerenderModel,
    );
    expect(summarizeSidebarSurface(document).destinationState).toBe("error");

    const retryButton = requireValue(
      [...document.querySelectorAll<HTMLButtonElement>("button")].find(
        (button) => button.textContent === "\u91CD\u8A66",
      ),
      "retry button",
    );
    retryButton.click();
    expect(rerenderState.activeLeaf.nonce).not.toBe(1);
  });
});
