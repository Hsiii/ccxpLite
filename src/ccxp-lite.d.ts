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
    featureHeight?: number;
    featureWidth?: number;
    tensors: Record<string, CcxpLitePreparedTensor>;
  }

  interface CcxpLiteDecaptchaModel {
    digits?: number;
    eps?: number;
    cropRight?: number;
    featureHeight?: number;
    featureWidth?: number;
    tensors?: Record<string, CcxpLiteTensorSource>;
    preparedTensors?: Record<string, CcxpLitePreparedTensor>;
  }

  interface CcxpLiteCaptchaPredictor {
    predictDigits: (imageSource: unknown) => Promise<string> | string;
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
    clickLinkArgs?: CcxpLiteClickLinkArgs | undefined;
    nonce?: number;
  }

  interface CcxpLiteSidebarBlock {
    id: string;
    label: string;
    links: readonly CcxpLiteSidebarLinkItem[];
    kind: "block";
  }

  interface CcxpLiteSidebarLinkNode {
    id: string;
    label: string;
    linkItem: CcxpLiteSidebarLinkItem;
    kind: "link";
  }

  interface CcxpLiteSidebarCategoryNode {
    id: string;
    label: string;
    blocks: readonly CcxpLiteSidebarBlock[];
    links?: readonly CcxpLiteSidebarLinkItem[];
    kind: "category";
    emptyMessage?: string;
    icon?: string;
    summary?: string;
  }

  type CcxpLiteSidebarTreeNode =
    | CcxpLiteSidebarLinkNode
    | CcxpLiteSidebarBlock
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
    kind: "legacy" | "oauth";
  }

  interface CcxpLiteCaptchaAutofillState extends CcxpLiteCaptchaField {
    lastRequestedSrc: string;
    requestToken: number;
    pendingRequest: Promise<string> | undefined;
    pendingSrc: string;
    failedSrc: string;
    cachedAnswer: string;
    cachedSrc: string;
    timeoutFlashTimer?: number | undefined;
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
      languageLinks: ParentNode | undefined,
      loginSourceCell: ParentNode | undefined,
      loginForm: HTMLFormElement | undefined,
    ) => CcxpLiteLocale;
    getLoginForm: (targetDocument: Document) => HTMLFormElement | undefined;
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
    rememberLocale: (locale: string | undefined, targetDocument: Document | undefined) => string;
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
    removeNode: (node: ChildNode | undefined) => void;
    ensureDocumentHead: (targetDocument: Document) => HTMLHeadElement | undefined;
    ensureDocumentBody: (targetDocument: Document) => HTMLBodyElement | undefined;
    isDocumentComplete: (targetDocument: Document) => boolean;
    cleanLegacyAttributes: (node: Node | undefined) => void;
    isContextValid: () => boolean;
    ensureContextValid: () => boolean;
    invalidateContext: () => boolean;
    getRuntimeSafely: () => CcxpLiteRuntime | undefined;
    getLocalStorageAreaSafely: () =>
      | {
          get: (
            keys: readonly string[],
            callback: (result: Readonly<Record<string, unknown>>) => void,
          ) => void;
        }
      | undefined;
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
    rememberLocale: (locale: string | undefined, targetDocument: Document | undefined) => string;
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
    ensureDocumentHead: (targetDocument: Document) => HTMLHeadElement | undefined;
    ensureDocumentBody: (targetDocument: Document) => HTMLBodyElement | undefined;
    moveChildNodes: (sourceNode: ParentNode & Node, targetNode: ParentNode & Node) => void;
    removeNode: (node: ChildNode | undefined) => void;
    isDocumentComplete: (targetDocument: Document) => boolean;
    cleanLegacyAttributes: (node: Node | undefined) => void;
    isContextValid: () => boolean;
    ensureContextValid: () => boolean;
    invalidateContext: () => void;
    getRuntimeSafely: () => CcxpLiteRuntime | undefined;
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
    ensureLoginSubmissionPayload: (
      form: HTMLFormElement | undefined,
      targetDocument: Document,
    ) => void;
    extractPwdstrFromImage: (
      imageNode: HTMLImageElement | undefined,
      targetDocument: Document,
    ) => string;
  }

  interface CcxpLiteLandingCaptcha {
    CAPTCHA_AUTOFILL_TIMEOUT_MS: number;
    enableLoginCaptchaAutofill: (
      targetDocument: Document,
      rootNode: ParentNode,
      existingState?: CcxpLiteCaptchaAutofillState,
    ) => void;
    getOrCreateCaptchaAutofillState: (
      targetDocument: Document,
      rootNode: ParentNode,
    ) => CcxpLiteCaptchaAutofillState | undefined;
    primeCaptchaAutofill: (
      targetDocument: Document,
      state: CcxpLiteCaptchaAutofillState | undefined,
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
      loginForm: Element | undefined,
    ) => HTMLElement | undefined;
    findAnnouncementTable: (targetDocument: Document) => HTMLTableElement | undefined;
    findUtilityLinksTable: (targetDocument: Document) => HTMLTableElement | undefined;
    findCannotLoginLink: (
      targetDocument: Document,
      utilityLinksTable: Element | undefined,
    ) => HTMLAnchorElement | undefined;
    findServiceLink: (targetDocument: Document) => HTMLElement | undefined;
    buildHeaderUtilityLinks: (
      targetDocument: Document,
      utilityLinksTable: Element | undefined,
      excludedAnchor: HTMLAnchorElement | undefined,
      strings?: Readonly<Record<string, string>>,
    ) => HTMLElement | undefined;
    buildLandingSupportLinks: (
      targetDocument: Document,
      serviceLinkNode: Element | undefined,
      cannotLoginAnchor: HTMLAnchorElement | undefined,
      strings?: Readonly<Record<string, string>>,
    ) => HTMLElement | undefined;
    collapseLegacyServiceRow: (serviceLinkNode: Element | undefined) => void;
    collapseLegacyCannotLoginLink: (cannotLoginAnchor: Element | undefined) => void;
    collapseLegacyUtilityRow: (utilityLinksTable: Element | undefined) => void;
    collapseLegacyThreeColumnRows: (rootNode: ParentNode | undefined) => void;
    findCalendarTable: (targetNode: ParentNode) => HTMLTableElement | undefined;
    prepareAnnouncementTable: (
      table: HTMLTableElement | undefined,
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

  interface CcxpLiteLandingIdentifyResult {
    loginForm: HTMLFormElement | undefined;
    loginSourceCell: HTMLElement;
    tabNavigation: HTMLElement | undefined;
    tabContents: HTMLElement[];
    languageLinks: HTMLElement | undefined;
    announcementTable: HTMLTableElement | undefined;
    utilityLinks: HTMLTableElement | undefined;
    cannotLoginLink: HTMLAnchorElement | undefined;
    serviceLink: HTMLElement | undefined;
    locale: CcxpLiteLocale;
    strings: Readonly<Record<string, string>>;
  }

  interface CcxpLiteLandingIdentify {
    identifyLandingSurface: (targetDocument: Document) => CcxpLiteLandingIdentifyResult | undefined;
  }

  interface CcxpLiteLandingRewriteResult {
    shell: HTMLElement;
    loginSection: HTMLElement;
    loginValidationState: CcxpLiteLandingValidationState;
    captchaAutofillState: CcxpLiteCaptchaAutofillState | undefined;
  }

  interface CcxpLiteLandingRewrite {
    rewriteLandingSurface: (
      targetDocument: Document,
      identifiedSurface: CcxpLiteLandingIdentifyResult,
    ) => CcxpLiteLandingRewriteResult;
  }

  interface CcxpLiteLandingStyle {
    applyLandingTheme: (
      targetDocument: Document,
      rewriteResult: CcxpLiteLandingRewriteResult,
    ) => void;
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
    activeLeaf: CcxpLiteSidebarLinkItem | undefined;
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
      item: CcxpLiteSidebarTreeNode | undefined,
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
      linkItem: CcxpLiteSidebarLinkItem | undefined,
      favoriteIds: ReadonlySet<string>,
    ) => boolean;
    getMatchingFavoriteIds: (
      linkItem: CcxpLiteSidebarLinkItem | undefined,
      favoriteIds: ReadonlySet<string>,
    ) => readonly string[];
    getScopedSessionStorage: () => Storage | undefined;
  }

  interface CcxpLiteSidebarData {
    buildSidebarModel: (
      root: CcxpLiteLegacySidebarFolderNode,
      navDocument: Document,
      strings: Readonly<Record<string, string>>,
    ) => CcxpLiteSidebarModel;
    parseSidebarTree: (navDocument: Document) => CcxpLiteLegacySidebarFolderNode | undefined;
    filterFavoriteLinks: (
      links: readonly CcxpLiteSidebarLinkItem[],
      query: string,
    ) => readonly CcxpLiteSidebarLinkItem[];
    filterCategories: (
      categories: readonly CcxpLiteSidebarCategoryNode[],
      query: string,
    ) => readonly CcxpLiteSidebarCategoryNode[];
    filterCategoryTree: (
      category: CcxpLiteSidebarCategoryNode | undefined,
      query: string,
    ) => CcxpLiteSidebarCategoryNode | undefined;
    countLinksInTree: (item: CcxpLiteSidebarTreeNode | undefined) => number;
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
      footer?: HTMLElement,
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
    getLegacyMainFrame: () => HTMLIFrameElement | undefined;
    captureInitialMainFrameUrl: () => void;
    openLeafInNewTab: (activeLeaf: CcxpLiteSidebarLinkItem, navDocument: Document) => void;
    activateLegacyLink: (
      linkItem: CcxpLiteSidebarLinkItem,
      navDocument: Document,
      destinationFrame?: HTMLIFrameElement,
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
      pendingLoad: Promise<void> | undefined;
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
    landingIdentify?: CcxpLiteLandingIdentify;
    landingRewrite?: CcxpLiteLandingRewrite;
    landingStyle?: CcxpLiteLandingStyle;
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
    decaptcha?: CcxpLiteCaptchaPredictor;
    decaptchaModel?: CcxpLiteDecaptchaModel;
    oauthDecaptcha?: CcxpLiteCaptchaPredictor;
    oauthDecaptchaModel?: CcxpLiteDecaptchaModel;
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
