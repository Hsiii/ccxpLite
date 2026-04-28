(function registerCcxpLiteSidebarBootstrap(globalScope: Window & typeof globalThis) {
  const namespace = (globalScope.CCXP_LITE || (globalScope.CCXP_LITE = {})) as CcxpLiteNamespace;
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
    getLocalizedStrings,
    resolveLocaleFromDocument,
    createBrandImage,
    createBrandCopy,
    createBrandPartnerLink,
    isDocumentComplete,
    cleanLegacyAttributes,
  } = shared;
  const { favoriteSubscribers, ensureFavoriteStorageSync, ensureFavoriteIdsLoaded } =
    sidebarFavorites;
  const { buildSidebarModel, parseSidebarTree } = sidebarData;
  const { getSidebarUiState } = sidebarState;
  const { renderSidebar, createSidebarSearch, syncTopLevelFramesetLayout } = sidebarUi;
  const { captureInitialMainFrameUrl } = sidebarRuntime;

  function simplifySidebar(
    navFrame: HTMLFrameElement,
    retry: () => void,
    options: { hostDocument?: Document } = {},
  ) {
    const navDocument = navFrame.contentDocument;
    const hostDocument = options.hostDocument || navDocument;

    if (!navDocument || !navDocument.body || !navDocument.head) {
      retry();
      return;
    }

    if (
      navDocument.body.dataset.ccxpLiteSidebarApplied !== "true" &&
      !isDocumentComplete(navDocument)
    ) {
      retry();
      return;
    }

    const rawTree = parseSidebarTree(navDocument);
    if (!rawTree || !Array.isArray(rawTree.children)) {
      retry();
      return;
    }

    ensureThemeDocument(navDocument, "nav");
    ensureThemeDocument(hostDocument, "nav");
    const strings = getLocalizedStrings(resolveLocaleFromDocument(navDocument));
    const state = getSidebarUiState(hostDocument);
    captureInitialMainFrameUrl();
    syncTopLevelFramesetLayout(state.sidebarVariant);

    if (hostDocument.body.dataset.ccxpLiteSidebarApplied !== "true") {
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
      brand.appendChild(
        createBrandImage(
          hostDocument,
          "ccxp-lite-sidebar-brand-logo",
          ASSETS.sidebarBrandLogoPath as string,
        ),
      );
      brand.appendChild(
        createBrandCopy(
          hostDocument,
          "ccxp-lite-sidebar-brand-copy",
          "ccxp-lite-sidebar-brand-title",
          strings.sidebarTitle,
        ),
      );

      const { mark: repoMark, link: repoLink } = createBrandPartnerLink(hostDocument, {
        markClassName: "ccxp-lite-sidebar-brand-partner-mark",
        linkClassName: "ccxp-lite-sidebar-brand-partner-link",
        labelClassName: "ccxp-lite-sidebar-brand-partner-label",
        label: strings.sidebarGitHubLink,
      });

      const search = createSidebarSearch(hostDocument, strings);

      const content = hostDocument.createElement("main");
      content.className = "ccxp-lite-sidebar-content";

      const footer = hostDocument.createElement("footer");
      footer.className = "ccxp-lite-sidebar-footer";

      brandGroup.appendChild(brand);
      brandGroup.appendChild(repoMark);
      brandGroup.appendChild(repoLink);
      header.appendChild(brandGroup);
      header.appendChild(search);
      shell.appendChild(header);
      shell.appendChild(content);
      shell.appendChild(footer);

      cleanLegacyAttributes(shell);
      hostDocument.body.replaceChildren(shell);

      if (helperFrame) {
        helperFrame.style.display = "none";
        navDocument.body.appendChild(helperFrame);
      }

      brand.addEventListener("click", () => {
        const uiState = getSidebarUiState(hostDocument);
        uiState.currentCategoryId = "";
        uiState.activeLeaf = null;
        renderSidebar(
          hostDocument,
          navDocument,
          () => buildSidebarModel(rawTree, navDocument, strings),
          strings,
        );
      });

      repoLink.addEventListener("click", () => {
        window.open("https://github.com/Hsiii/ccxpLite", "_blank", "noopener,noreferrer");
      });

      hostDocument.body.dataset.ccxpLiteSidebarApplied = "true";
    }

    const rerender = () => {
      renderSidebar(
        hostDocument,
        navDocument,
        () => buildSidebarModel(rawTree, navDocument, strings),
        strings,
      );
    };
    ensureFavoriteStorageSync();
    favoriteSubscribers.add(rerender);
    ensureFavoriteIdsLoaded(rerender);
    rerender();
  }

  namespace.sidebar = {
    simplifySidebar,
  };
})(window);
