(function registerCcxpLiteSidebarFavorites(globalScope: Window & typeof globalThis) {
  const namespace = (globalScope.CCXP_LITE || (globalScope.CCXP_LITE = {})) as CcxpLiteNamespace;

  const FAVORITES_STORAGE_SCOPE_PATH = "/ccxp/INQUIRE/select_entry.php";
  const FAVORITES_STORAGE_KEY = `ccxp-lite-sidebar-favorites::${FAVORITES_STORAGE_SCOPE_PATH}`;
  const INITIAL_MAIN_URL_STORAGE_KEY = `ccxp-lite-sidebar-initial-main-url::${FAVORITES_STORAGE_SCOPE_PATH}`;

  const favoriteState: {
    ids: Set<string>;
    hasLoaded: boolean;
    pendingLoad: Promise<void> | null;
  } = {
    ids: new Set<string>(),
    hasLoaded: false,
    pendingLoad: null,
  };

  const favoriteSubscribers = new Set<() => void>();
  let favoriteStorageSyncBound = false;

  function getFavoriteIds(): Set<string> {
    return new Set(favoriteState.ids);
  }

  function ensureFavoriteIdsLoaded(onReady?: () => void) {
    if (favoriteState.hasLoaded) {
      if (typeof onReady === "function") {
        onReady();
      }
      return;
    }

    if (favoriteState.pendingLoad) {
      if (typeof onReady === "function") {
        favoriteState.pendingLoad.then(onReady);
      }
      return;
    }

    favoriteState.pendingLoad = readFavoritesFromStorage()
      .then((favoriteIds) => {
        favoriteState.ids = favoriteIds;
        favoriteState.hasLoaded = true;
      })
      .catch(() => {
        favoriteState.ids = new Set();
        favoriteState.hasLoaded = true;
      })
      .finally(() => {
        favoriteState.pendingLoad = null;
      });

    if (typeof onReady === "function") {
      favoriteState.pendingLoad.then(onReady);
    }
  }

  function writeFavoriteIds(favoriteIds: Iterable<string>) {
    favoriteState.ids = new Set(favoriteIds);
    favoriteState.hasLoaded = true;
    notifyFavoriteSubscribers();

    const storage = getScopedFavoriteStorage();
    if (!storage) {
      return;
    }

    try {
      storage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(favoriteIds)));
    } catch (_error) {
      // Ignore storage write failures; in-memory state still updates for the current page.
    }
  }

  function readFavoritesFromStorage(): Promise<Set<string>> {
    return new Promise((resolve) => {
      const storage = getScopedFavoriteStorage();
      if (storage) {
        try {
          const storedValue = JSON.parse(storage.getItem(FAVORITES_STORAGE_KEY) || "[]") as unknown;
          resolve(
            new Set(
              Array.isArray(storedValue)
                ? storedValue.map(normalizeFavoriteStorageValue).filter(Boolean)
                : [],
            ),
          );
          return;
        } catch (_error) {
          // Fall through to migration fallback.
        }
      }

      readLegacyFavoritesFromExtensionStorage().then((favoriteIds) => {
        if (favoriteIds.size > 0) {
          writeFavoriteIds(favoriteIds);
        }
        resolve(favoriteIds);
      });
    });
  }

  function ensureFavoriteStorageSync() {
    const scopeWindow = getFavoriteScopeWindow();
    if (favoriteStorageSyncBound || !scopeWindow) {
      return;
    }

    const onStorage = (event: StorageEvent) => {
      const sharedDom = namespace.sharedDom;
      if (sharedDom && !sharedDom.ensureContextValid()) {
        scopeWindow.removeEventListener("storage", onStorage);
        return;
      }

      if (!event || event.key !== FAVORITES_STORAGE_KEY) {
        return;
      }

      let nextValue: any[] = [];
      try {
        nextValue = JSON.parse(event.newValue || "[]") as any[];
      } catch (_error) {
        nextValue = [];
      }

      favoriteState.ids = new Set(
        Array.isArray(nextValue)
          ? nextValue.map(normalizeFavoriteStorageValue).filter(Boolean)
          : [],
      );
      favoriteState.hasLoaded = true;
      notifyFavoriteSubscribers();
    };

    scopeWindow.addEventListener("storage", onStorage);
    namespace.sharedDom?.addCleanupTask(() => {
      scopeWindow.removeEventListener("storage", onStorage);
    });

    favoriteStorageSyncBound = true;
  }

  function notifyFavoriteSubscribers() {
    favoriteSubscribers.forEach((callback) => {
      try {
        callback();
      } catch (_error) {
        // Ignore stale subscribers from replaced frame documents.
      }
    });
  }

  function getScopedFavoriteStorage() {
    const scopeWindow = getFavoriteScopeWindow();
    if (!scopeWindow) {
      return null;
    }

    try {
      return scopeWindow.localStorage || null;
    } catch (_error) {
      return null;
    }
  }

  function getScopedSessionStorage() {
    const scopeWindow = getFavoriteScopeWindow();
    if (!scopeWindow) {
      return null;
    }

    try {
      return scopeWindow.sessionStorage || null;
    } catch (_error) {
      return null;
    }
  }

  function getFavoriteScopeWindow() {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      return window.top || window;
    } catch (_error) {
      return window;
    }
  }

  function readLegacyFavoritesFromExtensionStorage(): Promise<Set<string>> {
    return new Promise((resolve) => {
      const runtime = namespace.sharedDom?.getRuntimeSafely?.() || null;
      const storageApi = namespace.sharedDom?.getLocalStorageAreaSafely?.() || null;

      if (!storageApi) {
        resolve(new Set());
        return;
      }

      (storageApi as { get: (keys: string[], cb: (res: Record<string, any>) => void) => void }).get(
        ["ccxp-lite-sidebar-favorites"],
        (result: Record<string, any>) => {
          if (runtime && runtime.lastError) {
            resolve(new Set());
            return;
          }

          const storedValue = (result ? result["ccxp-lite-sidebar-favorites"] : []) as unknown[];
          resolve(
            new Set(
              Array.isArray(storedValue)
                ? storedValue.map(normalizeFavoriteStorageValue).filter(Boolean)
                : [],
            ),
          );
        },
      );
    });
  }

  function collectFavoriteLinks(
    item: CcxpLiteSidebarTreeNode | null,
    favoriteIds: Set<string>,
    favoriteLinks: CcxpLiteSidebarLinkItem[],
  ) {
    if (!item) {
      return;
    }

    if (item.kind === "link") {
      if (item.linkItem && isFavoriteLink(item.linkItem, favoriteIds)) {
        favoriteLinks.push(item.linkItem);
      }
      return;
    }

    (item.directLinks || []).forEach((linkItem) => {
      if (isFavoriteLink(linkItem, favoriteIds)) {
        favoriteLinks.push(linkItem);
      }
    });

    (item.sections || []).forEach((section) => {
      collectFavoriteLinks(section, favoriteIds, favoriteLinks);
    });
  }

  function dedupeLinkItems(linkItems: CcxpLiteSidebarLinkItem[]) {
    const seen = new Set();

    return linkItems.filter((linkItem) => {
      if (!linkItem || seen.has(linkItem.id)) {
        return false;
      }

      seen.add(linkItem.id);
      return true;
    });
  }

  function createLinkId(linkItem: Partial<CcxpLiteSidebarLinkItem>) {
    const pathSignature = Array.isArray(linkItem.pathSegments)
      ? linkItem.pathSegments.map(normalizeFavoriteText).filter(Boolean).join(">")
      : "";
    const clickSignature = linkItem.clickLinkArgs
      ? `${String(linkItem.clickLinkArgs.name || "").trim()}::${normalizeFavoriteUrl(linkItem.clickLinkArgs.url)}`
      : "";

    return [
      "v2",
      pathSignature,
      normalizeFavoriteText(linkItem.label),
      normalizeFavoriteText(linkItem.target),
      clickSignature,
    ].join("||");
  }

  function createLegacyLinkId(linkItem: Partial<CcxpLiteSidebarLinkItem>) {
    const clickSignature = linkItem.clickLinkArgs
      ? `${String(linkItem.clickLinkArgs.name || "").trim()}::${normalizeFavoriteUrl(linkItem.clickLinkArgs.url)}`
      : "";

    return [
      normalizeFavoriteText(linkItem.label),
      normalizeFavoriteUrl(linkItem.href),
      normalizeFavoriteText(linkItem.target),
      clickSignature,
    ].join("||");
  }

  function normalizeFavoriteStorageValue(value: unknown) {
    if (typeof value !== "string") {
      return "";
    }

    const parts = value.split("||");
    if (parts.length === 4) {
      return createLegacyLinkId({
        label: parts[0],
        href: parts[1],
        target: parts[2],
        clickLinkArgs: parseFavoriteClickSignature(parts[3]),
      });
    }

    if (parts.length !== 5 || parts[0] !== "v2") {
      return normalizeFavoriteText(value);
    }

    return createLinkId({
      pathSegments: parseFavoritePathSignature(parts[1]),
      label: parts[2],
      target: parts[3],
      clickLinkArgs: parseFavoriteClickSignature(parts[4]),
    });
  }

  function parseFavoritePathSignature(signature: unknown) {
    return String(signature || "")
      .split(">")
      .map(normalizeFavoriteText)
      .filter(Boolean);
  }

  function parseFavoriteClickSignature(signature: unknown): CcxpLiteClickLinkArgs | null {
    const normalizedSignature = String(signature || "").trim();
    if (!normalizedSignature) {
      return null;
    }

    const separatorIndex = normalizedSignature.indexOf("::");
    if (separatorIndex === -1) {
      return {
        name: normalizedSignature,
        url: "",
      };
    }

    return {
      name: normalizedSignature.slice(0, separatorIndex),
      url: normalizedSignature.slice(separatorIndex + 2),
    };
  }

  function normalizeFavoriteText(value: unknown) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function buildFavoritePathSegments(
    parentPathSegments: string[] | undefined,
    label: unknown,
    fallbackSegment?: string,
  ) {
    const normalizedParentSegments = Array.isArray(parentPathSegments)
      ? parentPathSegments.map(normalizeFavoriteText).filter(Boolean)
      : [];
    const normalizedLabel = normalizeFavoriteText(label);

    if (normalizedLabel) {
      return [...normalizedParentSegments, normalizedLabel];
    }

    if (fallbackSegment) {
      return [...normalizedParentSegments, fallbackSegment];
    }

    return normalizedParentSegments;
  }

  function isFavoriteLink(linkItem: CcxpLiteSidebarLinkItem | null, favoriteIds: Set<string>) {
    return getMatchingFavoriteIds(linkItem, favoriteIds).length > 0;
  }

  function getMatchingFavoriteIds(
    linkItem: CcxpLiteSidebarLinkItem | null,
    favoriteIds: Set<string>,
  ) {
    if (!linkItem || !favoriteIds) {
      return [];
    }

    return [linkItem.id, linkItem.legacyId]
      .filter(Boolean)
      .filter((favoriteId, index, values) => values.indexOf(favoriteId) === index)
      .filter((favoriteId) => favoriteIds.has(favoriteId));
  }

  function normalizeFavoriteUrl(rawValue) {
    const value = String(rawValue || "").trim();
    if (!value) {
      return "";
    }

    try {
      const url = new URL(value, "https://www.ccxp.nthu.edu.tw/");
      const volatileParams = ["acixstore", "sid", "session", "phpsessid", "token", "_", "t"];
      volatileParams.forEach((key) => {
        url.searchParams.delete(key);
      });

      const sortedEntries = Array.from(url.searchParams.entries()).sort(
        ([leftKey, leftValue], [rightKey, rightValue]) => {
          if (leftKey === rightKey) {
            return leftValue.localeCompare(rightValue);
          }
          return leftKey.localeCompare(rightKey);
        },
      );

      url.search = "";
      sortedEntries.forEach(([key, entryValue]) => {
        url.searchParams.append(key, entryValue);
      });

      const normalizedPath = url.pathname.replace(/\/+/g, "/");
      const normalizedQuery = url.searchParams.toString();
      const normalizedHash = url.hash || "";

      return `${normalizedPath}${normalizedQuery ? `?${normalizedQuery}` : ""}${normalizedHash}`;
    } catch (_error) {
      return value
        .replace(/([?&])(ACIXSTORE|sid|session|PHPSESSID|token|_|t)=[^&#]*/gi, "$1")
        .replace(/[?&]+$/, "")
        .replace(/[?&]{2,}/g, "&")
        .replace("?&", "?");
    }
  }

  namespace.sidebarFavorites = {
    FAVORITES_STORAGE_SCOPE_PATH,
    FAVORITES_STORAGE_KEY,
    INITIAL_MAIN_URL_STORAGE_KEY,
    favoriteState,
    favoriteSubscribers,
    getFavoriteIds,
    ensureFavoriteIdsLoaded,
    writeFavoriteIds,
    ensureFavoriteStorageSync,
    collectFavoriteLinks,
    dedupeLinkItems,
    createLinkId,
    createLegacyLinkId,
    buildFavoritePathSegments,
    isFavoriteLink,
    getMatchingFavoriteIds,
    getScopedSessionStorage,
  };
})(window);
