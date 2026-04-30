(function registerCcxpLiteLandingBootstrap(globalScope: Window & typeof globalThis) {
  const namespace = (globalScope.CCXP_LITE ||= {}) as CcxpLiteNamespace;
  const { shared } = namespace;
  const {
    landingLocale,
    landingValidation,
    landingCaptcha,
    landingTabs,
    landingSupport,
    landingLogin,
  } = namespace;
  if (
    !shared ||
    !landingLocale ||
    !landingValidation ||
    !landingCaptcha ||
    !landingTabs ||
    !landingSupport ||
    !landingLogin
  ) {
    return;
  }

  const {
    TOKENS,
    ASSETS,
    ensureThemeDocument,
    getLocalizedStrings,
    createBrandImage,
    createBrandCopy,
    createBrandPartnerLink,
    moveChildNodes,
    removeNode,
    isDocumentComplete,
    cleanLegacyAttributes,
  } = shared;
  const { isSupportedInquirePath, isLandingPage, resolveLandingLocale, getLoginForm } =
    landingLocale;
  const { captureLoginValidationState, restoreLoginValidationGuards } = landingValidation;
  const { enableLoginCaptchaAutofill, getOrCreateCaptchaAutofillState } = landingCaptcha;
  const { createLandingSection, wireLandingTabs } = landingTabs;
  const {
    findLoginSourceCell,
    findAnnouncementTable,
    findUtilityLinksTable,
    findCannotLoginLink,
    findServiceLink,
    buildHeaderUtilityLinks,
    buildLandingSupportLinks,
    collapseLegacyServiceRow,
    collapseLegacyCannotLoginLink,
    collapseLegacyUtilityRow,
    collapseLegacyThreeColumnRows,
    findCalendarTable,
    prepareAnnouncementTable,
  } = landingSupport;
  const {
    normalizeLoginFormLayout,
    removeLoginResetControls,
    forceCaptchaLabelDisplay,
    replaceLoginFormImageButtons,
    wrapPrimaryLoginButtons,
    removeLoginSpacingArtifacts,
    alignCaptchaMediaRow,
    enhancePasswordVisibilityToggle,
  } = landingLogin;

  function preloadLandingCaptcha(targetDocument: Document) {
    if (!isLandingPage(targetDocument)) {
      return;
    }

    getOrCreateCaptchaAutofillState(targetDocument, targetDocument);
  }

  function simplifyLandingPage(
    targetDocument: Document,
    options: {
      retry?: () => void;
      onReady?: () => void;
    } = {},
  ) {
    const retryFn = typeof options.retry === "function" ? options.retry : () => undefined;
    const onReady = typeof options.onReady === "function" ? options.onReady : () => undefined;

    if (!targetDocument.body || !targetDocument.head) {
      retryFn();
      return;
    }

    if (targetDocument.body.dataset.ccxpLiteLandingApplied === "true") {
      onReady();
      return;
    }

    if (!isDocumentComplete(targetDocument)) {
      retryFn();
      return;
    }

    const loginForm = getLoginForm(targetDocument);
    const loginSourceCell = findLoginSourceCell(targetDocument, loginForm);
    const tabNavigation = targetDocument.querySelector(".tab");
    const tabContents = Array.from(targetDocument.querySelectorAll(".tabcontent"));
    const languageLinks = targetDocument.querySelector("ul.links");
    const announcementTable = findAnnouncementTable(targetDocument);
    const utilityLinks = findUtilityLinksTable(targetDocument);
    const cannotLoginLink = findCannotLoginLink(targetDocument, utilityLinks);
    const serviceLink = findServiceLink(targetDocument);
    const locale = resolveLandingLocale(
      targetDocument,
      languageLinks as ParentNode | null,
      loginSourceCell as ParentNode | null,
      loginForm,
    );
    const strings = getLocalizedStrings(locale);

    if (!loginSourceCell) {
      retryFn();
      return;
    }

    const loginValidationState = captureLoginValidationState(targetDocument);

    ensureThemeDocument(targetDocument, "landing");

    const shell = targetDocument.createElement("main");
    shell.className = TOKENS.landingClass;

    const topSection = createLandingSection(targetDocument, "ccxp-lite-landing-top");
    const headerSection = createLandingSection(targetDocument, "ccxp-lite-landing-header");
    const brandSection = createLandingSection(
      targetDocument,
      "ccxp-lite-landing-brand ccxp-lite-sidebar-brand-group",
    );
    const langSection = createLandingSection(targetDocument, "ccxp-lite-landing-lang");
    const loginSection = createLandingSection(targetDocument, "ccxp-lite-landing-login");
    const tabsSection = createLandingSection(targetDocument, "ccxp-lite-landing-tabs");
    const noticesSection = createLandingSection(targetDocument, "ccxp-lite-landing-notices");

    const brandLockup = targetDocument.createElement("div");
    brandLockup.className = "ccxp-lite-landing-brand-lockup ccxp-lite-sidebar-brand";

    brandLockup.append(
      createBrandImage(
        targetDocument,
        "ccxp-lite-landing-brand-logo ccxp-lite-sidebar-brand-logo",
        ASSETS.sidebarBrandLogoPath,
      ),
    );
    brandLockup.append(
      createBrandCopy(
        targetDocument,
        "ccxp-lite-landing-brand-copy ccxp-lite-sidebar-brand-copy",
        "ccxp-lite-sidebar-brand-title",
        strings.sidebarTitle,
      ),
    );
    brandSection.append(brandLockup);

    const { mark: repoMark, link: repoLink } = createBrandPartnerLink(targetDocument, {
      markClassName: "ccxp-lite-landing-brand-partner-mark",
      linkClassName: "ccxp-lite-landing-brand-partner-link",
      labelClassName: "ccxp-lite-landing-brand-partner-label",
      label: strings.sidebarGitHubLink,
    });
    brandSection.append(repoMark);
    brandSection.append(repoLink);

    if (languageLinks) {
      langSection.append(languageLinks);
    }

    repoLink.addEventListener("click", () => {
      window.open("https://github.com/Hsiii/ccxpLite", "_blank", "noopener,noreferrer");
    });

    const loginHeaderLabel = targetDocument.createElement("h1");
    loginHeaderLabel.className = "ccxp-lite-landing-login-label";
    loginHeaderLabel.textContent = strings.loginTitle;
    loginSection.append(loginHeaderLabel);

    if (loginForm) {
      loginSection.append(loginForm);
    } else {
      moveChildNodes(loginSourceCell as Node, loginSection);
    }

    normalizeLoginFormLayout(loginSection);
    removeLoginResetControls(loginSection);
    forceCaptchaLabelDisplay(loginSection);
    replaceLoginFormImageButtons(targetDocument, loginSection);
    wrapPrimaryLoginButtons(targetDocument, loginSection);
    removeLoginSpacingArtifacts(targetDocument, loginSection);
    alignCaptchaMediaRow(targetDocument, loginSection);
    enhancePasswordVisibilityToggle(targetDocument, loginSection);
    const captchaAutofillState = getOrCreateCaptchaAutofillState(
      targetDocument,
      loginSection as ParentNode,
    );

    removeNode(findCalendarTable(loginSection));
    removeNode(loginSection.querySelector("#twcaseal")?.closest("table") || null);

    collapseLegacyThreeColumnRows(targetDocument.body);

    headerSection.append(brandSection);
    if (languageLinks) {
      headerSection.append(langSection);
    }

    const utilityHeaderLinks = buildHeaderUtilityLinks(
      targetDocument,
      utilityLinks,
      cannotLoginLink,
      strings,
    );
    if (utilityHeaderLinks) {
      if (languageLinks) {
        headerSection.insertBefore(utilityHeaderLinks, langSection);
      } else {
        headerSection.append(utilityHeaderLinks);
      }
    }

    if (utilityLinks) {
      collapseLegacyUtilityRow(utilityLinks);
      removeNode(utilityLinks as Node);
    }

    topSection.append(headerSection);
    topSection.append(loginSection);
    shell.append(topSection);

    const supportLinks = buildLandingSupportLinks(
      targetDocument,
      serviceLink,
      cannotLoginLink,
      strings,
    );
    if (serviceLink) {
      collapseLegacyServiceRow(serviceLink);
    }

    if (cannotLoginLink) {
      collapseLegacyCannotLoginLink(cannotLoginLink);
    }

    if (tabNavigation && tabContents.length > 0) {
      const tabsHeader = targetDocument.createElement("div");
      tabsHeader.className = "ccxp-lite-landing-tabs-header";
      tabsHeader.append(tabNavigation);

      if (supportLinks) {
        tabsHeader.append(supportLinks);
      }

      tabsSection.append(tabsHeader);
      tabContents.forEach((tabContent) => {
        collapseLegacyThreeColumnRows(tabContent);
        tabsSection.append(tabContent);
      });

      wireLandingTabs(targetDocument, tabNavigation, tabContents, strings);
      shell.append(tabsSection);
    } else if (supportLinks) {
      const supportSection = createLandingSection(targetDocument, "ccxp-lite-landing-support-only");
      supportSection.append(supportLinks);
      shell.append(supportSection);
    }

    if (announcementTable) {
      prepareAnnouncementTable(announcementTable, strings);
      noticesSection.append(announcementTable);
      shell.append(noticesSection);
    }

    cleanLegacyAttributes(shell);
    cleanLegacyAttributes(targetDocument);
    targetDocument.body.replaceChildren(shell);

    // Force style override on body as a last resort
    targetDocument.body.style.setProperty("background-image", "none", "important");
    targetDocument.body.style.setProperty("background-color", "var(--ccxp-lite-bg)", "important");
    enableLoginCaptchaAutofill(targetDocument, loginSection as ParentNode, captchaAutofillState);
    restoreLoginValidationGuards(targetDocument, loginValidationState);
    targetDocument.body.dataset.ccxpLiteLandingApplied = "true";
    onReady();
  }

  namespace.landing = {
    isSupportedInquirePath,
    isLandingPage,
    preloadLandingCaptcha,
    simplifyLandingPage,
  };
})(globalThis);
