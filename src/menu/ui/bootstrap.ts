(function registerCcxpLiteSidebarBootstrap(globalScope: typeof globalThis) {
  const runtimeScope = globalScope;
  const namespace = runtimeScope.CCXP_LITE ?? {};
  const { shared, sidebarFavorites, sidebarData, sidebarState, sidebarUi, sidebarRuntime } =
    namespace;
  if (
    !shared ||
    !sidebarFavorites ||
    !sidebarData ||
    !sidebarState ||
    !sidebarUi ||
    !sidebarRuntime
  ) {
    return;
  }

  const {
    TOKENS,
    ASSETS,
    ensureThemeDocument,
    ensureDocumentBody,
    getLocalizedStrings,
    resolveLocaleFromDocument,
    createBrandImage,
    createBrandCopy,
    createBrandPartnerLink,
    isDocumentComplete,
    cleanLegacyAttributes,
    trackEvent,
  } = shared;
  const { favoriteSubscribers, ensureFavoriteStorageSync, ensureFavoriteIdsLoaded } =
    sidebarFavorites;
  const { buildSidebarModel, parseSidebarTree } = sidebarData;
  const { getSidebarUiState } = sidebarState;
  const { renderSidebar, createSidebarSearch, syncTopLevelFramesetLayout } = sidebarUi;
  const { captureInitialMainFrameUrl } = sidebarRuntime;
  const rerenderBindingByDocument = new WeakMap<
    Document,
    {
      boundRerender: () => void;
      render: (() => void) | undefined;
    }
  >();

  function isArray<T>(value: unknown): value is T[] {
    return value !== null && typeof value === "object" && value.constructor === Array;
  }

  function simplifySidebar(
    navFrame: HTMLIFrameElement,
    retry: () => void,
    options: { hostDocument?: Document } = {},
  ) {
    const navDocument = navFrame.contentDocument;

    if (!navDocument) {
      retry();
      return;
    }

    const hostDocument = options.hostDocument ?? navDocument;
    const navBody = navDocument.querySelector("body");

    if (!navBody) {
      retry();
      return;
    }

    if (navBody.dataset.ccxpLiteSidebarApplied !== "true" && !isDocumentComplete(navDocument)) {
      retry();
      return;
    }

    const rawTree = parseSidebarTree(navDocument);
    if (!rawTree || !isArray(rawTree.children)) {
      retry();
      return;
    }

    ensureThemeDocument(navDocument, "nav");
    ensureThemeDocument(hostDocument, "nav");
    const strings = getLocalizedStrings(resolveLocaleFromDocument(navDocument));
    const state = getSidebarUiState(hostDocument);
    const rerenderBinding = getOrCreateRerenderBinding(hostDocument);
    captureInitialMainFrameUrl();
    syncTopLevelFramesetLayout(state.sidebarVariant);
    const hostBody = ensureDocumentBody(hostDocument);

    if (!hostBody) {
      retry();
      return;
    }

    if (hostBody.dataset.ccxpLiteSidebarApplied !== "true") {
      const helperFrame = navDocument.querySelector<HTMLIFrameElement>("iframe[name='frame_7472']");
      const shell = hostDocument.createElement("div");
      shell.className = `${TOKENS.sidebarClass} ccxp-lite-app-shell`;

      const header = hostDocument.createElement("div");
      header.className = "ccxp-lite-sidebar-header";

      const brandGroup = hostDocument.createElement("div");
      brandGroup.className = "ccxp-lite-sidebar-brand-group";

      const brand = hostDocument.createElement("button");
      brand.type = "button";
      brand.className = "ccxp-lite-sidebar-brand ccxp-lite-sidebar-brand-button";
      brand.setAttribute("aria-label", strings.sidebarResetHome);
      brand.setAttribute("title", strings.sidebarResetHome);
      brand.append(
        createBrandImage(hostDocument, "ccxp-lite-sidebar-brand-logo", ASSETS.sidebarBrandLogoPath),
      );
      brand.append(
        createBrandCopy(
          hostDocument,
          "ccxp-lite-sidebar-brand-copy",
          "ccxp-lite-sidebar-brand-title",
          strings.sidebarTitle,
        ),
      );

      const { link: repoLink } = createBrandPartnerLink(hostDocument, {
        linkClassName: "ccxp-lite-sidebar-brand-partner-link",
        iconWrapClassName: "ccxp-lite-sidebar-brand-partner-mark",
        copyClassName: "ccxp-lite-sidebar-brand-partner-copy",
        labelClassName: "ccxp-lite-sidebar-brand-partner-label",
        label: strings.sidebarGitHubLink,
      });

      const search = createSidebarSearch(hostDocument, strings);

      const content = hostDocument.createElement("main");
      content.className = "ccxp-lite-sidebar-content";

      const footer = hostDocument.createElement("footer");
      footer.className = "ccxp-lite-sidebar-footer";

      brandGroup.append(brand);
      brandGroup.append(repoLink);
      header.append(brandGroup);
      header.append(search);
      shell.append(header);
      shell.append(content);
      shell.append(footer);

      cleanLegacyAttributes(shell);
      hostBody.replaceChildren(shell);

      if (helperFrame) {
        helperFrame.style.display = "none";
        navBody.append(helperFrame);
      }

      brand.addEventListener("click", () => {
        const uiState = getSidebarUiState(hostDocument);
        trackEvent(hostDocument, {
          feature: "navigation",
          action: "go_home",
          surface: "sidebar",
          sidebar_variant: uiState.sidebarVariant,
        });
        uiState.currentCategoryId = "";
        uiState.activeLeaf = undefined;
        rerenderBinding.render?.();
      });

      repoLink.addEventListener("click", () => {
        trackEvent(hostDocument, {
          feature: "engagement",
          action: "open_repo",
          surface: "sidebar",
        });
        window.open("https://github.com/NTHU-SA/ccxpLite", "_blank", "noopener,noreferrer");
      });

      hostBody.dataset.ccxpLiteSidebarApplied = "true";
    }

    rerenderBinding.render = () => {
      renderSidebar(
        hostDocument,
        navDocument,
        () => buildSidebarModel(rawTree, navDocument, strings),
        strings,
      );
    };
    ensureFavoriteStorageSync();
    favoriteSubscribers.add(rerenderBinding.boundRerender);
    ensureFavoriteIdsLoaded(rerenderBinding.boundRerender);
    rerenderBinding.boundRerender();
  }

  function getOrCreateRerenderBinding(targetDocument: Document) {
    const existingBinding = rerenderBindingByDocument.get(targetDocument);
    if (existingBinding) {
      return existingBinding;
    }
    const binding = {
      boundRerender: () => {
        binding.render?.();
      },
      render: undefined as (() => void) | undefined,
    };
    rerenderBindingByDocument.set(targetDocument, binding);
    return binding;
  }

  namespace.sidebar = {
    simplifySidebar,
  };
})(globalThis);
