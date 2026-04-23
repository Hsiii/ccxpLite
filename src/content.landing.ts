(function registerCcxpLiteLanding(globalScope) {
  const namespace = globalScope.CCXP_LITE || (globalScope.CCXP_LITE = {});
  if (!namespace.landingBootstrap) {
    return;
  }

  namespace.landing = namespace.landingBootstrap;
})(window);
