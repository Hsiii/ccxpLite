(function registerCcxpLiteShared(globalScope) {
  const namespace = globalScope.CCXP_LITE || (globalScope.CCXP_LITE = {});
  const { sharedConstants, sharedTheme, sharedLocale, sharedBrand, sharedDom } = namespace;

  if (!sharedConstants || !sharedTheme || !sharedLocale || !sharedBrand || !sharedDom) {
    return;
  }

  const { TOKENS, LOCALIZED_STRINGS, SIDEBAR_CATEGORIES, ASSETS } = sharedConstants;
  const { ensureThemeDocument } = sharedTheme;
  const { getLocalizedStrings, normalizeLocale, resolveLocaleFromDocument } = sharedLocale;
  const { createBrandImage, createBrandCopy } = sharedBrand;
  const { moveChildNodes, removeNode, isDocumentComplete, cleanLegacyAttributes } = sharedDom;

  namespace.shared = {
    TOKENS,
    STRINGS: LOCALIZED_STRINGS.zh,
    LOCALIZED_STRINGS,
    SIDEBAR_CATEGORIES,
    ASSETS,
    ensureThemeDocument,
    getLocalizedStrings,
    normalizeLocale,
    resolveLocaleFromDocument,
    createBrandImage,
    createBrandCopy,
    moveChildNodes,
    removeNode,
    isDocumentComplete,
    cleanLegacyAttributes,
  };
})(window);
