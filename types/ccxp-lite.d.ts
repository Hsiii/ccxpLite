export type CcxpLiteModuleMarker = never;

declare global {
  let CCXP_LITE: CcxpLiteNamespace;
  let module:
    | {
        exports?: unknown;
      }
    | undefined;

  type CcxpLiteLocale = "en" | "zh";

  interface CcxpLiteTensorSource {
    shape?: number[];
    data?: ArrayLike<number>;
  }

  interface CcxpLitePreparedTensor {
    shape: number[];
    data: Float32Array;
  }

  interface CcxpLitePreparedModel {
    digits: number;
    eps: number;
    cropRight: number;
    tensors: Record<string, CcxpLitePreparedTensor>;
  }

  interface CcxpLiteDecaptchaModel {
    digits?: number;
    eps?: number;
    cropRight?: number;
    tensors?: Record<string, CcxpLiteTensorSource>;
    preparedTensors?: Record<string, CcxpLitePreparedTensor>;
    predictDigits: (imageBytes: ArrayBuffer) => string;
  }

  interface CcxpLiteClickLinkArgs {
    name: string;
    url: string;
  }

  interface CcxpLiteSidebarLinkItem {
    id: string;
    legacyId?: string;
    label: string;
    pathSegments?: string[];
    href?: string;
    target?: string;
    clickLinkArgs?: CcxpLiteClickLinkArgs | null;
  }

  interface CcxpLiteSidebarGroup {
    id: string;
    label: string;
    directLinks: CcxpLiteSidebarLinkItem[];
    sections: CcxpLiteSidebarGroup[];
    kind: "group" | "category";
    emptyMessage?: string;
    icon?: string;
    summary?: string;
  }

  interface CcxpLiteSidebarLinkNode {
    id: string;
    label: string;
    linkItem: CcxpLiteSidebarLinkItem;
    kind: "link";
  }

  interface CcxpLiteSidebarSectionNode extends CcxpLiteSidebarGroup {
    kind: "group";
  }

  interface CcxpLiteSidebarCategoryNode extends CcxpLiteSidebarGroup {
    kind: "category";
  }

  type CcxpLiteSidebarTreeNode =
    | CcxpLiteSidebarLinkNode
    | CcxpLiteSidebarSectionNode
    | CcxpLiteSidebarCategoryNode;

  interface CcxpLiteSidebarModel {
    favorites: CcxpLiteSidebarCategoryNode;
    categories: CcxpLiteSidebarCategoryNode[];
  }

  interface CcxpLiteLegacySidebarDocNode {
    desc?: string;
    link?: string;
  }

  interface CcxpLiteLegacySidebarFolderNode extends CcxpLiteLegacySidebarDocNode {
    children: Array<CcxpLiteLegacySidebarFolderNode | CcxpLiteLegacySidebarDocNode>;
  }

  interface CcxpLiteCaptchaField {
    input: HTMLInputElement;
    image: HTMLImageElement;
    mediaRow: HTMLElement;
    scope: ParentNode;
  }

  interface CcxpLiteCaptchaAutofillState extends CcxpLiteCaptchaField {
    lastRequestedSrc: string;
    requestToken: number;
    pendingRequest: Promise<string> | null;
    pendingSrc: string;
    failedSrc: string;
    cachedAnswer: string;
    cachedSrc: string;
    timeoutFlashTimer?: number | null;
  }

  interface CcxpLitePe14dSnapshot {
    actionName: string;
    createdAt: number;
    pathname: string;
    scrollX: number;
    scrollY: number;
    activeName: string;
    activeId: string;
    bodyScrollTop: number;
    formId: string;
  }

  interface CcxpLiteWrappedSubmit {
    (form: HTMLFormElement, actionName?: string, actionValue?: string): unknown;
    __ccxpLiteWrapped?: boolean;
    __ccxpLiteOriginal?: CcxpLiteWrappedSubmit;
  }

  interface CcxpLiteLandingLocale {
    isSupportedInquirePath: (targetDocument: Document) => boolean;
    isLandingPage: (targetDocument: Document) => boolean;
    resolveLandingLocale: (
      targetDocument: Document,
      languageLinks: ParentNode | null,
      loginSourceCell: ParentNode | null,
      loginForm: HTMLFormElement | null,
    ) => CcxpLiteLocale;
    getLoginForm: (targetDocument: Document) => HTMLFormElement | null;
  }

  interface CcxpLiteSidebarCategoryDefinition {
    id: string;
    labelKey: string;
    fallbackLabel?: string;
    icon: string;
    summaryLabels?: string[];
    itemLabels: string[];
  }

  interface CcxpLiteSharedConstants {
    TOKENS: Record<string, string>;
    ASSETS: Record<string, string>;
    LOCALIZED_STRINGS: Record<string, Record<string, string>>;
    SIDEBAR_CATEGORIES: CcxpLiteSidebarCategoryDefinition[];
    [key: string]: unknown;
  }

  interface CcxpLiteSharedLocale {
    getLocalizedStrings: (locale: string) => Record<string, string>;
    normalizeLocale: (locale: string) => string;
    resolveLocaleFromDocument: (targetDocument: Document) => string;
  }

  interface CcxpLiteSharedBrand {
    createBrandImage: (targetDocument: Document, assetPath: string) => HTMLImageElement;
    createBrandCopy: (targetDocument: Document, text: string) => HTMLElement;
    createBrandPartnerIcon: (targetDocument: Document, assetPath: string) => HTMLImageElement;
    createBrandPartnerLink: (
      targetDocument: Document,
      href: string,
      content: Node,
    ) => HTMLAnchorElement;
  }

  interface CcxpLiteRuntime {
    getURL: (path: string) => string;
    id: string;
    lastError?: { message?: string };
  }

  interface CcxpLiteSharedDom {
    moveChildNodes: (sourceNode: Node, targetNode: Node) => void;
    removeNode: (node: Node | null) => void;
    isDocumentComplete: (targetDocument: Document) => boolean;
    cleanLegacyAttributes: (node: Node | null) => void;
    isContextValid: () => boolean;
    ensureContextValid: () => boolean;
    invalidateContext: () => boolean;
    getRuntimeSafely: () => CcxpLiteRuntime | null;
    getLocalStorageAreaSafely: () => unknown;
    addCleanupTask: (task: () => void) => void;
  }

  interface CcxpLiteSharedTheme {
    ensureThemeDocument: (targetDocument: Document, scope: string) => boolean;
  }

  interface CcxpLiteShared {
    TOKENS: Record<string, string>;
    STRINGS: Record<string, string>;
    LOCALIZED_STRINGS: Record<string, Record<string, string>>;
    SIDEBAR_CATEGORIES: Array<{
      id: string;
      labelKey: string;
      fallbackLabel?: string;
      icon: string;
      summaryLabels?: string[];
      itemLabels: string[];
    }>;
    ASSETS: Record<string, string>;
    ensureThemeDocument: (targetDocument: Document, scope: string) => boolean;
    getLocalizedStrings: (locale: string) => Record<string, string>;
    normalizeLocale: (locale: string) => string;
    resolveLocaleFromDocument: (targetDocument: Document) => string;
    createBrandImage: (
      targetDocument: Document,
      className: string,
      assetPath?: string,
    ) => HTMLImageElement;
    createBrandCopy: (
      targetDocument: Document,
      containerClassName: string,
      titleClassName: string,
      title: string,
    ) => HTMLDivElement;
    createBrandPartnerIcon: (targetDocument: Document) => SVGElement;
    createBrandPartnerLink: (
      targetDocument: Document,
      options?: Record<string, unknown>,
    ) => { mark: HTMLElement; link: HTMLElement };
    moveChildNodes: (sourceNode: Node, targetNode: Node) => void;
    removeNode: (node: Node | null) => void;
    isDocumentComplete: (targetDocument: Document) => boolean;
    cleanLegacyAttributes: (node: Node | null) => void;
    isContextValid: () => boolean;
    ensureContextValid: () => boolean;
    invalidateContext: () => void;
    getRuntimeSafely: () => CcxpLiteRuntime | null;
    getLocalStorageAreaSafely: () => Record<string, unknown> | null;
    addCleanupTask: (task: () => void) => void;
  }

  interface CcxpLiteSidebar {
    simplifySidebar: (targetDocument: Document, retry: () => void) => void;
    preloadLandingCaptcha: (targetDocument: Document) => void;
  }

  interface CcxpLiteLandingValidationState {
    startedAt: number;
    fnstrDate?: string;
    fnstrSeed?: string;
  }

  interface CcxpLiteLandingValidation {
    captureLoginValidationState: (targetDocument: Document) => CcxpLiteLandingValidationState;
    restoreLoginValidationGuards: (
      targetDocument: Document,
      state: CcxpLiteLandingValidationState,
    ) => void;
    ensureLoginSubmissionPayload: (form: HTMLFormElement | null, targetDocument: Document) => void;
    extractPwdstrFromImage: (
      imageNode: Pick<HTMLImageElement, "getAttribute"> | null,
      targetDocument: Pick<Document, "location">,
    ) => string;
  }

  interface CcxpLiteLandingCaptcha {
    enableLoginCaptchaAutofill: (
      targetDocument: Document,
      rootNode: ParentNode,
      existingState?: CcxpLiteCaptchaAutofillState | null,
    ) => void;
    getOrCreateCaptchaAutofillState: (
      targetDocument: Document,
      rootNode: ParentNode,
    ) => CcxpLiteCaptchaAutofillState | null;
    primeCaptchaAutofill: (
      targetDocument: Document,
      state: CcxpLiteCaptchaAutofillState | null,
    ) => void;
  }

  interface CcxpLiteLandingTabs {
    createLandingSection: (targetDocument: Document, className: string) => HTMLElement;
    wireLandingTabs: (
      targetDocument: Document,
      tabNavigation: Element | null,
      tabContents: Element[],
      strings: Record<string, string>,
    ) => void;
  }

  interface CcxpLiteLandingSupport {
    findLoginSourceCell: (
      targetDocument: Document,
      loginForm: Element | null,
    ) => HTMLElement | null;
    findAnnouncementTable: (targetDocument: Document) => HTMLTableElement | null;
    findUtilityLinksTable: (targetDocument: Document) => HTMLTableElement | null;
    findCannotLoginLink: (
      targetDocument: Document,
      utilityLinksTable: Element | null,
    ) => HTMLAnchorElement | null;
    findServiceLink: (targetDocument: Document) => HTMLElement | null;
    buildHeaderUtilityLinks: (
      targetDocument: Document,
      utilityLinksTable: Element | null,
      excludedAnchor: HTMLAnchorElement | null,
      strings?: Record<string, string>,
    ) => HTMLElement | null;
    buildLandingSupportLinks: (
      targetDocument: Document,
      serviceLinkNode: Element | null,
      cannotLoginAnchor: HTMLAnchorElement | null,
      strings?: Record<string, string>,
    ) => HTMLElement | null;
    collapseLegacyServiceRow: (serviceLinkNode: Element | null) => void;
    collapseLegacyCannotLoginLink: (cannotLoginAnchor: Element | null) => void;
    collapseLegacyUtilityRow: (utilityLinksTable: Element | null) => void;
    collapseLegacyThreeColumnRows: (rootNode: ParentNode | null) => void;
    findCalendarTable: (targetNode: ParentNode) => HTMLTableElement | null;
    prepareAnnouncementTable: (
      table: HTMLTableElement | null,
      strings?: Record<string, string>,
    ) => void;
  }

  interface CcxpLiteLandingLogin {
    normalizeLoginFormLayout: (rootNode: ParentNode) => void;
    removeLoginResetControls: (rootNode: ParentNode) => void;
    forceCaptchaLabelDisplay: (rootNode: ParentNode) => void;
    replaceLoginFormImageButtons: (targetDocument: Document, rootNode: ParentNode) => void;
    wrapPrimaryLoginButtons: (targetDocument: Document, rootNode: ParentNode) => void;
    removeLoginSpacingArtifacts: (targetDocument: Document, rootNode: ParentNode) => void;
    alignCaptchaMediaRow: (targetDocument: Document, rootNode: ParentNode) => void;
    enhancePasswordVisibilityToggle: (targetDocument: Document, rootNode: ParentNode) => void;
    preloadLandingCaptcha: (targetDocument: Document) => void;
  }

  interface CcxpLiteLanding {
    isSupportedInquirePath: (targetDocument: Document) => boolean;
    isLandingPage: (targetDocument: Document) => boolean;
    preloadLandingCaptcha: (targetDocument: Document) => void;
    simplifyLandingPage: (
      targetDocument: Document,
      options?: {
        retry?: () => void;
        onReady?: () => void;
      },
    ) => void;
  }

  interface CcxpLiteSidebarStateModule {
    getSidebarUiState: (navDocument: Document) => CcxpLiteSidebarState;
    persistSidebarScroll: (targetDocument: Document, viewKey: string) => void;
    restoreSidebarScroll: (contentNode: Element, scrollTop: number) => void;
    getPersistedSidebarVariant: () => "classic" | "layered";
    setPersistedSidebarVariant: (variant: "classic" | "layered") => "classic" | "layered";
  }

  interface CcxpLiteSidebarState {
    hasLoaded: boolean;
    currentCategoryId: string;
    searchQuery: string;
    activeLeaf: CcxpLiteSidebarLinkItem | null;
    sidebarVariant: "classic" | "layered";
    classicExpandedItemIds: string[];
    scrollTopByView: Record<string, number>;
  }

  interface CcxpLiteSidebarFavorites {
    FAVORITES_STORAGE_SCOPE_PATH: string;
    FAVORITES_STORAGE_KEY: string;
    INITIAL_MAIN_URL_STORAGE_KEY: string;
    favoriteSubscribers: Set<() => void>;
    getFavoriteIds: () => Set<string>;
    ensureFavoriteIdsLoaded: (onReady?: () => void) => void;
    writeFavoriteIds: (favoriteIds: Iterable<string>) => void;
    ensureFavoriteStorageSync: () => void;
    collectFavoriteLinks: (
      item: CcxpLiteSidebarTreeNode | null,
      favoriteIds: Set<string>,
      favoriteLinks: CcxpLiteSidebarLinkItem[],
    ) => void;
    dedupeLinkItems: (linkItems: CcxpLiteSidebarLinkItem[]) => readonly CcxpLiteSidebarLinkItem[];
    createLinkId: (linkItem: Partial<CcxpLiteSidebarLinkItem>) => string;
    createLegacyLinkId: (linkItem: Partial<CcxpLiteSidebarLinkItem>) => string;
    buildFavoritePathSegments: (
      parentPathSegments: string[] | undefined,
      label: unknown,
      fallbackSegment?: string,
    ) => readonly string[];
    isFavoriteLink: (linkItem: CcxpLiteSidebarLinkItem | null, favoriteIds: Set<string>) => boolean;
    getMatchingFavoriteIds: (
      linkItem: CcxpLiteSidebarLinkItem | null,
      favoriteIds: Set<string>,
    ) => readonly string[];
    getScopedSessionStorage: () => Storage | null;
  }

  interface CcxpLiteSidebarData {
    buildSidebarModel: (
      root: CcxpLiteLegacySidebarFolderNode,
      navDocument: Document,
      strings: Record<string, string>,
    ) => CcxpLiteSidebarModel;
    parseSidebarTree: (navDocument: Document) => CcxpLiteLegacySidebarFolderNode | null;
    filterFavoriteLinks: (
      links: CcxpLiteSidebarLinkItem[],
      query: string,
    ) => readonly CcxpLiteSidebarLinkItem[];
    filterCategories: (
      categories: CcxpLiteSidebarCategoryNode[],
      query: string,
    ) => readonly CcxpLiteSidebarCategoryNode[];
    filterCategoryTree: (
      category: CcxpLiteSidebarCategoryNode | null,
      query: string,
    ) => CcxpLiteSidebarCategoryNode | null;
    countLinksInTree: (item: CcxpLiteSidebarTreeNode | null) => number;
  }

  interface CcxpLiteSidebarUi {
    renderSidebar: (
      hostDocument: Document,
      navDocument: Document,
      modelInput: CcxpLiteSidebarModel | (() => CcxpLiteSidebarModel),
      strings?: Record<string, string>,
    ) => void;
    createSidebarSearch: (hostDocument: Document, strings: Record<string, string>) => HTMLElement;
    syncTopLevelFramesetLayout: (variant: "classic" | "layered") => void;
    mountSidebarVariantSwitch: (
      targetDocument: Document,
      state: CcxpLiteSidebarState,
      strings: Record<string, string>,
      onSwitch: () => void,
      footer?: HTMLElement | null,
    ) => void;
  }

  interface CcxpLiteSidebarRuntime {
    DESTINATION_LOAD_TIMEOUT_MS: number;
    shouldOpenLeafInDestination: (
      linkItem: CcxpLiteSidebarLinkItem,
      navDocument: Document,
    ) => boolean;
    openLeafDestination: (
      targetDocument: Document,
      navDocument: Document,
      linkItem: CcxpLiteSidebarLinkItem,
      rerender: () => void,
    ) => void;
    simplifyEmbeddedFrame: (frame: HTMLIFrameElement) => void;
    getLegacyMainFrame: () => HTMLIFrameElement | null;
    captureInitialMainFrameUrl: () => void;
    openLeafInNewTab: (activeLeaf: CcxpLiteSidebarLinkItem, navDocument: Document) => void;
    activateLegacyLink: (
      linkItem: CcxpLiteSidebarLinkItem,
      navDocument: Document,
      destinationFrame?: HTMLIFrameElement | null,
    ) => void;
    isExternalLinkTarget: (
      linkItem: CcxpLiteSidebarLinkItem | string,
      navDocument: Document,
    ) => boolean;
  }

  interface CcxpLiteSidebarFavorites {
    favoriteState: {
      ids: Set<string>;
      hasLoaded: boolean;
      pendingLoad: Promise<void> | null;
    };
    getFavoriteIds: () => ReadonlySet<string>;
    getMatchingFavoriteIds: (category: CcxpLiteSidebarCategoryDefinition) => ReadonlySet<string>;
    writeFavoriteIds: (ids: Iterable<string>) => void;
    isFavoriteLink: (linkItem: CcxpLiteSidebarLinkItem) => boolean;
  }

  interface CcxpLiteNamespace {
    shared?: CcxpLiteShared;
    sharedConstants?: CcxpLiteSharedConstants;
    sharedLocale?: CcxpLiteSharedLocale;
    sharedDom?: CcxpLiteSharedDom;
    sharedTheme?: CcxpLiteSharedTheme;
    sharedBrand?: CcxpLiteSharedBrand;
    landing: CcxpLiteLanding;
    landingLocale?: CcxpLiteLandingLocale;
    landingSupport?: CcxpLiteLandingSupport;
    landingCaptcha?: CcxpLiteLandingCaptcha;
    landingTabs?: CcxpLiteLandingTabs;
    landingValidation?: CcxpLiteLandingValidation;
    landingLogin?: CcxpLiteLandingLogin;
    sidebar: CcxpLiteSidebar;
    sidebarState?: CcxpLiteSidebarStateModule;
    sidebarFavorites?: CcxpLiteSidebarFavorites;
    sidebarData?: CcxpLiteSidebarData;
    sidebarUi?: CcxpLiteSidebarUi;
    sidebarRuntime?: CcxpLiteSidebarRuntime;
    menuData?: Record<string, unknown>;
    menuFavorites?: Record<string, unknown>;
    menuRuntime?: Record<string, unknown>;
    menuState?: Record<string, unknown>;
    menuUi?: Record<string, unknown>;
    decaptcha?: CcxpLiteDecaptchaModel;
    decaptchaModel?: CcxpLiteDecaptchaModel;
    isOrphan?: boolean;
    cleanupTasks?: Array<() => void>;
  }

  interface Window {
    CCXP_LITE?: CcxpLiteNamespace;
    main?: Window;
    toSubmit?: CcxpLiteWrappedSubmit;
  }

  interface Error {
    code?: string;
  }
}
