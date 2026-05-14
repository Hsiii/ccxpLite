import { describe, expect, test } from "vitest";
import {
  createTestWindow,
  loadModules,
  menuModulePaths,
  requireElement,
  requireValue,
} from "../helpers/module-loader.js";

describe("sidebar state", () => {
  test("shares sidebar state across frame documents in the same top-level page", () => {
    const { window } = createTestWindow();
    loadModules(window, menuModulePaths);
    const { getSidebarUiState } = requireValue(window.CCXP_LITE.sidebarState, "sidebarState");
    const frameDocument = {
      defaultView: {
        top: window,
      },
    } as unknown as Document;

    expect(getSidebarUiState(frameDocument)).toBe(getSidebarUiState(window.document));
  });

  test("persists normalized variants and falls back to classic on storage failure", () => {
    const { window } = createTestWindow();
    loadModules(window, menuModulePaths);
    const { getPersistedSidebarVariant, setPersistedSidebarVariant } = requireValue(
      window.CCXP_LITE.sidebarState,
      "sidebarState",
    );
    expect(setPersistedSidebarVariant("layered")).toBe("layered");
    expect(window.localStorage.getItem("ccxp-lite-sidebar-variant")).toBe("layered");
    expect(
      (setPersistedSidebarVariant as unknown as (value: string) => "classic" | "layered")(
        "unexpected",
      ),
    ).toBe("layered");
    expect(getPersistedSidebarVariant()).toBe("layered");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("storage blocked");
      },
    });
    expect(
      requireValue(window.CCXP_LITE.sidebarState, "sidebarState").getPersistedSidebarVariant(),
    ).toBe("layered");
    expect(
      requireValue(window.CCXP_LITE.sidebarState, "sidebarState").setPersistedSidebarVariant(
        "classic",
      ),
    ).toBe("classic");
  });
  test("persists and restores scroll positions by view", () => {
    const { window } = createTestWindow(
      "<!doctype html><html><body><div class='ccxp-lite-sidebar-content'></div></body></html>",
    );
    const document = window.document as Document;
    loadModules(window, menuModulePaths);
    const content = requireElement(
      document.querySelector<HTMLElement>(".ccxp-lite-sidebar-content"),
      "sidebar content",
    );
    content.scrollTop = 48;
    const { getSidebarUiState, persistSidebarScroll, restoreSidebarScroll } = requireValue(
      window.CCXP_LITE.sidebarState,
      "sidebarState",
    );
    persistSidebarScroll(document, "category");
    expect(getSidebarUiState(document).scrollTopByView.category).toBe(48);
    restoreSidebarScroll(content, 96);
    expect(content.scrollTop).toBe(96);
  });
});
