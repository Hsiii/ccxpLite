(function registerCcxpLiteSharedLocale(globalScope: Window & typeof globalThis) {
  const namespace = (globalScope.CCXP_LITE || (globalScope.CCXP_LITE = {})) as CcxpLiteNamespace;
  const { sharedConstants } = namespace;
  if (!sharedConstants) {
    return;
  }

  const { LOCALIZED_STRINGS } = sharedConstants;

  function normalizeLocale(locale: string | null | undefined): string {
    const normalized = String(locale || "").toLowerCase();

    if (normalized.startsWith("en")) {
      return "en";
    }

    if (normalized.startsWith("zh") || normalized.startsWith("ch")) {
      return "zh";
    }

    return "zh";
  }

  function resolveLocaleFromDocument(targetDocument: Document | null): string {
    if (!targetDocument || !targetDocument.documentElement) {
      return "zh";
    }

    return normalizeLocale(targetDocument.documentElement.lang);
  }

  function getLocalizedStrings(locale: string | null | undefined): Record<string, string> {
    return LOCALIZED_STRINGS[normalizeLocale(locale)] || LOCALIZED_STRINGS.zh;
  }

  namespace.sharedLocale = {
    normalizeLocale,
    resolveLocaleFromDocument,
    getLocalizedStrings,
  };
})(window);
