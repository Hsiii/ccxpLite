import { describe, expect, test, vi } from "vitest";

import { createTestWindow, loadModules, menuModulePaths } from "./helpers/module-loader.js";

describe("sidebar favorites", () => {
  test("loads favorites from scoped localStorage and writes normalized updates", async () => {
    const { window } = createTestWindow();
    loadModules(window, menuModulePaths);

    const api = window.CCXP_LITE.sidebarFavorites;
    window.localStorage.setItem(
      api.FAVORITES_STORAGE_KEY,
      JSON.stringify(["legacy|Academic>Grades|Semester Grades|main|"]),
    );

    await new Promise<void>((resolve) => api.ensureFavoriteIdsLoaded(resolve));
    const loadedIds = api.getFavoriteIds();

    expect(loadedIds.size).toBe(1);

    api.writeFavoriteIds(["grades", "external"]);
    expect(JSON.parse(window.localStorage.getItem(api.FAVORITES_STORAGE_KEY) || "[]")).toEqual([
      "grades",
      "external",
    ]);
  });

  test("falls back to legacy extension storage and notifies subscribers", async () => {
    const { window } = createTestWindow();
    loadModules(window, menuModulePaths);

    const api = window.CCXP_LITE.sidebarFavorites;
    const callback = vi.fn();
    api.favoriteSubscribers.add(callback);

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("blocked");
      },
    });

    window.chrome.storage.local.get = (
      _keys: string[] | null,
      done: (result: Record<string, unknown>) => void,
    ) => {
      done({
        "ccxp-lite-sidebar-favorites": ["legacy|Academic>Grades|Semester Grades|main|"],
      });
    };

    api.favoriteState.hasLoaded = false;
    await new Promise<void>((resolve) => api.ensureFavoriteIdsLoaded(resolve));

    expect(api.getFavoriteIds().size).toBe(1);

    api.writeFavoriteIds(["grades"]);
    expect(callback).toHaveBeenCalled();
  });

  test("syncs across storage events without crashing on invalid payloads", () => {
    const { window } = createTestWindow();
    loadModules(window, menuModulePaths);

    const api = window.CCXP_LITE.sidebarFavorites;
    api.ensureFavoriteStorageSync();

    window.dispatchEvent(
      new window.StorageEvent("storage", {
        key: api.FAVORITES_STORAGE_KEY,
        newValue: JSON.stringify(["grades"]),
      }),
    );
    expect(Array.from(api.getFavoriteIds())).toEqual(["grades"]);

    window.dispatchEvent(
      new window.StorageEvent("storage", {
        key: api.FAVORITES_STORAGE_KEY,
        newValue: "{invalid",
      }),
    );
    expect(Array.from(api.getFavoriteIds())).toEqual([]);
  });
});
