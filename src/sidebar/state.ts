// @ts-nocheck
(function registerCcxpLiteSidebarState(globalScope) {
  const namespace = globalScope.CCXP_LITE || (globalScope.CCXP_LITE = {});
  const sidebarUiStateByDocument = new WeakMap();

  function getSidebarUiState(navDocument) {
    if (sidebarUiStateByDocument.has(navDocument)) {
      return sidebarUiStateByDocument.get(navDocument);
    }

    const state = {
      currentCategoryId: "",
      searchQuery: "",
      viewMode: "grid",
      activeLeaf: null,
      scrollTopByView: {
        root: 0,
        category: 0,
        destination: 0,
      },
    };

    sidebarUiStateByDocument.set(navDocument, state);
    return state;
  }

  function persistSidebarScroll(targetDocument, viewKey) {
    const content = targetDocument.querySelector(".ccxp-lite-sidebar-content");
    if (!content) {
      return;
    }

    const state = getSidebarUiState(targetDocument);
    state.scrollTopByView[viewKey] = content.scrollTop;
  }

  function restoreSidebarScroll(contentNode, scrollTop) {
    const resolvedScrollTop = Number.isFinite(scrollTop) ? scrollTop : 0;
    window.requestAnimationFrame(() => {
      contentNode.scrollTop = resolvedScrollTop;
    });
  }

  namespace.sidebarState = {
    getSidebarUiState,
    persistSidebarScroll,
    restoreSidebarScroll,
  };
})(window);
