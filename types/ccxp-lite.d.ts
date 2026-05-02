export type CcxpLiteModuleMarker = never;

declare global {
  // eslint-disable-next-line vars-on-top
  var CCXP_LITE: CcxpLiteNamespace | undefined;
  let module:
    | {
        exports?: unknown;
      }
    | undefined;

  interface Window {
    CCXP_LITE?: CcxpLiteNamespace;
  }

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
    predictDigits: (imageBytes: unknown) => Promise<string> | string;
  }

  interface CcxpLiteClickLinkArgs {
    name: string;
    url: string;
  }

  interface CcxpLiteSidebarLinkItem {
    id: string;
    legacyId?: string;
    label: string;
    pathSegments?: readonly string[];
    href?: string;
    target?: string;
    clickLinkArgs?: CcxpLiteClickLinkArgs | null;
    nonce?: number;
  }

  interface CcxpLiteSidebarGroup {
    id: string;
    label: string;
    directLinks: readonly CcxpLiteSidebarLinkItem[];
    sections: readonly CcxpLiteSidebarGroup[];
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
    categories: readonly CcxpLiteSidebarCategoryNode[];
  }

  interface CcxpLiteLegacySidebarDocNode {
    desc?: string;
    link?: string;
  }

  interface CcxpLiteLegacySidebarFolderNode extends CcxpLiteLegacySidebarDocNode {
    children: Array<CcxpLiteLegacySidebarFolderNode | CcxpLiteLegacySidebarDocNode>;
  }

  type CcxpLiteLegacySidebarNode = CcxpLiteLegacySidebarFolderNode | CcxpLiteLegacySidebarDocNode;

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
    summaryLabels?: readonly string[];
    itemLabels: readonly string[];
  }

  interface CcxpLiteSharedConstants {
    TOKENS: Record<string, string>;
    ASSETS: Record<string, string>;
    LOCALIZED_STRINGS: Record<string, Record<string, string>>;
    SIDEBAR_CATEGORIES: readonly CcxpLiteSidebarCategoryDefinition[];
    [key: string]: unknown;
  }

  interface CcxpLiteSharedLocale {
    getLocalizedStrings: (locale: string) => Readonly<Record<string, string>>;
    normalizeLocale: (locale: string) => string;
    resolveLocaleFromDocument: (targetDocument: Document) => string;
  }

  interface CcxpLiteSharedBrand {
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
      options?: {
        markClassName?: string;
        linkClassName?: string;
        labelClassName?: string;
        label?: string;
      },
    ) => { mark: HTMLSpanElement; link: HTMLButtonElement };
  }

  interface CcxpLiteRuntime {
    getURL: (path: string) => string;
    id: string;
    lastError?: { message?: string };
  }

  interface CcxpLiteSharedDom {
    moveChildNodes: (sourceNode: ParentNode & Node, targetNode: ParentNode & Node) => void;
    removeNode: (node: ChildNode | null) => void;
    isDocumentComplete: (targetDocument: Document) => boolean;
    cleanLegacyAttributes: (node: Node | null) => void;
    isContextValid: () => boolean;
    ensureContextValid: () => boolean;
    invalidateContext: () => boolean;
    getRuntimeSafely: () => CcxpLiteRuntime | null;
    getLocalStorageAreaSafely: () => {
      get: (
        keys: readonly string[],
        callback: (result: Readonly<Record<string, unknown>>) => void,
      ) => void;
    } | null;
    addCleanupTask: (task: () => void) => void;
  }

  interface CcxpLiteSharedTheme {
    ensureThemeDocument: (targetDocument: Document, scope: string) => boolean;
  }

  interface CcxpLiteShared {
    TOKENS: Record<string, string>;
    STRINGS: Record<string, string>;
    LOCALIZED_STRINGS: Record<string, Record<string, string>>;
    SIDEBAR_CATEGORIES: ReadonlyArray<{
      id: string;
      labelKey: string;
      fallbackLabel?: string;
      icon: string;
      summaryLabels?: readonly string[];
      itemLabels: readonly string[];
    }>;
    ASSETS: Record<string, string>;
    ensureThemeDocument: (targetDocument: Document, scope: string) => boolean;
    getLocalizedStrings: (locale: string) => Readonly<Record<string, string>>;
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
      options?: {
        markClassName?: string;
        linkClassName?: string;
        labelClassName?: string;
        label?: string;
      },
    ) => { mark: HTMLSpanElement; link: HTMLButtonElement };
    moveChildNodes: (sourceNode: ParentNode & Node, targetNode: ParentNode & Node) => void;
    removeNode: (node: ChildNode | null) => void;
    isDocumentComplete: (targetDocument: Document) => boolean;
    cleanLegacyAttributes: (node: Node | null) => void;
    isContextValid: () => boolean;
    ensureContextValid: () => boolean;
    invalidateContext: () => void;
    getRuntimeSafely: () => CcxpLiteRuntime | null;
    getLocalStorageAreaSafely: CcxpLiteSharedDom["getLocalStorageAreaSafely"];
    addCleanupTask: (task: () => void) => void;
  }

  interface CcxpLiteSidebar {
    simplifySidebar: (
      navFrame: HTMLIFrameElement,
      retry: () => void,
      options?: { hostDocument?: Document },
    ) => void;
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
      imageNode: HTMLImageElement | null,
      targetDocument: Document,
    ) => string;
  }

  interface CcxpLiteLandingCaptcha {
    CAPTCHA_AUTOFILL_TIMEOUT_MS: number;
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
      tabNavigation: HTMLElement,
      tabContents: readonly HTMLElement[],
      strings?: Readonly<Record<string, string>>,
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
      strings?: Readonly<Record<string, string>>,
    ) => HTMLElement | null;
    buildLandingSupportLinks: (
      targetDocument: Document,
      serviceLinkNode: Element | null,
      cannotLoginAnchor: HTMLAnchorElement | null,
      strings?: Readonly<Record<string, string>>,
    ) => HTMLElement | null;
    collapseLegacyServiceRow: (serviceLinkNode: Element | null) => void;
    collapseLegacyCannotLoginLink: (cannotLoginAnchor: Element | null) => void;
    collapseLegacyUtilityRow: (utilityLinksTable: Element | null) => void;
    collapseLegacyThreeColumnRows: (rootNode: ParentNode | null) => void;
    findCalendarTable: (targetNode: ParentNode) => HTMLTableElement | null;
    prepareAnnouncementTable: (
      table: HTMLTableElement | null,
      strings?: Readonly<Record<string, string>>,
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
    getFavoriteIds: () => ReadonlySet<string>;
    ensureFavoriteIdsLoaded: (onReady?: () => void) => void;
    writeFavoriteIds: (favoriteIds: ReadonlySet<string>) => void;
    ensureFavoriteStorageSync: () => void;
    collectFavoriteLinks: (
      item: CcxpLiteSidebarTreeNode | null,
      favoriteIds: ReadonlySet<string>,
    ) => readonly CcxpLiteSidebarLinkItem[];
    dedupeLinkItems: (
      linkItems: readonly CcxpLiteSidebarLinkItem[],
    ) => readonly CcxpLiteSidebarLinkItem[];
    createLinkId: (linkItem: Partial<CcxpLiteSidebarLinkItem>) => string;
    createLegacyLinkId: (linkItem: Partial<CcxpLiteSidebarLinkItem>) => string;
    buildFavoritePathSegments: (
      parentPathSegments: readonly string[] | undefined,
      label: unknown,
      fallbackSegment?: string,
    ) => readonly string[];
    isFavoriteLink: (
      linkItem: CcxpLiteSidebarLinkItem | null,
      favoriteIds: ReadonlySet<string>,
    ) => boolean;
    getMatchingFavoriteIds: (
      linkItem: CcxpLiteSidebarLinkItem | null,
      favoriteIds: ReadonlySet<string>,
    ) => readonly string[];
    getScopedSessionStorage: () => Storage | null;
  }

  interface CcxpLiteSidebarData {
    buildSidebarModel: (
      root: CcxpLiteLegacySidebarFolderNode,
      navDocument: Document,
      strings: Readonly<Record<string, string>>,
    ) => CcxpLiteSidebarModel;
    parseSidebarTree: (navDocument: Document) => CcxpLiteLegacySidebarFolderNode | null;
    filterFavoriteLinks: (
      links: readonly CcxpLiteSidebarLinkItem[],
      query: string,
    ) => readonly CcxpLiteSidebarLinkItem[];
    filterCategories: (
      categories: readonly CcxpLiteSidebarCategoryNode[],
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
      strings?: Readonly<Record<string, string>>,
    ) => void;
    createSidebarSearch: (
      hostDocument: Document,
      strings: Readonly<Record<string, string>>,
    ) => HTMLElement;
    syncTopLevelFramesetLayout: (variant: "classic" | "layered") => void;
    mountSidebarVariantSwitch: (
      targetDocument: Document,
      state: CcxpLiteSidebarState,
      strings: Readonly<Record<string, string>>,
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
  }

  interface CcxpLiteNamespace {
    shared?: CcxpLiteShared;
    sharedConstants?: CcxpLiteSharedConstants;
    sharedLocale?: CcxpLiteSharedLocale;
    sharedDom?: CcxpLiteSharedDom;
    sharedTheme?: CcxpLiteSharedTheme;
    sharedBrand?: CcxpLiteSharedBrand;
    landing?: CcxpLiteLanding;
    landingLocale?: CcxpLiteLandingLocale;
    landingSupport?: CcxpLiteLandingSupport;
    landingCaptcha?: CcxpLiteLandingCaptcha;
    landingTabs?: CcxpLiteLandingTabs;
    landingValidation?: CcxpLiteLandingValidation;
    landingLogin?: CcxpLiteLandingLogin;
    sidebar?: CcxpLiteSidebar;
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
