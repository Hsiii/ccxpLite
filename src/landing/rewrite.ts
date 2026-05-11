(function registerCcxpLiteLandingRewrite(globalScope: typeof globalThis) {
  const runtimeScope = globalScope;
  const namespace = runtimeScope.CCXP_LITE ?? {};
  const { shared } = namespace;
  const { landingValidation, landingCaptcha, landingTabs, landingSupport, landingLogin } =
    namespace;
  if (
    !shared ||
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
    createBrandImage,
    createBrandCopy,
    createBrandPartnerLink,
    moveChildNodes,
    removeNode,
  } = shared;
  const { captureLoginValidationState } = landingValidation;
  const { getOrCreateCaptchaAutofillState } = landingCaptcha;
  const { createLandingSection, wireLandingTabs } = landingTabs;
  const {
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

  function rewriteLandingSurface(
    targetDocument: Document,
    identifiedSurface: CcxpLiteLandingIdentifyResult,
  ) {
    const {
      loginForm,
      loginSourceCell,
      tabNavigation,
      tabContents,
      languageLinks,
      announcementTable,
      utilityLinks,
      cannotLoginLink,
      serviceLink,
      strings,
    } = identifiedSurface;
    const loginValidationState = captureLoginValidationState(targetDocument);
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
      window.open("https://github.com/NTHU-SA/ccxpLite", "_blank", "noopener,noreferrer");
    });

    const loginHeaderLabel = targetDocument.createElement("h1");
    loginHeaderLabel.className = "ccxp-lite-landing-login-label";
    loginHeaderLabel.textContent = strings.loginTitle;
    loginSection.append(loginHeaderLabel);

    if (loginForm) {
      loginSection.append(loginForm);
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

    const captchaAutofillState = getOrCreateCaptchaAutofillState(
      targetDocument,
      loginSection as ParentNode,
    );

    removeNode(findCalendarTable(loginSection));
    removeNode(loginSection.querySelector("#twcaseal")?.closest("table") ?? undefined);
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
        langSection.before(utilityHeaderLinks);
      } else {
        headerSection.append(utilityHeaderLinks);
      }
    }

    if (utilityLinks) {
      collapseLegacyUtilityRow(utilityLinks);
      removeNode(utilityLinks);
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
      for (const tabContent of tabContents) {
        collapseLegacyThreeColumnRows(tabContent);
        tabsSection.append(tabContent);
      }
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

    return {
      shell,
      loginSection,
      loginValidationState,
      captchaAutofillState,
    };
  }

  namespace.landingRewrite = {
    rewriteLandingSurface,
  };
})(globalThis);
