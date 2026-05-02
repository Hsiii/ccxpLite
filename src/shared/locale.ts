(function registerCcxpLiteSharedLocale(globalScope: typeof globalThis) {
  const runtimeScope = globalScope;
  const namespace = runtimeScope.CCXP_LITE ?? {};
  const { sharedConstants } = namespace;
  if (!sharedConstants) {
    return;
  }

  const { LOCALIZED_STRINGS } = sharedConstants;

  function normalizeLocale(locale: string | undefined): string {
    const normalized = (locale ?? "").toLowerCase();

    if (normalized.startsWith("en")) {
      return "en";
    }

    if (normalized.startsWith("zh") || normalized.startsWith("ch")) {
      return "zh";
    }

    return "zh";
  }

  function resolveLocaleFromDocument(targetDocument: Document | undefined): string {
    if (!targetDocument || !targetDocument.documentElement) {
      return "zh";
    }

    return normalizeLocale(targetDocument.documentElement.lang);
  }

  function getLocalizedStrings(locale: string | undefined): Record<string, string> {
    return LOCALIZED_STRINGS[normalizeLocale(locale)] || LOCALIZED_STRINGS.zh;
  }

  namespace.sharedLocale = {
    normalizeLocale,
    resolveLocaleFromDocument,
    getLocalizedStrings,
  };
})(globalThis);
