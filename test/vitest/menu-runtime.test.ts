import { describe, expect, test, vi } from "vitest";

import { createTestWindow, loadModules, menuModulePaths } from "./helpers/module-loader.js";

describe("sidebar runtime", () => {
  test("detects external-only routes and opens them in a new tab", () => {
    const { window } = createTestWindow();
    loadModules(window, menuModulePaths);

    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const linkItem = {
      id: "external",
      label: "External Inquiry",
      href: "/ccxp/INQUIRE/PE/1/14D/report",
      target: "main",
    };

    expect(window.CCXP_LITE.sidebarRuntime.isExternalLinkTarget(linkItem, window.document)).toBe(
      true,
    );

    window.CCXP_LITE.sidebarRuntime.openLeafDestination(
      window.document,
      window.document,
      linkItem,
      vi.fn(),
    );

    expect(openSpy).toHaveBeenCalledWith(
      "https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/PE/1/14D/report",
      "_blank",
      "noopener",
    );
  });

  test("stores active leaf for layered main-target routes", () => {
    const { window } = createTestWindow(
      "<!doctype html><html><body><div class='ccxp-lite-sidebar-content'></div></body></html>",
    );
    loadModules(window, menuModulePaths);

    const state = window.CCXP_LITE.sidebarState.getSidebarUiState(window.document);
    state.sidebarVariant = "layered";
    const rerender = vi.fn();

    window.CCXP_LITE.sidebarRuntime.openLeafDestination(
      window.document,
      window.document,
      {
        id: "grades",
        label: "Semester Grades",
        href: "/grades",
        target: "main",
      },
      rerender,
    );

    expect(state.activeLeaf?.label).toBe("Semester Grades");
    expect(rerender).toHaveBeenCalled();
  });

  test("activates legacy links into the destination frame and records the initial main URL once", () => {
    const { window } = createTestWindow(
      "<!doctype html><html><body><frame name='main' src='/start'></frame></body></html>",
      "https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/index.php?ACIXSTORE=ABC123",
    );
    loadModules(window, menuModulePaths);

    const destinationFrame = window.document.createElement("iframe");
    window.CCXP_LITE.sidebarRuntime.activateLegacyLink(
      {
        id: "grades",
        label: "Semester Grades",
        href: "/grades",
        target: "main",
      },
      window.document,
      destinationFrame,
    );

    expect(destinationFrame.src).toBe("https://www.ccxp.nthu.edu.tw/grades");

    window.CCXP_LITE.sidebarRuntime.captureInitialMainFrameUrl();
    window.CCXP_LITE.sidebarRuntime.captureInitialMainFrameUrl();

    expect(
      window.sessionStorage.getItem(window.CCXP_LITE.sidebarFavorites.INITIAL_MAIN_URL_STORAGE_KEY),
    ).toBe("https://www.ccxp.nthu.edu.tw/start");
  });
});
