(function registerCcxpLiteSidebarFavorites(globalScope: Window & typeof globalThis) {
  const namespace = (globalScope.CCXP_LITE ||= {}) as CcxpLiteNamespace;

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

  function isArray<T>(value: unknown): value is T[] {
    return value !== null && typeof value === "object" && value.constructor === Array;
  }

  function getFavoriteIds(): ReadonlySet<string> {
    return new Set(favoriteState.ids);
  }

  function ensureFavoriteIdsLoaded(onReady?: () => void) {
    if (favoriteState.hasLoaded) {
      if (typeof onReady === "function") {
        onReady();
      }
      return;
    }

    if (favoriteState.pendingLoad !== null) {
      if (typeof onReady === "function") {
        favoriteState.pendingLoad.then(onReady, () => undefined);
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
      favoriteState.pendingLoad.then(onReady, () => undefined);
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
      storage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...favoriteIds]));
    } catch {
      // Ignore storage write failures; in-memory state still updates for the current page.
    }
  }

  async function readFavoritesFromStorage(): Promise<ReadonlySet<string>> {
    return await new Promise((resolve) => {
      const storage = getScopedFavoriteStorage();
      if (storage) {
        try {
          const storedValue = JSON.parse(storage.getItem(FAVORITES_STORAGE_KEY) || "[]") as unknown;
          resolve(
            new Set(
              isArray(storedValue)
                ? storedValue.map(normalizeFavoriteStorageValue).filter(Boolean)
                : [],
            ),
          );
          return;
        } catch {
          // Fall through to migration fallback.
        }
      }

      readLegacyFavoritesFromExtensionStorage().then(
        (favoriteIds) => {
          if (favoriteIds.size > 0) {
            writeFavoriteIds(favoriteIds);
          }
          resolve(favoriteIds);
        },
        () => {
          resolve(new Set());
        },
      );
    });
  }

  function ensureFavoriteStorageSync() {
    const scopeWindow = getFavoriteScopeWindow();
    if (favoriteStorageSyncBound || !scopeWindow) {
      return;
    }

    const onStorage = (event: StorageEvent) => {
      const { sharedDom } = namespace;
      if (sharedDom && !sharedDom.ensureContextValid()) {
        scopeWindow.removeEventListener("storage", onStorage);
        return;
      }

      if (!event || event.key !== FAVORITES_STORAGE_KEY) {
        return;
      }

      const nextValue = (() => {
        try {
          return JSON.parse(event.newValue || "[]") as unknown[];
        } catch {
          return [];
        }
      })();

      favoriteState.ids = new Set(
        isArray(nextValue) ? nextValue.map(normalizeFavoriteStorageValue).filter(Boolean) : [],
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
    for (const callback of favoriteSubscribers) {
      try {
        callback();
      } catch {
        // Ignore stale subscribers from replaced frame documents.
      }
    }
  }

  function getScopedFavoriteStorage() {
    const scopeWindow = getFavoriteScopeWindow();
    if (!scopeWindow) {
      return null;
    }

    try {
      return scopeWindow.localStorage || null;
    } catch {
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
    } catch {
      return null;
    }
  }

  function getFavoriteScopeWindow() {
    if (globalThis.window === undefined) {
      return null;
    }

    try {
      return window.top || globalThis;
    } catch {
      return globalThis;
    }
  }

  async function readLegacyFavoritesFromExtensionStorage(): Promise<ReadonlySet<string>> {
    return await new Promise((resolve) => {
      const runtime = namespace.sharedDom?.getRuntimeSafely() || null;
      const storageApi = namespace.sharedDom?.getLocalStorageAreaSafely() || null;

      if (!storageApi) {
        resolve(new Set());
        return;
      }

      (
        storageApi as { get: (keys: string[], cb: (res: Record<string, unknown>) => void) => void }
      ).get(["ccxp-lite-sidebar-favorites"], (result: Record<string, unknown>) => {
        if (runtime && runtime.lastError) {
          resolve(new Set());
          return;
        }

        const storedValue = (result ? result["ccxp-lite-sidebar-favorites"] : []) as unknown[];
        resolve(
          new Set(
            isArray(storedValue)
              ? storedValue.map(normalizeFavoriteStorageValue).filter(Boolean)
              : [],
          ),
        );
      });
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

    for (const linkItem of item.directLinks || []) {
      if (isFavoriteLink(linkItem, favoriteIds)) {
        favoriteLinks.push(linkItem);
      }
    }

    for (const section of item.sections || []) {
      collectFavoriteLinks(section, favoriteIds, favoriteLinks);
    }
  }

  function dedupeLinkItems(
    linkItems: CcxpLiteSidebarLinkItem[],
  ): readonly CcxpLiteSidebarLinkItem[] {
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
    const pathSignature = isArray(linkItem.pathSegments)
      ? linkItem.pathSegments.map(normalizeFavoriteText).filter(Boolean).join(">")
      : "";
    const clickSignature = linkItem.clickLinkArgs
      ? `${(linkItem.clickLinkArgs.name || "").trim()}::${normalizeFavoriteUrl(linkItem.clickLinkArgs.url)}`
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
      ? `${(linkItem.clickLinkArgs.name || "").trim()}::${normalizeFavoriteUrl(linkItem.clickLinkArgs.url)}`
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

  function parseFavoritePathSignature(signature: unknown): readonly string[] {
    return normalizeFavoriteText(signature).split(">").map(normalizeFavoriteText).filter(Boolean);
  }

  function parseFavoriteClickSignature(signature: unknown): CcxpLiteClickLinkArgs | null {
    const normalizedSignature = normalizeFavoriteText(signature);
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
    const normalizedValue =
      typeof value === "string" || typeof value === "number" || typeof value === "boolean"
        ? String(value)
        : "";

    return normalizedValue.replaceAll(/\s+/g, " ").trim();
  }

  function buildFavoritePathSegments(
    parentPathSegments: string[] | undefined,
    label: unknown,
    fallbackSegment?: string,
  ): readonly string[] {
    const normalizedParentSegments = isArray(parentPathSegments)
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
  ): readonly string[] {
    if (!linkItem || !favoriteIds) {
      return [];
    }

    return [linkItem.id, linkItem.legacyId]
      .filter(Boolean)
      .filter((favoriteId, index, values) => values.indexOf(favoriteId) === index)
      .filter((favoriteId) => favoriteIds.has(favoriteId));
  }

  function normalizeFavoriteUrl(rawValue: string | null | undefined) {
    const value = (rawValue || "").trim();
    if (!value) {
      return "";
    }

    try {
      const url = new URL(value, "https://www.ccxp.nthu.edu.tw/");
      const volatileParams = ["acixstore", "sid", "session", "phpsessid", "token", "_", "t"];
      for (const key of volatileParams) {
        url.searchParams.delete(key);
      }

      const sortedEntries = [...url.searchParams.entries()].toSorted(
        ([leftKey, leftValue], [rightKey, rightValue]) => {
          if (leftKey === rightKey) {
            return leftValue.localeCompare(rightValue);
          }
          return leftKey.localeCompare(rightKey);
        },
      );

      url.search = "";
      for (const [key, entryValue] of sortedEntries) {
        url.searchParams.append(key, entryValue);
      }

      const normalizedPath = url.pathname.replaceAll(/\/+/g, "/");
      const normalizedQuery = url.searchParams.toString();
      const normalizedHash = url.hash;

      return `${normalizedPath}${normalizedQuery ? `?${normalizedQuery}` : ""}${normalizedHash}`;
    } catch {
      return value
        .replaceAll(/([&?])(acixstore|sid|session|phpsessid|token|_|t)=[^#&]*/gi, "$1")
        .replace(/[&?]+$/, "")
        .replaceAll(/[&?]{2,}/g, "&")
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
})(globalThis);
