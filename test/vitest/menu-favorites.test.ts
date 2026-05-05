import { describe, expect, test, vi } from "vitest";

import {
  createTestWindow,
  loadModules,
  menuModulePaths,
  requireValue,
} from "./helpers/module-loader.js";

describe("sidebar favorites", () => {
  test("loads favorites from scoped localStorage and writes normalized updates", async () => {
    const { window } = createTestWindow();
    loadModules(window, menuModulePaths);

    const api = requireValue(window.CCXP_LITE.sidebarFavorites, "sidebarFavorites");
    window.localStorage.setItem(
      api.FAVORITES_STORAGE_KEY,
      JSON.stringify(["legacy|Academic>Grades|Semester Grades|main|"]),
    );

    await new Promise<void>((resolve) => {
      api.ensureFavoriteIdsLoaded(resolve);
    });
    const loadedIds = api.getFavoriteIds();

    expect(loadedIds.size).toBe(1);

    api.writeFavoriteIds(new Set(["external", "grades"]));
    expect(JSON.parse(window.localStorage.getItem(api.FAVORITES_STORAGE_KEY) ?? "[]")).toEqual([
      "external",
      "grades",
    ]);
  });

  test("handles blocked localStorage reads and still notifies subscribers on write", async () => {
    const { window } = createTestWindow();
    loadModules(window, menuModulePaths);

    const api = requireValue(window.CCXP_LITE.sidebarFavorites, "sidebarFavorites");
    const callback = vi.fn();
    api.favoriteSubscribers.add(() => {
      callback(undefined);
    });

    const localStorageGetItem = vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    Object.defineProperty(window.top, "localStorage", {
      configurable: true,
      get() {
        return window.localStorage;
      },
    });

    window.chrome.storage.local.get = ((
      _keys: readonly string[] | undefined,
      done: (result: Readonly<Record<string, unknown>>) => void,
    ) => {
      done({
        "ccxp-lite-sidebar-favorites": ["legacy|Academic>Grades|Semester Grades|main|"],
      });
    }) as typeof window.chrome.storage.local.get;

    api.favoriteState.hasLoaded = false;
    await new Promise<void>((resolve) => {
      api.ensureFavoriteIdsLoaded(resolve);
    });

    expect(api.favoriteState.hasLoaded).toBe(true);

    api.writeFavoriteIds(new Set(["grades"]));
    expect(callback).toHaveBeenCalled();
    localStorageGetItem.mockRestore();
  });

  test("syncs across storage events without crashing on invalid payloads", () => {
    const { window } = createTestWindow();
    loadModules(window, menuModulePaths);

    const api = requireValue(window.CCXP_LITE.sidebarFavorites, "sidebarFavorites");
    api.ensureFavoriteStorageSync();

    window.dispatchEvent(
      new window.StorageEvent("storage", {
        key: api.FAVORITES_STORAGE_KEY,
        newValue: JSON.stringify(["grades"]),
      }),
    );
    expect([...api.getFavoriteIds()]).toEqual(["grades"]);

    window.dispatchEvent(
      new window.StorageEvent("storage", {
        key: api.FAVORITES_STORAGE_KEY,
        newValue: "{invalid",
      }),
    );
    expect([...api.getFavoriteIds()]).toEqual([]);
  });
});
