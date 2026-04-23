(function registerCcxpLiteSidebar(globalScope) {
  const namespace = globalScope.CCXP_LITE || (globalScope.CCXP_LITE = {});
  if (!namespace.sidebarBootstrap) {
    return;
  }

  namespace.sidebar = {
    simplifySidebar: namespace.sidebarBootstrap.simplifySidebar,
  };
})(window);
