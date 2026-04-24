// @ts-nocheck
(function registerCcxpLiteSidebarBootstrap(globalScope) {
  const namespace = globalScope.CCXP_LITE || (globalScope.CCXP_LITE = {});
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
    isDocumentComplete,
    cleanLegacyAttributes,
  } = shared;
  const { favoriteSubscribers, ensureFavoriteStorageSync, ensureFavoriteIdsLoaded } =
    sidebarFavorites;
  const { buildSidebarModel, parseSidebarTree } = sidebarData;
  const { getSidebarUiState } = sidebarState;
  const { renderSidebar, createSidebarSearch, createBrandCloseIcon } = sidebarUi;
  const { captureInitialMainFrameUrl, hideLegacyMainFrame } = sidebarRuntime;

  function simplifySidebar(navFrame, retry, options = {}) {
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
    captureInitialMainFrameUrl();

    if (hostDocument.body.dataset.ccxpLiteSidebarApplied !== "true") {
      const helperFrame = navDocument.querySelector("iframe[name='frame_7472']");
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
        createBrandImage(hostDocument, "ccxp-lite-sidebar-brand-logo", ASSETS.sidebarBrandLogoPath),
      );
      brand.appendChild(
        createBrandCopy(
          hostDocument,
          "ccxp-lite-sidebar-brand-copy",
          "ccxp-lite-sidebar-brand-title",
          strings.sidebarTitle,
        ),
      );

      const repoMark = hostDocument.createElement("span");
      repoMark.className = "ccxp-lite-sidebar-brand-partner-mark";
      repoMark.appendChild(createBrandCloseIcon(hostDocument));

      const repoLink = hostDocument.createElement("button");
      repoLink.type = "button";
      repoLink.className = "ccxp-lite-sidebar-brand-partner-link";
      repoLink.setAttribute("aria-label", strings.sidebarGitHubLink);
      repoLink.setAttribute("title", strings.sidebarGitHubLink);

      const repoLabel = hostDocument.createElement("span");
      repoLabel.className = "ccxp-lite-sidebar-brand-partner-label";
      repoLabel.textContent = strings.sidebarGitHubLink;
      repoLink.appendChild(repoLabel);

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
        const state = getSidebarUiState(hostDocument);
        state.currentCategoryId = "";
        state.activeLeaf = null;
        state.legacyMainActive = false;
        hideLegacyMainFrame();
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

    const rerender = () =>
      renderSidebar(
        hostDocument,
        navDocument,
        () => buildSidebarModel(rawTree, navDocument, strings),
        strings,
      );
    ensureFavoriteStorageSync();
    favoriteSubscribers.add(rerender);
    ensureFavoriteIdsLoaded(rerender);
    rerender();
  }

  namespace.sidebarBootstrap = {
    simplifySidebar,
  };
})(window);
