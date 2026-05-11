(function registerCcxpLiteSharedLocale(globalScope: typeof globalThis) {
  const runtimeScope = globalScope;
  const namespace = runtimeScope.CCXP_LITE ?? {};
  const { sharedConstants } = namespace;
  if (!sharedConstants) {
    return;
  }

  const { LOCALIZED_STRINGS } = sharedConstants;
  const LOCALE_STORAGE_KEY = "ccxp-lite-locale";

  function detectSupportedLocale(locale: string | undefined): string | undefined {
    const normalized = (locale ?? "").toLowerCase();

    if (normalized.startsWith("en")) {
      return "en";
    }

    if (normalized.startsWith("zh") || normalized.startsWith("ch")) {
      return "zh";
    }

    return undefined;
  }

  function normalizeLocale(locale: string | undefined): string {
    return detectSupportedLocale(locale) ?? "zh";
  }

  function getSessionStorage(targetDocument: Document | undefined): Storage | undefined {
    const targetWindow = targetDocument?.defaultView ?? globalThis;
    try {
      return targetWindow.sessionStorage;
    } catch {
      return undefined;
    }
  }

  function syncDocumentLocale(targetDocument: Document, locale: string) {
    const normalized = normalizeLocale(locale);
    const { documentElement } = targetDocument;
    if (documentElement.lang !== normalized) {
      documentElement.lang = normalized;
    }
  }

  function rememberLocale(locale: string | undefined, targetDocument: Document | undefined) {
    const normalized = detectSupportedLocale(locale);
    if (normalized === undefined) {
      return "zh";
    }
    const storage = getSessionStorage(targetDocument);
    if (storage !== undefined) {
      try {
        storage.setItem(LOCALE_STORAGE_KEY, normalized);
      } catch {
        // Ignore storage write failures and continue with in-memory behavior.
      }
    }
    if (targetDocument) {
      syncDocumentLocale(targetDocument, normalized);
    }
    return normalized;
  }

  function resolveStoredLocale(targetDocument: Document | undefined): string | undefined {
    const storage = getSessionStorage(targetDocument);
    if (!storage) {
      return undefined;
    }
    try {
      return detectSupportedLocale(storage.getItem(LOCALE_STORAGE_KEY) ?? undefined);
    } catch {
      return undefined;
    }
  }

  function resolveLocaleFromDocument(targetDocument: Document | undefined): string {
    if (!targetDocument) {
      return resolveStoredLocale(targetDocument) ?? "zh";
    }

    const explicitLocale = detectSupportedLocale(targetDocument.documentElement.lang);
    if (explicitLocale !== undefined) {
      return rememberLocale(explicitLocale, targetDocument);
    }

    const storedLocale = resolveStoredLocale(targetDocument);
    if (storedLocale !== undefined) {
      syncDocumentLocale(targetDocument, storedLocale);
      return storedLocale;
    }

    return "zh";
  }

  function getLocalizedStrings(locale: string | undefined): Record<string, string> {
    return LOCALIZED_STRINGS[normalizeLocale(locale)];
  }

  namespace.sharedLocale = {
    normalizeLocale,
    rememberLocale,
    resolveLocaleFromDocument,
    getLocalizedStrings,
  };
})(globalThis);
