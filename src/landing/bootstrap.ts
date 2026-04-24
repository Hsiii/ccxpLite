// @ts-nocheck
(function registerCcxpLiteLandingBootstrap(globalScope) {
  const namespace = globalScope.CCXP_LITE || (globalScope.CCXP_LITE = {});
  const {
    shared,
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

  function preloadLandingCaptcha(targetDocument) {
    if (!isLandingPage(targetDocument)) {
      return;
    }

    getOrCreateCaptchaAutofillState(targetDocument, targetDocument);
  }

  function simplifyLandingPage(targetDocument, options = {}) {
    const retryFn = typeof options.retry === "function" ? options.retry : () => {};
    const onReady = typeof options.onReady === "function" ? options.onReady : () => {};

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
    const locale = resolveLandingLocale(targetDocument, languageLinks, loginSourceCell, loginForm);
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

    brandLockup.appendChild(
      createBrandImage(
        targetDocument,
        "ccxp-lite-landing-brand-logo ccxp-lite-sidebar-brand-logo",
        ASSETS.sidebarBrandLogoPath,
      ),
    );
    brandLockup.appendChild(
      createBrandCopy(
        targetDocument,
        "ccxp-lite-landing-brand-copy ccxp-lite-sidebar-brand-copy",
        "ccxp-lite-sidebar-brand-title",
        strings.sidebarTitle,
      ),
    );
    brandSection.appendChild(brandLockup);

    const repoMark = targetDocument.createElement("span");
    repoMark.className = "ccxp-lite-landing-brand-partner-mark";
    repoMark.appendChild(createLandingBrandCloseIcon(targetDocument));
    brandSection.appendChild(repoMark);

    const repoLink = targetDocument.createElement("button");
    repoLink.type = "button";
    repoLink.className = "ccxp-lite-landing-brand-partner-link";
    repoLink.setAttribute("aria-label", strings.sidebarGitHubLink);
    repoLink.setAttribute("title", strings.sidebarGitHubLink);

    const repoLabel = targetDocument.createElement("span");
    repoLabel.className = "ccxp-lite-landing-brand-partner-label";
    repoLabel.textContent = strings.sidebarGitHubLink;
    repoLink.appendChild(repoLabel);
    brandSection.appendChild(repoLink);

    if (languageLinks) {
      langSection.appendChild(languageLinks);
    }

    repoLink.addEventListener("click", () => {
      window.open("https://github.com/Hsiii/ccxpLite", "_blank", "noopener,noreferrer");
    });

    const loginHeaderLabel = targetDocument.createElement("h1");
    loginHeaderLabel.className = "ccxp-lite-landing-login-label";
    loginHeaderLabel.textContent = strings.loginTitle;
    loginSection.appendChild(loginHeaderLabel);

    if (loginForm) {
      loginSection.appendChild(loginForm);
    } else {
      moveChildNodes(loginSourceCell, loginSection);
    }

    normalizeLoginFormLayout(loginSection);
    removeLoginResetControls(loginSection);
    forceCaptchaLabelDisplay(loginSection);
    replaceLoginFormImageButtons(targetDocument, loginSection);
    wrapPrimaryLoginButtons(targetDocument, loginSection);
    removeLoginSpacingArtifacts(targetDocument, loginSection);
    alignCaptchaMediaRow(targetDocument, loginSection);
    enhancePasswordVisibilityToggle(targetDocument, loginSection);
    const captchaAutofillState = getOrCreateCaptchaAutofillState(targetDocument, loginSection);

    removeNode(findCalendarTable(loginSection));
    removeNode(loginSection.querySelector("#twcaseal")?.closest("table"));

    collapseLegacyThreeColumnRows(targetDocument.body);

    headerSection.appendChild(brandSection);
    if (languageLinks) {
      headerSection.appendChild(langSection);
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
        headerSection.appendChild(utilityHeaderLinks);
      }
    }

    if (utilityLinks) {
      collapseLegacyUtilityRow(utilityLinks);
      removeNode(utilityLinks);
    }

    topSection.appendChild(headerSection);
    topSection.appendChild(loginSection);
    shell.appendChild(topSection);

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
      tabsHeader.appendChild(tabNavigation);

      if (supportLinks) {
        tabsHeader.appendChild(supportLinks);
      }

      tabsSection.appendChild(tabsHeader);
      tabContents.forEach((tabContent) => {
        collapseLegacyThreeColumnRows(tabContent);
        tabsSection.appendChild(tabContent);
      });

      wireLandingTabs(targetDocument, tabNavigation, tabContents, strings);
      shell.appendChild(tabsSection);
    } else if (supportLinks) {
      const supportSection = createLandingSection(targetDocument, "ccxp-lite-landing-support-only");
      supportSection.appendChild(supportLinks);
      shell.appendChild(supportSection);
    }

    if (announcementTable) {
      prepareAnnouncementTable(announcementTable, strings);
      noticesSection.appendChild(announcementTable);
      shell.appendChild(noticesSection);
    }

    cleanLegacyAttributes(shell);
    cleanLegacyAttributes(targetDocument);
    targetDocument.body.replaceChildren(shell);

    // Force style override on body as a last resort
    targetDocument.body.style.setProperty("background-image", "none", "important");
    targetDocument.body.style.setProperty("background-color", "var(--ccxp-lite-bg)", "important");
    enableLoginCaptchaAutofill(targetDocument, loginSection, captchaAutofillState);
    restoreLoginValidationGuards(targetDocument, loginValidationState);
    targetDocument.body.dataset.ccxpLiteLandingApplied = "true";
    onReady();
  }

  namespace.landingBootstrap = {
    isSupportedInquirePath,
    isLandingPage,
    preloadLandingCaptcha,
    simplifyLandingPage,
  };

  function createLandingBrandCloseIcon(targetDocument) {
    const icon = targetDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("class", "ccxp-lite-sidebar-brand-partner-icon");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "2");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    icon.setAttribute("aria-hidden", "true");

    ["M18 6 6 18", "M6 6l12 12"].forEach((pathData) => {
      const path = targetDocument.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathData);
      icon.appendChild(path);
    });

    return icon;
  }
})(window);
