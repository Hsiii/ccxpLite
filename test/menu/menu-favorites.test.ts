import { describe, expect, test, vi } from "vitest";

import {
  createTestWindow,
  loadModules,
  menuModulePaths,
  requireValue,
} from "../helpers/module-loader.js";

describe("sidebar favorites", () => {
  test("migrates scoped localStorage favorites into canonical extension storage", async () => {
    const { window } = createTestWindow();
    loadModules(window, menuModulePaths);

    const api = requireValue(window.CCXP_LITE.sidebarFavorites, "sidebarFavorites");
    let persistedFavorites: unknown;
    window.chrome.storage.local.set = ((
      items: Readonly<Record<string, unknown>>,
      done?: () => void,
    ) => {
      persistedFavorites = items[api.FAVORITES_STORAGE_KEY];
      done?.();
    }) as typeof window.chrome.storage.local.set;
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
    expect(persistedFavorites).toMatchObject({
      version: 1,
      ids: ["external", "grades"],
    });
  });

  test("handles blocked localStorage reads and still notifies subscribers on write", async () => {
    const { window } = createTestWindow();
    loadModules(window, menuModulePaths);

    const api = requireValue(window.CCXP_LITE.sidebarFavorites, "sidebarFavorites");
    const callback = vi.fn();
    api.subscribeToFavoriteChanges(() => {
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
        [api.FAVORITES_STORAGE_KEY]: {
          version: 1,
          updatedAt: 1,
          ids: ["legacy|Academic>Grades|Semester Grades|main|"],
        },
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

  test("syncs across extension storage changes without crashing on invalid payloads", () => {
    const { window } = createTestWindow();
    loadModules(window, menuModulePaths);

    const api = requireValue(window.CCXP_LITE.sidebarFavorites, "sidebarFavorites");
    let storageListener:
      | ((
          changes: Readonly<Record<string, chrome.storage.StorageChange>>,
          areaName: chrome.storage.AreaName,
        ) => void)
      | undefined;
    const addListener = vi
      .spyOn(window.chrome.storage.onChanged, "addListener")
      .mockImplementation(
        (
          callback: (
            changes: Readonly<Record<string, chrome.storage.StorageChange>>,
            areaName: chrome.storage.AreaName,
          ) => void,
        ) => {
          storageListener = callback;
        },
      );
    api.ensureFavoriteStorageSync();
    const listener = requireValue(storageListener, "storage listener");

    listener(
      {
        [api.FAVORITES_STORAGE_KEY]: {
          oldValue: undefined,
          newValue: {
            version: 1,
            updatedAt: 1,
            ids: ["grades"],
          },
        },
      },
      "local",
    );
    expect([...api.getFavoriteIds()]).toEqual(["grades"]);

    listener(
      {
        [api.FAVORITES_STORAGE_KEY]: {
          oldValue: undefined,
          newValue: "{invalid",
        },
      },
      "local",
    );
    expect([...api.getFavoriteIds()]).toEqual([]);
    addListener.mockRestore();
  });

  test("matches versioned favorites even when menu depth changes", () => {
    const { window } = createTestWindow();
    loadModules(window, menuModulePaths);

    const api = requireValue(window.CCXP_LITE.sidebarFavorites, "sidebarFavorites");
    const currentLink = {
      id: api.createLinkId({
        label: "Apply now",
        pathSegments: ["Student services", "Select courses", "Apply now"],
        target: "main",
      }),
      legacyId: api.createLegacyLinkId({
        label: "Apply now",
        href: "/courses/apply",
        target: "main",
      }),
      label: "Apply now",
      pathSegments: ["Student services", "Select courses", "Apply now"],
      href: "/courses/apply",
      target: "main",
    };
    const savedFavoriteId = api.createLinkId({
      label: "Apply now",
      pathSegments: ["Student services", "Apply now"],
      target: "main",
    });

    expect(api.getMatchingFavoriteIds(currentLink, new Set([savedFavoriteId]))).toEqual([
      savedFavoriteId,
    ]);
  });

  test("creates the same favorite id regardless of tree depth for the same route", () => {
    const { window } = createTestWindow();
    loadModules(window, menuModulePaths);

    const api = requireValue(window.CCXP_LITE.sidebarFavorites, "sidebarFavorites");

    expect(
      api.createLinkId({
        label: "Apply now",
        href: "/courses/apply",
        pathSegments: ["Student services", "Apply now"],
        target: "main",
      }),
    ).toBe(
      api.createLinkId({
        label: "Apply now",
        href: "/courses/apply",
        pathSegments: ["Student services", "Select courses", "Apply now"],
        target: "main",
      }),
    );
  });
});
