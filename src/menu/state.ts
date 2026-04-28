(function registerCcxpLiteSidebarState(globalScope: Window & typeof globalThis) {
  const namespace = (globalScope.CCXP_LITE ||= {}) as CcxpLiteNamespace;
  const SIDEBAR_VARIANT_STORAGE_KEY = "ccxp-lite-sidebar-variant";
  const sidebarUiStateByDocument = new WeakMap<Document, CcxpLiteSidebarState>();
  let persistedSidebarVariant: "classic" | "layered" | null = null;

  function getSidebarUiState(navDocument: Document): CcxpLiteSidebarState {
    if (sidebarUiStateByDocument.has(navDocument)) {
      return sidebarUiStateByDocument.get(navDocument);
    }

    const state: CcxpLiteSidebarState = {
      hasLoaded: true,
      currentCategoryId: "",
      searchQuery: "",
      activeLeaf: null,
      sidebarVariant: getPersistedSidebarVariant(),
      classicExpandedItemIds: ["category-favorites"],
      scrollTopByView: {
        root: 0,
        category: 0,
        destination: 0,
      },
    };

    sidebarUiStateByDocument.set(navDocument, state);
    return state;
  }

  function persistSidebarScroll(targetDocument: Document, viewKey: string) {
    const content = targetDocument.querySelector(".ccxp-lite-sidebar-content");
    if (!content) {
      return;
    }

    const state = getSidebarUiState(targetDocument);
    state.scrollTopByView[viewKey] = content.scrollTop;
  }

  function restoreSidebarScroll(contentNode: Element, scrollTop: number) {
    const resolvedScrollTop = Number.isFinite(scrollTop) ? scrollTop : 0;
    window.requestAnimationFrame(() => {
      contentNode.scrollTop = resolvedScrollTop;
    });
  }

  function getPersistedSidebarVariant() {
    if (persistedSidebarVariant === "classic" || persistedSidebarVariant === "layered") {
      return persistedSidebarVariant;
    }

    try {
      const storedValue = window.localStorage.getItem(SIDEBAR_VARIANT_STORAGE_KEY);
      persistedSidebarVariant = storedValue === "layered" ? "layered" : "classic";
      return persistedSidebarVariant;
    } catch {
      persistedSidebarVariant = "classic";
      return persistedSidebarVariant;
    }
  }

  function setPersistedSidebarVariant(variant: "classic" | "layered"): "classic" | "layered" {
    persistedSidebarVariant = variant === "classic" ? "classic" : "layered";

    try {
      window.localStorage.setItem(SIDEBAR_VARIANT_STORAGE_KEY, persistedSidebarVariant);
    } catch {
      // Ignore storage write failures and keep the in-memory variant.
    }

    return persistedSidebarVariant;
  }

  namespace.sidebarState = {
    getSidebarUiState,
    persistSidebarScroll,
    restoreSidebarScroll,
    getPersistedSidebarVariant,
    setPersistedSidebarVariant,
  };
})(window);
