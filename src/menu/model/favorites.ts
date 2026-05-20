(function registerCcxpLiteSidebarFavorites(globalScope: typeof globalThis) {
  const runtimeScope = globalScope;
  const namespace = runtimeScope.CCXP_LITE ?? {};
  const FAVORITES_STORAGE_SCOPE_PATH = "/ccxp/INQUIRE/select_entry.php";
  const FAVORITES_STORAGE_KEY = `ccxp-lite-sidebar-favorites::${FAVORITES_STORAGE_SCOPE_PATH}`;
  const INITIAL_MAIN_URL_STORAGE_KEY = `ccxp-lite-sidebar-initial-main-url::${FAVORITES_STORAGE_SCOPE_PATH}`;
  const LEGACY_FAVORITES_STORAGE_KEY = "ccxp-lite-sidebar-favorites";
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
  let favoriteStorageSubscriptionBound = false;

  interface FavoriteStorageEnvelope {
    version: 1;
    updatedAt: number;
    ids: string[];
  }

  interface FavoriteStorageMessage {
    type: "ccxp-lite:favorites-get" | "ccxp-lite:favorites-set";
    key: string;
    value?: FavoriteStorageEnvelope;
  }

  function isArray<T>(value: unknown): value is T[] {
    const prototype =
      value !== null && typeof value === "object"
        ? (Reflect.getPrototypeOf(value) as { constructor?: { name?: string } } | undefined)
        : undefined;
    return (
      value !== null &&
      typeof value === "object" &&
      prototype !== undefined &&
      prototype.constructor?.name === "Array"
    );
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
    const envelope = createFavoriteStorageEnvelope(favoriteIds);
    writeFavoriteEnvelopeToScopedStorage(envelope);
    persistFavoriteEnvelope(envelope).catch(() => undefined);
  }

  async function persistFavoriteEnvelope(favoriteEnvelope: Readonly<FavoriteStorageEnvelope>) {
    await sendFavoriteStorageMessage<undefined>({
      type: "ccxp-lite:favorites-set",
      key: FAVORITES_STORAGE_KEY,
      value: favoriteEnvelope,
    });
  }

  function createFavoriteStorageEnvelope(
    favoriteIds: ReadonlySet<string>,
    updatedAt = Date.now(),
  ): FavoriteStorageEnvelope {
    return {
      version: 1,
      updatedAt,
      ids: [...favoriteIds],
    };
  }

  async function readFavoritesFromStorage(): Promise<ReadonlySet<string>> {
    const canonicalEnvelope = await readCanonicalFavoriteEnvelope();
    const scopedEnvelope = readScopedFavoriteEnvelope();
    const preferredEnvelope = pickPreferredFavoriteEnvelope(canonicalEnvelope, scopedEnvelope);
    if (preferredEnvelope) {
      if (
        canonicalEnvelope === undefined ||
        preferredEnvelope.updatedAt > canonicalEnvelope.updatedAt
      ) {
        await persistFavoriteEnvelope(preferredEnvelope);
      }
      if (scopedEnvelope === undefined || preferredEnvelope.updatedAt > scopedEnvelope.updatedAt) {
        writeFavoriteEnvelopeToScopedStorage(preferredEnvelope);
      }
      return new Set(preferredEnvelope.ids.map(normalizeFavoriteStorageValue).filter(Boolean));
    }
    const migratedFavorites = await migrateLegacyFavorites();
    const migratedEnvelope = createFavoriteStorageEnvelope(migratedFavorites, 0);
    writeFavoriteEnvelopeToScopedStorage(migratedEnvelope);
    await persistFavoriteEnvelope(migratedEnvelope);
    return migratedFavorites;
  }

  async function readCanonicalFavoriteEnvelope(): Promise<FavoriteStorageEnvelope | undefined> {
    const storedValue = await sendFavoriteStorageMessage<unknown>({
      type: "ccxp-lite:favorites-get",
      key: FAVORITES_STORAGE_KEY,
    });
    return readFavoriteEnvelopeFromStorageValue(storedValue);
  }

  function readScopedFavoriteEnvelope(): FavoriteStorageEnvelope | undefined {
    const storage = getScopedFavoriteStorage();
    if (!storage) {
      return undefined;
    }
    try {
      return readFavoriteEnvelopeFromStorageValue(
        JSON.parse(storage.getItem(FAVORITES_STORAGE_KEY) ?? "null") as unknown,
      );
    } catch {
      return undefined;
    }
  }

  function writeFavoriteEnvelopeToScopedStorage(
    favoriteEnvelope: Readonly<FavoriteStorageEnvelope>,
  ) {
    const storage = getScopedFavoriteStorage();
    if (!storage) {
      return;
    }
    try {
      storage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteEnvelope));
    } catch {
      // Ignore scoped storage write failures and keep the in-memory state.
    }
  }

  async function migrateLegacyFavorites(): Promise<ReadonlySet<string>> {
    const scopedFavorites = readLegacyScopedFavorites();
    const legacyExtensionFavorites = await readLegacyFavoritesFromExtensionStorage();
    return new Set<string>([...scopedFavorites, ...legacyExtensionFavorites]);
  }

  function readLegacyScopedFavorites(): ReadonlySet<string> {
    const storage = getScopedFavoriteStorage();
    if (!storage) {
      return new Set<string>();
    }
    try {
      return readFavoriteIdsFromStorageValue(
        JSON.parse(storage.getItem(FAVORITES_STORAGE_KEY) ?? "null") as unknown,
      );
    } catch {
      return new Set<string>();
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
      ).get([LEGACY_FAVORITES_STORAGE_KEY], (result: Readonly<Record<string, unknown>>) => {
        if (runtime && runtime.lastError) {
          resolve(new Set<string>());
          return;
        }
        resolve(readFavoriteIdsFromStorageValue(result[LEGACY_FAVORITES_STORAGE_KEY]));
      });
    });
  }

  function readFavoriteEnvelopeFromStorageValue(
    value: unknown,
  ): FavoriteStorageEnvelope | undefined {
    if (isFavoriteStorageEnvelope(value)) {
      return {
        version: 1,
        updatedAt: normalizeFavoriteUpdatedAt(value.updatedAt),
        ids: value.ids.map(normalizeFavoriteStorageValue).filter(Boolean),
      };
    }
    if (isArray(value)) {
      return {
        version: 1,
        updatedAt: 0,
        ids: value.map(normalizeFavoriteStorageValue).filter(Boolean),
      };
    }
    return undefined;
  }

  function readFavoriteIdsFromStorageValue(value: unknown): ReadonlySet<string> {
    const favoriteEnvelope = readFavoriteEnvelopeFromStorageValue(value);
    if (!favoriteEnvelope) {
      return new Set<string>();
    }
    return new Set(favoriteEnvelope.ids);
  }

  function isFavoriteStorageEnvelope(value: unknown): value is FavoriteStorageEnvelope {
    if (value === null || typeof value !== "object") {
      return false;
    }
    const candidate = value as Partial<FavoriteStorageEnvelope>;
    return candidate.version === 1 && isArray(candidate.ids);
  }

  function normalizeFavoriteUpdatedAt(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  }

  function pickPreferredFavoriteEnvelope(
    leftEnvelope: Readonly<FavoriteStorageEnvelope> | undefined,
    rightEnvelope: Readonly<FavoriteStorageEnvelope> | undefined,
  ) {
    if (!leftEnvelope) {
      return rightEnvelope;
    }
    if (!rightEnvelope) {
      return leftEnvelope;
    }
    return rightEnvelope.updatedAt > leftEnvelope.updatedAt ? rightEnvelope : leftEnvelope;
  }

  async function sendFavoriteStorageMessage<T>(message: FavoriteStorageMessage) {
    const runtime = namespace.sharedDom?.getRuntimeSafely();
    if (!runtime?.sendMessage) {
      return undefined;
    }
    return await new Promise<T | undefined>((resolve) => {
      (
        runtime.sendMessage as (
          payload: FavoriteStorageMessage,
          callback: (response: T | undefined) => void,
        ) => void
      )(message, (response) => {
        const nextRuntime = namespace.sharedDom?.getRuntimeSafely();
        if (nextRuntime?.lastError) {
          resolve(undefined);
          return;
        }
        resolve(response);
      });
    });
  }

  function ensureFavoriteStorageSync() {
    if (favoriteStorageSubscriptionBound) {
      return;
    }
    const runtime = namespace.sharedDom?.getRuntimeSafely();
    if (!runtime) {
      return;
    }
    try {
      const onStorageChange = (
        changes: Readonly<Record<string, chrome.storage.StorageChange>>,
        areaName: chrome.storage.AreaName,
      ) => {
        const { sharedDom } = namespace;
        if (sharedDom && !sharedDom.ensureContextValid()) {
          return;
        }
        if (areaName !== "local") {
          return;
        }
        if (!Object.hasOwn(changes, FAVORITES_STORAGE_KEY)) {
          return;
        }
        const favoriteChange = changes[FAVORITES_STORAGE_KEY];
        favoriteState.ids = new Set(readFavoriteIdsFromStorageValue(favoriteChange.newValue));
        favoriteState.hasLoaded = true;
        notifyFavoriteSubscribers();
      };
      chrome.storage.onChanged.addListener(onStorageChange);
      namespace.sharedDom?.addCleanupTask(() => {
        chrome.storage.onChanged.removeListener(onStorageChange);
      });
      favoriteStorageSubscriptionBound = true;
    } catch {
      // Ignore cross-context subscription failures.
    }
  }

  function subscribeToFavoriteChanges(callback: () => void) {
    favoriteSubscribers.add(callback);
    return () => {
      favoriteSubscribers.delete(callback);
    };
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

  function collectFavoriteBlocks(
    item: CcxpLiteSidebarTreeNode | undefined,
    favoriteIds: ReadonlySet<string>,
  ): readonly CcxpLiteSidebarBlock[] {
    if (!item) {
      return [];
    }
    if (item.kind === "block") {
      return isFavoriteBlock(item, favoriteIds) ? [item] : [];
    }
    if (item.kind === "category") {
      return item.blocks.filter((block) => isFavoriteBlock(block, favoriteIds));
    }
    return [];
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

  function createBlockId(blockItem: Partial<CcxpLiteSidebarBlock>) {
    return [
      "v4",
      normalizeFavoritePathSignature(blockItem.pathSegments),
      normalizeFavoriteText(blockItem.label),
      normalizeFavoriteText(blockItem.parentCategoryId),
      "",
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
    if (parts.length === 5 && parts[0] === "v4") {
      return createBlockId({
        pathSegments: parseFavoritePathSignature(parts[1]),
        label: parts[2],
        parentCategoryId: parts[3],
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

  function isFavoriteBlock(
    blockItem: CcxpLiteSidebarBlock | undefined,
    favoriteIds: ReadonlySet<string>,
  ) {
    return getMatchingFavoriteBlockIds(blockItem, favoriteIds).length > 0;
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

  function getMatchingFavoriteBlockIds(
    blockItem: CcxpLiteSidebarBlock | undefined,
    favoriteIds: ReadonlySet<string>,
  ): readonly string[] {
    if (!blockItem) {
      return [];
    }
    return [...favoriteIds].filter((favoriteId) => isFavoriteBlockIdMatch(blockItem, favoriteId));
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
      if (
        parsedFavoriteId.label !== normalizeFavoriteText(linkItem.label) ||
        parsedFavoriteId.target !== normalizeFavoriteText(linkItem.target)
      ) {
        return false;
      }
      const normalizedHref = normalizeFavoriteUrl(linkItem.href);
      const normalizedClickSignature = createFavoriteClickSignature(linkItem.clickLinkArgs);
      if (parsedFavoriteId.href !== "" && parsedFavoriteId.href === normalizedHref) {
        return true;
      }
      if (
        parsedFavoriteId.clickSignature !== "" &&
        parsedFavoriteId.clickSignature === normalizedClickSignature
      ) {
        return true;
      }
      return false;
    }
    if (parsedFavoriteId.version !== "v2") {
      return false;
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

  function isFavoriteBlockIdMatch(blockItem: CcxpLiteSidebarBlock, favoriteId: string) {
    if (favoriteId === blockItem.favoriteId) {
      return true;
    }
    const parsedFavoriteId = parseVersionedFavoriteId(favoriteId);
    if (!parsedFavoriteId || parsedFavoriteId.version !== "v4") {
      return false;
    }
    if (
      parsedFavoriteId.label !== normalizeFavoriteText(blockItem.label) ||
      parsedFavoriteId.parentCategoryId !== normalizeFavoriteText(blockItem.parentCategoryId)
    ) {
      return false;
    }
    const currentPathSegments = normalizeFavoritePathSegments(blockItem.pathSegments);
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
    | {
        version: "v4";
        pathSegments: readonly string[];
        label: string;
        parentCategoryId: string;
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
        clickSignature: normalizeFavoriteClickSignature(parts[4]),
      };
    }
    if (parts[0] === "v4") {
      return {
        version: "v4",
        pathSegments: parseFavoritePathSignature(parts[1]),
        label: normalizeFavoriteText(parts[2]),
        parentCategoryId: normalizeFavoriteText(parts[3]),
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
      ? `${normalizeFavoriteText(clickLinkArgs.name)}::${normalizeFavoriteUrl(clickLinkArgs.url)}`
      : "";
  }

  function normalizeFavoriteClickSignature(signature: unknown) {
    return createFavoriteClickSignature(parseFavoriteClickSignature(signature));
  }

  function normalizeFavoritePathSignature(pathSegments: readonly string[] | undefined) {
    return normalizeFavoritePathSegments(pathSegments).join(">");
  }

  function normalizeFavoriteUrl(rawValue: string | undefined) {
    const value = (rawValue ?? "").trim();
    if (value === "") {
      return "";
    }
    try {
      const url = new URL(value, "https://www.ccxp.nthu.edu.tw/");
      const volatileParams = new Set([
        "_",
        "acixstore",
        "phpsessid",
        "session",
        "sid",
        "t",
        "token",
      ]);
      for (const [key] of url.searchParams.entries()) {
        if (volatileParams.has(key.toLowerCase())) {
          url.searchParams.delete(key);
        }
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
    getFavoriteIds,
    ensureFavoriteIdsLoaded,
    writeFavoriteIds,
    ensureFavoriteStorageSync,
    subscribeToFavoriteChanges,
    collectFavoriteLinks,
    collectFavoriteBlocks,
    dedupeLinkItems,
    createLinkId,
    createBlockId,
    createLegacyLinkId,
    buildFavoritePathSegments,
    isFavoriteLink,
    isFavoriteBlock,
    getMatchingFavoriteIds,
    getMatchingFavoriteBlockIds,
    getScopedSessionStorage,
  };
})(globalThis);
