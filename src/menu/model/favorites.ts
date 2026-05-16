(function registerCcxpLiteSidebarFavorites(globalScope: typeof globalThis) {
  const runtimeScope = globalScope;
  const namespace = runtimeScope.CCXP_LITE ?? {};
  const FAVORITES_STORAGE_SCOPE_PATH = "/ccxp/INQUIRE/select_entry.php";
  const FAVORITES_STORAGE_KEY = `ccxp-lite-sidebar-favorites::${FAVORITES_STORAGE_SCOPE_PATH}`;
  const INITIAL_MAIN_URL_STORAGE_KEY = `ccxp-lite-sidebar-initial-main-url::${FAVORITES_STORAGE_SCOPE_PATH}`;
  const favoriteState: {
    ids: Set<string>;
    hasLoaded: boolean;
    pendingLoad: Promise<void> | undefined;
  } = {
    ids: new Set<string>(),
    hasLoaded: false,
    pendingLoad: undefined,
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
    if (favoriteState.pendingLoad !== undefined) {
      if (typeof onReady === "function") {
        favoriteState.pendingLoad.then(onReady, () => undefined);
      }
      return;
    }
    favoriteState.pendingLoad = readFavoritesFromStorage()
      .then((favoriteIds) => {
        favoriteState.ids = new Set(favoriteIds);
        favoriteState.hasLoaded = true;
      })
      .catch(() => {
        favoriteState.ids = new Set();
        favoriteState.hasLoaded = true;
      })
      .finally(() => {
        favoriteState.pendingLoad = undefined;
      });
    if (typeof onReady === "function") {
      favoriteState.pendingLoad.then(onReady, () => undefined);
    }
  }

  function writeFavoriteIds(favoriteIds: ReadonlySet<string>) {
    favoriteState.ids = new Set(favoriteIds);
    favoriteState.hasLoaded = true;
    notifyFavoriteSubscribers();

    const storageApi = namespace.sharedDom?.getLocalStorageAreaSafely();
    if (storageApi) {
      (
        storageApi as unknown as {
          set: (items: Readonly<Record<string, unknown>>, cb: () => void) => void;
        }
      ).set({ [FAVORITES_STORAGE_KEY]: [...favoriteIds] }, () => {
        const runtime = namespace.sharedDom?.getRuntimeSafely();
        if (runtime && runtime.lastError) {
          // Ignore storage write failures.
        }
      });
    }

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
    const extensionFavorites = await readFavoritesFromExtensionStorage();
    if (extensionFavorites.size > 0) {
      return extensionFavorites;
    }

    return await new Promise((resolve) => {
      const storage = getScopedFavoriteStorage();
      if (storage) {
        try {
          const storedValue = JSON.parse(storage.getItem(FAVORITES_STORAGE_KEY) ?? "[]") as unknown;
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
          resolve(new Set<string>());
        },
      );
    });
  }

  async function readFavoritesFromExtensionStorage(): Promise<ReadonlySet<string>> {
    return await new Promise((resolve) => {
      const runtime = namespace.sharedDom?.getRuntimeSafely();
      const storageApi = namespace.sharedDom?.getLocalStorageAreaSafely();
      if (!storageApi) {
        resolve(new Set());
        return;
      }
      (
        storageApi as {
          get: (
            keys: readonly string[],
            cb: (res: Readonly<Record<string, unknown>>) => void,
          ) => void;
        }
      ).get([FAVORITES_STORAGE_KEY], (result: Readonly<Record<string, unknown>>) => {
        if (runtime && runtime.lastError) {
          resolve(new Set<string>());
          return;
        }
        const storedValue = result[FAVORITES_STORAGE_KEY] as unknown[];
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

  function ensureFavoriteStorageSync() {
    const scopeWindow = getFavoriteScopeWindow();
    if (favoriteStorageSyncBound) {
      return;
    }
    const onStorage = (event: StorageEvent) => {
      const { sharedDom } = namespace;
      if (sharedDom && !sharedDom.ensureContextValid()) {
        scopeWindow.removeEventListener("storage", onStorage);
        return;
      }
      if (event.key !== FAVORITES_STORAGE_KEY) {
        return;
      }
      const nextValue = (() => {
        try {
          return JSON.parse(event.newValue ?? "[]") as unknown[];
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
    try {
      return scopeWindow.localStorage;
    } catch {
      return undefined;
    }
  }

  function getScopedSessionStorage() {
    const scopeWindow = getFavoriteScopeWindow();
    try {
      return scopeWindow.sessionStorage;
    } catch {
      return undefined;
    }
  }

  function getFavoriteScopeWindow() {
    try {
      return window.top ?? globalThis;
    } catch {
      return globalThis;
    }
  }

  async function readLegacyFavoritesFromExtensionStorage(): Promise<ReadonlySet<string>> {
    return await new Promise((resolve) => {
      const runtime = namespace.sharedDom?.getRuntimeSafely();
      const storageApi = namespace.sharedDom?.getLocalStorageAreaSafely();
      if (!storageApi) {
        resolve(new Set());
        return;
      }
      (
        storageApi as {
          get: (
            keys: readonly string[],
            cb: (res: Readonly<Record<string, unknown>>) => void,
          ) => void;
        }
      ).get(["ccxp-lite-sidebar-favorites"], (result: Readonly<Record<string, unknown>>) => {
        if (runtime && runtime.lastError) {
          resolve(new Set<string>());
          return;
        }
        const storedValue = result["ccxp-lite-sidebar-favorites"] as unknown[];
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
    item: CcxpLiteSidebarTreeNode | undefined,
    favoriteIds: ReadonlySet<string>,
  ): readonly CcxpLiteSidebarLinkItem[] {
    if (!item) {
      return [];
    }
    if (item.kind === "link") {
      return isFavoriteLink(item.linkItem, favoriteIds) ? [item.linkItem] : [];
    }
    const favoriteLinks: CcxpLiteSidebarLinkItem[] = [];
    const links =
      item.kind === "block"
        ? item.links
        : [...(item.links ?? []), ...item.blocks.flatMap((block) => block.links)];
    for (const linkItem of links) {
      if (isFavoriteLink(linkItem, favoriteIds)) {
        favoriteLinks.push(linkItem);
      }
    }
    return favoriteLinks;
  }

  function dedupeLinkItems(
    linkItems: readonly CcxpLiteSidebarLinkItem[],
  ): readonly CcxpLiteSidebarLinkItem[] {
    const seen = new Set();
    return linkItems.filter((linkItem) => {
      if (seen.has(linkItem.id)) {
        return false;
      }
      seen.add(linkItem.id);
      return true;
    });
  }

  function createLinkId(linkItem: Partial<CcxpLiteSidebarLinkItem>) {
    const clickSignature = createFavoriteClickSignature(linkItem.clickLinkArgs);
    return [
      "v3",
      normalizeFavoriteText(linkItem.label),
      normalizeFavoriteUrl(linkItem.href),
      normalizeFavoriteText(linkItem.target),
      clickSignature,
    ].join("||");
  }

  function createLegacyLinkId(linkItem: Partial<CcxpLiteSidebarLinkItem>) {
    const clickSignature = createFavoriteClickSignature(linkItem.clickLinkArgs);
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
    if (parts.length === 5 && parts[0] === "v3") {
      return createLinkId({
        label: parts[1],
        href: parts[2],
        target: parts[3],
        clickLinkArgs: parseFavoriteClickSignature(parts[4]),
      });
    }
    if (parts.length !== 5 || parts[0] !== "v2") {
      return normalizeFavoriteText(value);
    }
    return createLinkId({
      label: parts[2],
      target: parts[3],
      clickLinkArgs: parseFavoriteClickSignature(parts[4]),
    });
  }

  function parseFavoritePathSignature(signature: unknown): readonly string[] {
    return normalizeFavoriteText(signature).split(">").map(normalizeFavoriteText).filter(Boolean);
  }

  function parseFavoriteClickSignature(signature: unknown): CcxpLiteClickLinkArgs | undefined {
    const normalizedSignature = normalizeFavoriteText(signature);
    if (normalizedSignature === "") {
      return undefined;
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
    parentPathSegments: readonly string[] | undefined,
    label: unknown,
    fallbackSegment?: string,
  ): readonly string[] {
    const normalizedParentSegments = normalizeFavoritePathSegments(parentPathSegments);
    const normalizedLabel = normalizeFavoriteText(label);
    if (normalizedLabel !== "") {
      return [...normalizedParentSegments, normalizedLabel];
    }
    if (fallbackSegment !== undefined && fallbackSegment !== "") {
      return [...normalizedParentSegments, fallbackSegment];
    }
    return normalizedParentSegments;
  }

  function isFavoriteLink(
    linkItem: CcxpLiteSidebarLinkItem | undefined,
    favoriteIds: ReadonlySet<string>,
  ) {
    return getMatchingFavoriteIds(linkItem, favoriteIds).length > 0;
  }

  function getMatchingFavoriteIds(
    linkItem: CcxpLiteSidebarLinkItem | undefined,
    favoriteIds: ReadonlySet<string>,
  ): readonly string[] {
    if (!linkItem) {
      return [];
    }
    return [...favoriteIds].filter((favoriteId) => isFavoriteIdMatch(linkItem, favoriteId));
  }

  function isFavoriteIdMatch(linkItem: CcxpLiteSidebarLinkItem, favoriteId: string) {
    if (favoriteId === linkItem.id || favoriteId === linkItem.legacyId) {
      return true;
    }
    const parsedFavoriteId = parseVersionedFavoriteId(favoriteId);
    if (!parsedFavoriteId) {
      return false;
    }
    if (parsedFavoriteId.version === "v3") {
      return (
        parsedFavoriteId.label === normalizeFavoriteText(linkItem.label) &&
        parsedFavoriteId.href === normalizeFavoriteUrl(linkItem.href) &&
        parsedFavoriteId.target === normalizeFavoriteText(linkItem.target) &&
        parsedFavoriteId.clickSignature === createFavoriteClickSignature(linkItem.clickLinkArgs)
      );
    }
    if (
      parsedFavoriteId.label !== normalizeFavoriteText(linkItem.label) ||
      parsedFavoriteId.target !== normalizeFavoriteText(linkItem.target) ||
      parsedFavoriteId.clickSignature !== createFavoriteClickSignature(linkItem.clickLinkArgs)
    ) {
      return false;
    }
    const currentPathSegments = normalizeFavoritePathSegments(linkItem.pathSegments);
    if (parsedFavoriteId.pathSegments.length === 0 || currentPathSegments.length === 0) {
      return true;
    }
    return areFavoritePathSegmentsCompatible(parsedFavoriteId.pathSegments, currentPathSegments);
  }

  function parseVersionedFavoriteId(favoriteId: string):
    | {
        version: "v2";
        pathSegments: readonly string[];
        label: string;
        target: string;
        clickSignature: string;
      }
    | {
        version: "v3";
        label: string;
        href: string;
        target: string;
        clickSignature: string;
      }
    | undefined {
    const parts = favoriteId.split("||");
    if (parts.length !== 5) {
      return undefined;
    }
    if (parts[0] === "v3") {
      return {
        version: "v3",
        label: normalizeFavoriteText(parts[1]),
        href: normalizeFavoriteUrl(parts[2]),
        target: normalizeFavoriteText(parts[3]),
        clickSignature: normalizeFavoriteText(parts[4]),
      };
    }
    if (parts[0] !== "v2") {
      return undefined;
    }
    return {
      version: "v2",
      pathSegments: parseFavoritePathSignature(parts[1]),
      label: normalizeFavoriteText(parts[2]),
      target: normalizeFavoriteText(parts[3]),
      clickSignature: normalizeFavoriteText(parts[4]),
    };
  }

  function areFavoritePathSegmentsCompatible(
    leftPathSegments: readonly string[],
    rightPathSegments: readonly string[],
  ) {
    if (leftPathSegments.length === rightPathSegments.length) {
      return leftPathSegments.every(
        (pathSegment, index) => pathSegment === rightPathSegments[index],
      );
    }
    return (
      isFavoritePathSubsequence(leftPathSegments, rightPathSegments) ||
      isFavoritePathSubsequence(rightPathSegments, leftPathSegments)
    );
  }

  function isFavoritePathSubsequence(
    candidatePathSegments: readonly string[],
    referencePathSegments: readonly string[],
  ) {
    if (candidatePathSegments.length > referencePathSegments.length) {
      return false;
    }
    let candidateIndex = 0;
    for (const pathSegment of referencePathSegments) {
      if (pathSegment === candidatePathSegments[candidateIndex]) {
        candidateIndex++;
        if (candidateIndex === candidatePathSegments.length) {
          return true;
        }
      }
    }
    return candidateIndex === candidatePathSegments.length;
  }

  function normalizeFavoritePathSegments(
    pathSegments: readonly string[] | undefined,
  ): readonly string[] {
    return isArray(pathSegments) ? pathSegments.map(normalizeFavoriteText).filter(Boolean) : [];
  }

  function createFavoriteClickSignature(clickLinkArgs: CcxpLiteClickLinkArgs | undefined) {
    return clickLinkArgs
      ? `${clickLinkArgs.name.trim()}::${normalizeFavoriteUrl(clickLinkArgs.url)}`
      : "";
  }

  function normalizeFavoriteUrl(rawValue: string | undefined) {
    const value = (rawValue ?? "").trim();
    if (value === "") {
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
      return `${normalizedPath}${normalizedQuery === "" ? "" : `?${normalizedQuery}`}${normalizedHash}`;
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
