(function registerCcxpLiteLandingIdentify(globalScope: typeof globalThis) {
  const runtimeScope = globalScope;
  const namespace = runtimeScope.CCXP_LITE ?? {};
  const { shared, landingLocale, landingSupport } = namespace;
  if (!shared || !landingLocale || !landingSupport) {
    return;
  }

  const { getLocalizedStrings, rememberLocale } = shared;
  const { resolveLandingLocale, getLoginForm } = landingLocale;
  const {
    findLoginSourceCell,
    findAnnouncementTable,
    findUtilityLinksTable,
    findCannotLoginLink,
    findServiceLink,
  } = landingSupport;

  function identifyLandingSurface(targetDocument: Document) {
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
    const locale = resolveLandingLocale(targetDocument, languageLinks, loginSourceCell, loginForm);

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

  namespace.landingIdentify = {
    identifyLandingSurface,
  };
})(globalThis);
