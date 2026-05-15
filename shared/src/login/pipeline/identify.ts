(function registerCcxpLiteLoginIdentify(globalScope: typeof globalThis) {
  const runtimeScope = globalScope;
  const namespace = runtimeScope.CCXP_LITE ?? {};
  const { shared, loginLocale, loginSupport } = namespace;
  if (!shared || !loginLocale || !loginSupport) {
    return;
  }

  const { getLocalizedStrings, rememberLocale } = shared;
  const { resolveLoginLocale, getLoginForm } = loginLocale;
  const {
    findLoginSourceCell,
    findAnnouncementTable,
    findUtilityLinksTable,
    findCannotLoginLink,
    findServiceLink,
  } = loginSupport;

  function identifyLoginSurface(targetDocument: Document) {
    const loginForm = getLoginForm(targetDocument);
    const loginSourceCell = findLoginSourceCell(targetDocument, loginForm);
    if (!loginSourceCell) {
      return undefined;
    }

    const tabNavigation = targetDocument.querySelector<HTMLElement>(".tab") ?? undefined;
    const tabContents = [...targetDocument.querySelectorAll<HTMLElement>(".tabcontent")];
    const languageLinks = targetDocument.querySelector<HTMLElement>("ul.links") ?? undefined;
    const announcementTable = findAnnouncementTable(targetDocument);
    const utilityLinks = findUtilityLinksTable(targetDocument);
    const cannotLoginLink = findCannotLoginLink(targetDocument, utilityLinks);
    const serviceLink = findServiceLink(targetDocument);
    const locale = resolveLoginLocale(targetDocument, languageLinks, loginSourceCell, loginForm);

    rememberLocale(locale, targetDocument);

    return {
      loginForm,
      loginSourceCell,
      tabNavigation,
      tabContents,
      languageLinks,
      announcementTable,
      utilityLinks,
      cannotLoginLink,
      serviceLink,
      locale,
      strings: getLocalizedStrings(locale),
    };
  }

  namespace.loginIdentify = {
    identifyLoginSurface,
  };
})(globalThis);
