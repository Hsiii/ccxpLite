(function registerCcxpLiteSharedLocale(globalScope) {
  const namespace = globalScope.CCXP_LITE || (globalScope.CCXP_LITE = {});
  const { sharedConstants } = namespace;

  if (!sharedConstants) {
    return;
  }

  const { LOCALIZED_STRINGS } = sharedConstants;

  function normalizeLocale(locale) {
    const normalizedLocale = String(locale || "").toLowerCase();

    if (normalizedLocale.startsWith("en")) {
      return "en";
    }

    return "zh";
  }

  function resolveLocaleFromDocument(targetDocument) {
    if (!targetDocument || !targetDocument.documentElement) {
      return "zh";
    }

    return normalizeLocale(targetDocument.documentElement.lang);
  }

  function getLocalizedStrings(locale) {
    return LOCALIZED_STRINGS[normalizeLocale(locale)] || LOCALIZED_STRINGS.zh;
  }

  namespace.sharedLocale = {
    normalizeLocale,
    resolveLocaleFromDocument,
    getLocalizedStrings,
  };
})(window);
