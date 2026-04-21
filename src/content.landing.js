(function registerCcxpLiteLanding(globalScope) {
  const namespace = globalScope.CCXP_LITE || (globalScope.CCXP_LITE = {});
  const { shared } = namespace;
  const { TOKENS, ASSETS, ensureThemeDocument, getLocalizedStrings, createBrandImage, createBrandCopy, moveChildNodes, removeNode, isDocumentComplete } = shared;
  const CAPTCHA_SERVER_URL = "https://nthu-ccxp-captcha.vercel.app/api/decaptcha";
  const CAPTCHA_SERVER_ORIGIN = new URL(CAPTCHA_SERVER_URL).origin;
  const CAPTCHA_AUTOFILL_TIMEOUT_MS = 5000;
  const captchaAutofillStateByDocument = new WeakMap();

  function isSupportedInquirePath(targetDocument) {
    const pathName = ((targetDocument.location && targetDocument.location.pathname) || "").toLowerCase();
    return /\/ccxp\/inquire\/(?:index\.php)?\/?$/.test(pathName);
  }

  function isLandingPage(targetDocument) {
    if (!isSupportedInquirePath(targetDocument)) {
      return false;
    }

    return Boolean(getLoginForm(targetDocument) || hasLandingTabContent(targetDocument));
  }

  function preloadLandingCaptcha(targetDocument) {
    if (!isLandingPage(targetDocument)) {
      return;
    }

    ensureCaptchaPreconnect(targetDocument);
    getOrCreateCaptchaAutofillState(targetDocument, targetDocument);
  }

  function hasLandingTabContent(targetDocument) {
    return Boolean(targetDocument.querySelector(".tab, .tabcontent"));
  }

  function resolveLandingLocale(targetDocument, languageLinks, loginSourceCell, loginForm) {
    const htmlLang = ((targetDocument.documentElement && targetDocument.documentElement.lang) || "").toLowerCase();
    if (htmlLang.startsWith("en")) {
      return "en";
    }

    if (htmlLang.startsWith("zh")) {
      return "zh";
    }

    const search = ((targetDocument.location && targetDocument.location.search) || "").toLowerCase();
    const langMatch = search.match(/[?&]lang=([^&]+)/);
    if (langMatch) {
      const langValue = decodeURIComponent(langMatch[1]);
      if (/en/.test(langValue)) {
        return "en";
      }
      if (/(zh|cht|chs|tw|cn)/.test(langValue)) {
        return "zh";
      }
    }

    if (languageLinks) {
      const currentLangNode = languageLinks.querySelector(".active, .current, .selected, [aria-current='page'], strong, b");
      if (currentLangNode) {
        const currentLangText = (currentLangNode.textContent || "").toLowerCase();
        if (/english/.test(currentLangText)) {
          return "en";
        }
        if (/中文|chinese/.test(currentLangText)) {
          return "zh";
        }
      }
    }

    const formInputTextSample = loginForm
      ? Array.from(loginForm.querySelectorAll("input, select, textarea, button"))
        .map((node) => [
          node.getAttribute("placeholder") || "",
          node.getAttribute("value") || "",
          node.getAttribute("title") || "",
          node.getAttribute("aria-label") || "",
          node.getAttribute("name") || ""
        ].join(" "))
        .join(" ")
      : "";

    const loginTextSample = [
      loginForm && loginForm.textContent,
      loginSourceCell && loginSourceCell.textContent,
      formInputTextSample
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const localePairs = [
      { zh: ["帳號", "學號"], en: ["account", "username", "user id", "student id"] },
      { zh: ["密碼"], en: ["password"] },
      { zh: ["驗證碼"], en: ["captcha", "verification code", "security code"] }
    ];

    let zhHits = 0;
    let enHits = 0;
    localePairs.forEach((pair) => {
      if (pair.zh.some((token) => loginTextSample.includes(token))) {
        zhHits += 1;
      }
      if (pair.en.some((token) => loginTextSample.includes(token))) {
        enHits += 1;
      }
    });

    if (zhHits > enHits) {
      return "zh";
    }

    if (enHits > zhHits) {
      return "en";
    }

    const sampleText = ((loginSourceCell && loginSourceCell.textContent) || "").trim();
    return /[\u3400-\u9fff]/.test(sampleText) ? "zh" : "en";
  }

  function getLoginForm(targetDocument) {
    const forms = Array.from(targetDocument.querySelectorAll("form"));

    const candidates = forms.filter((form) => {
      const action = (form.getAttribute("action") || "").toLowerCase();
      const hasKnownAction = action.includes("pre_select_entry.php") || action.includes("select_entry.php");
      const hasPasswordField = Boolean(form.querySelector("input[type='password'], input[name='passwd'], input[name='passwd2']"));
      const hasAccountLikeField = Boolean(form.querySelector("input[name='account'], input[name='id'], input[type='text']"));
      const hasCredentials = Boolean(form.querySelector("input[name='account']"))
        && Boolean(form.querySelector("input[name='passwd'], input[name='passwd2']"));
      return hasKnownAction || hasCredentials || (hasPasswordField && hasAccountLikeField);
    });

    if (candidates.length === 0) {
      return null;
    }

    const visibleCandidates = candidates.filter((form) => isLikelyVisibleForm(form));
    if (visibleCandidates.length > 0) {
      return visibleCandidates[0];
    }

    return candidates[0];
  }

  function isLikelyVisibleForm(formNode) {
    if (!formNode) {
      return false;
    }

    if (formNode.hidden) {
      return false;
    }

    let node = formNode;
    while (node && node !== document.body) {
      if (node.nodeType !== Node.ELEMENT_NODE) {
        node = node.parentElement;
        continue;
      }

      const style = window.getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden") {
        return false;
      }

      node = node.parentElement;
    }

    const rect = formNode.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function simplifyLandingPage(targetDocument, options = {}) {
    const retryFn = typeof options.retry === "function" ? options.retry : () => {};
    const onReady = typeof options.onReady === "function" ? options.onReady : () => {};

    if (!targetDocument.body || !targetDocument.head) {
      retryFn();
      return;
    }

    if (targetDocument.body.dataset.ccxpLiteLandingApplied === "true") {
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
    const brandSection = createLandingSection(targetDocument, "ccxp-lite-landing-brand");
    const langSection = createLandingSection(targetDocument, "ccxp-lite-landing-lang");
    const loginSection = createLandingSection(targetDocument, "ccxp-lite-landing-login");
    const tabsSection = createLandingSection(targetDocument, "ccxp-lite-landing-tabs");
    const noticesSection = createLandingSection(targetDocument, "ccxp-lite-landing-notices");

    brandSection.appendChild(createBrandImage(targetDocument, "ccxp-lite-landing-brand-logo ccxp-lite-sidebar-brand-logo", ASSETS.sidebarBrandLogoPath));
    brandSection.appendChild(
      createBrandCopy(
        targetDocument,
        "ccxp-lite-landing-brand-copy ccxp-lite-sidebar-brand-copy",
        "ccxp-lite-sidebar-brand-title",
        strings.sidebarTitle
      )
    );

    if (languageLinks) {
      langSection.appendChild(languageLinks);
    }

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

    const utilityHeaderLinks = buildHeaderUtilityLinks(targetDocument, utilityLinks, cannotLoginLink, strings);
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

    const supportLinks = buildLandingSupportLinks(targetDocument, serviceLink, cannotLoginLink, strings);
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

    targetDocument.body.replaceChildren(shell);
    enableLoginCaptchaAutofill(targetDocument, loginSection, captchaAutofillState);
    restoreLoginValidationGuards(targetDocument, loginValidationState);
    targetDocument.body.dataset.ccxpLiteLandingApplied = "true";
    onReady();
  }

  function captureLoginValidationState(targetDocument) {
    const fnstrField = targetDocument.querySelector("input[name='fnstr']");
    const rawFnstr = fnstrField ? fnstrField.value : "";
    const match = rawFnstr.match(/^(\d{8})-(\d+)$/);

    if (!match) {
      return { startedAt: Date.now() };
    }

    const dayPart = match[1];
    const seedPart = match[2];

    return {
      startedAt: Date.now(),
      fnstrDate: dayPart,
      fnstrSeed: seedPart
    };
  }

  function restoreLoginValidationGuards(targetDocument, state) {
    const fields = ["account", "passwd", "passwd2"]
      .map((name) => targetDocument.querySelector(`input[name='${name}']`))
      .filter(Boolean);

    if (fields.length === 0) {
      return;
    }

    const form = getLoginForm(targetDocument);
    if (!form || form.dataset.ccxpLiteValidationBound === "true") {
      return;
    }

    const startedAt = Number(state && state.startedAt) || Date.now();
    const onFieldActivity = () => {
      if (Date.now() - startedAt > 30 * 60 * 1000) {
        targetDocument.location.reload();
      }
    };

    ["click", "change", "keydown"].forEach((eventName) => {
      fields.forEach((field) => {
        field.addEventListener(eventName, onFieldActivity);
      });
    });

    form.addEventListener("submit", () => {
      ensureLoginSubmissionPayload(form, targetDocument);
    });

    form.dataset.ccxpLiteValidationBound = "true";
  }

  function ensureLoginSubmissionPayload(form, targetDocument) {
    if (!form) {
      return;
    }

    const authImage = form.querySelector("img[src*='auth_img.php?pwdstr=']");
    const tokenFromImage = extractPwdstrFromImage(authImage, targetDocument);
    let fnstrField = form.querySelector("input[name='fnstr']");

    if (!fnstrField && tokenFromImage) {
      fnstrField = targetDocument.createElement("input");
      fnstrField.type = "hidden";
      fnstrField.name = "fnstr";
      form.appendChild(fnstrField);
    }

    if (fnstrField && tokenFromImage && fnstrField.value !== tokenFromImage) {
      fnstrField.value = tokenFromImage;
    }
  }

  function enableLoginCaptchaAutofill(targetDocument, rootNode, existingState) {
    const form = getLoginForm(targetDocument);
    const state = existingState || getOrCreateCaptchaAutofillState(targetDocument, rootNode);
    if (!form || form.dataset.ccxpLiteCaptchaAutofillBound === "true" || !state) {
      return;
    }

    const { input: captchaInput, image: captchaImage } = state;

    const triggerAutofill = () => {
      autofillCaptchaInput(targetDocument, captchaImage, captchaInput, state);
    };

    captchaImage.addEventListener("load", triggerAutofill);

    const observer = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => mutation.attributeName === "src")) {
        triggerAutofill();
      }
    });
    observer.observe(captchaImage, {
      attributes: true,
      attributeFilter: ["src"]
    });

    triggerAutofill();
    window.requestAnimationFrame(triggerAutofill);
    window.setTimeout(triggerAutofill, 0);

    form.dataset.ccxpLiteCaptchaAutofillBound = "true";
  }

  function getOrCreateCaptchaAutofillState(targetDocument, rootNode) {
    const existingState = captchaAutofillStateByDocument.get(targetDocument);
    if (existingState) {
      syncCaptchaAutofillState(targetDocument, existingState, rootNode);
      return existingState;
    }

    const captchaField = resolveCaptchaField(rootNode);
    if (!captchaField) {
      return null;
    }

    const state = {
      ...captchaField,
      lastRequestedSrc: "",
      requestToken: 0,
      pendingRequest: null,
      pendingSrc: "",
      failedSrc: "",
      cachedAnswer: "",
      cachedSrc: ""
    };

    captchaAutofillStateByDocument.set(targetDocument, state);
    primeCaptchaAutofill(targetDocument, state);
    return state;
  }

  function syncCaptchaAutofillState(targetDocument, state, rootNode) {
    const latestField = resolveCaptchaField(rootNode);
    if (!latestField) {
      return state;
    }

    state.input = latestField.input;
    state.image = latestField.image;
    primeCaptchaAutofill(targetDocument, state);
    return state;
  }

  function resolveCaptchaField(rootNode) {
    const input = rootNode.querySelector("input[name='passwd2']");
    if (!input) {
      return null;
    }

    const scope = input.closest(".ccxp-lite-login-field, .ccxp-lite-login-inline-field") || rootNode;
    const mediaRow = scope.querySelector(".ccxp-lite-captcha-media-row")
      || rootNode.querySelector(".ccxp-lite-captcha-media-row");
    const image = scope.querySelector(".ccxp-lite-captcha-media-row > img, .ccxp-lite-captcha-image-shell > img, img[src*='auth_img.php']")
      || rootNode.querySelector(".ccxp-lite-captcha-media-row > img, .ccxp-lite-captcha-image-shell > img, img[src*='auth_img.php']");

    if (!image || !mediaRow) {
      return null;
    }

    return { input, image, mediaRow, scope };
  }

  function setCaptchaLoadingState(state, isLoading) {
    if (!state) {
      return;
    }

    if (state.input) {
      state.input.setAttribute("aria-busy", isLoading ? "true" : "false");
      if (isLoading) {
        clearCaptchaTimeoutFlash(state);
      }
    }
  }

  function clearCaptchaTimeoutFlash(state) {
    if (!state?.input) {
      return;
    }

    if (state.timeoutFlashTimer) {
      window.clearTimeout(state.timeoutFlashTimer);
      state.timeoutFlashTimer = null;
    }

    state.input.removeAttribute("data-timeout-flash");
  }

  function flashCaptchaTimeout(state) {
    if (!state?.input) {
      return;
    }

    clearCaptchaTimeoutFlash(state);
    void state.input.offsetWidth;
    state.input.setAttribute("data-timeout-flash", "true");
    state.timeoutFlashTimer = window.setTimeout(() => {
      if (!state.input) {
        return;
      }

      state.input.removeAttribute("data-timeout-flash");
      state.timeoutFlashTimer = null;
    }, 1600);
  }

  function autofillCaptchaInput(targetDocument, captchaImage, captchaInput, state) {
    const captchaSrc = getCaptchaRequestSource(captchaImage, targetDocument);
    if (!captchaSrc || state.lastRequestedSrc === captchaSrc || state.failedSrc === captchaSrc) {
      return;
    }

    state.lastRequestedSrc = captchaSrc;
    state.requestToken += 1;
    const requestToken = state.requestToken;
    setCaptchaLoadingState(state, true);

    requestCaptchaAnswerForCurrentImage(targetDocument, captchaImage, state, captchaSrc)
      .then((answer) => {
        if (requestToken !== state.requestToken || !answer) {
          return;
        }

        captchaInput.value = answer;
        captchaInput.dispatchEvent(new Event("input", { bubbles: true }));
        captchaInput.dispatchEvent(new Event("change", { bubbles: true }));
        state.failedSrc = "";
        setCaptchaLoadingState(state, false);
      })
      .catch((error) => {
        if (requestToken === state.requestToken) {
          fallbackToManualCaptchaEntry(state, captchaSrc, { didTimeout: isCaptchaTimeoutError(error) });
        }
      });
  }

  function primeCaptchaAutofill(targetDocument, state) {
    if (!state || !state.image) {
      return;
    }

    const captchaSrc = getCaptchaRequestSource(state.image, targetDocument);
    if (!captchaSrc) {
      return;
    }

    setCaptchaLoadingState(state, true);
    requestCaptchaAnswerForCurrentImage(targetDocument, state.image, state, captchaSrc)
      .catch((error) => {
        fallbackToManualCaptchaEntry(state, captchaSrc, { didTimeout: isCaptchaTimeoutError(error) });
      });
  }

  function fallbackToManualCaptchaEntry(state, captchaSrc, options = {}) {
    if (!state) {
      return;
    }

    state.lastRequestedSrc = "";
    state.failedSrc = captchaSrc || "";
    state.requestToken += 1;
    setCaptchaLoadingState(state, false);

    if (state.input) {
      state.input.removeAttribute("aria-busy");
    }

    if (options.didTimeout) {
      flashCaptchaTimeout(state);
    }
  }

  function ensureCaptchaPreconnect(targetDocument) {
    if (!targetDocument || !targetDocument.head) {
      return;
    }

    const origins = [CAPTCHA_SERVER_ORIGIN, targetDocument.location?.origin].filter(Boolean);
    origins.forEach((origin) => {
      if (targetDocument.head.querySelector(`link[rel='preconnect'][href='${origin}']`)) {
        return;
      }

      const link = targetDocument.createElement("link");
      link.rel = "preconnect";
      link.href = origin;
      link.crossOrigin = "anonymous";
      targetDocument.head.appendChild(link);
    });
  }

  function requestCaptchaAnswerForCurrentImage(targetDocument, captchaImage, state, captchaSrc) {
    if (state.cachedSrc === captchaSrc && state.cachedAnswer) {
      return Promise.resolve(state.cachedAnswer);
    }

    if (state.pendingSrc === captchaSrc && state.pendingRequest) {
      return state.pendingRequest;
    }

    const request = downloadCaptchaImageBytes(targetDocument, captchaSrc)
      .then((imageBytes) => requestCaptchaAnswer(captchaSrc, imageBytes))
      .then((answer) => {
        if (answer) {
          state.cachedSrc = captchaSrc;
          state.cachedAnswer = answer;
        }

        return answer;
      })
      .finally(() => {
        if (state.pendingSrc === captchaSrc) {
          state.pendingSrc = "";
          state.pendingRequest = null;
        }
      });

    state.pendingSrc = captchaSrc;
    state.pendingRequest = request;
    return request;
  }

  function getCaptchaRequestSource(captchaImage, targetDocument) {
    const rawSource = String(captchaImage?.getAttribute("src") || "").trim();
    if (!rawSource) {
      return "";
    }

    try {
      const parsed = new URL(rawSource, targetDocument.location && targetDocument.location.href ? targetDocument.location.href : window.location.href);
      const pathSegments = parsed.pathname.split("/").filter(Boolean);
      const fileName = pathSegments[pathSegments.length - 1] || "";
      return `${fileName}${parsed.search}`;
    } catch (_error) {
      const trimmedSource = rawSource.replace(/^https?:\/\/[^/]+\//i, "");
      const sourceSegments = trimmedSource.split("/").filter(Boolean);
      return sourceSegments[sourceSegments.length - 1] || "";
    }
  }

  function downloadCaptchaImageBytes(targetDocument, captchaSrc) {
    const captchaUrl = new URL(captchaSrc, targetDocument.location && targetDocument.location.href ? targetDocument.location.href : window.location.href);

    return fetchWithTimeout(captchaUrl.toString(), { credentials: "include" }, CAPTCHA_AUTOFILL_TIMEOUT_MS)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`captcha-download-failed:${response.status}`);
        }

        return response.arrayBuffer();
      });
  }

  function requestCaptchaAnswer(_captchaSrc, imageBytes) {
    return fetchWithTimeout(CAPTCHA_SERVER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream"
      },
      body: imageBytes
    }, CAPTCHA_AUTOFILL_TIMEOUT_MS)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`captcha-decode-failed:${response.status}`);
        }

        return response.json();
      })
      .then((json) => String(json?.answer || "").trim());
  }

  function isCaptchaTimeoutError(error) {
    return Boolean(
      error
      && (
        error.name === "AbortError"
        || error.name === "TimeoutError"
        || error.code === "CAPTCHA_TIMEOUT"
      )
    );
  }

  function fetchWithTimeout(resource, options = {}, timeoutMs = CAPTCHA_AUTOFILL_TIMEOUT_MS) {
    const controller = new AbortController();
    let didTimeout = false;
    const timerId = window.setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, timeoutMs);

    return fetch(resource, {
      ...options,
      signal: controller.signal
    }).catch((error) => {
      if (didTimeout && error?.name === "AbortError") {
        const timeoutError = new Error("captcha-timeout");
        timeoutError.name = "TimeoutError";
        timeoutError.code = "CAPTCHA_TIMEOUT";
        throw timeoutError;
      }

      throw error;
    }).finally(() => {
      window.clearTimeout(timerId);
    });
  }

  function extractPwdstrFromImage(imageNode, targetDocument) {
    if (!imageNode) {
      return "";
    }

    const rawSrc = imageNode.getAttribute("src") || "";

    try {
      const parsed = new URL(rawSrc, targetDocument.location && targetDocument.location.href ? targetDocument.location.href : window.location.href);
      return parsed.searchParams.get("pwdstr") || "";
    } catch (_error) {
      const match = rawSrc.match(/[?&]pwdstr=([^&]+)/i);
      return match ? decodeURIComponent(match[1]) : "";
    }
  }

  function createLandingSection(targetDocument, className) {
    const section = targetDocument.createElement("section");
    section.className = `ccxp-lite-landing-section ${className}`;
    return section;
  }

  function wireLandingTabs(targetDocument, tabNavigation, tabContents, strings = getLocalizedStrings("zh")) {
    if (!tabNavigation || !Array.isArray(tabContents) || tabContents.length === 0) {
      return;
    }

    const tabButtons = Array.from(tabNavigation.querySelectorAll("button, a[href^='#'], [role='tab']"));
    if (tabButtons.length === 0) {
      return;
    }

    const tabPanels = tabContents.map((panel, index) => {
      panel.id = panel.id || `ccxp-lite-tabpanel-${index + 1}`;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("tabindex", "0");
      return panel;
    });

    const resolvePanelByLegacyTarget = (button) => {
      const directControl = button.getAttribute("aria-controls");
      if (directControl) {
        return tabPanels.find((panel) => panel.id === directControl) || null;
      }

      const href = String(button.getAttribute("href") || "").trim();
      if (href.startsWith("#")) {
        const hashId = href.slice(1);
        const fromHash = tabPanels.find((panel) => panel.id === hashId);
        if (fromHash) {
          return fromHash;
        }
      }

      const legacyTarget = extractLegacyTabTarget(button);
      if (!legacyTarget) {
        return null;
      }

      return tabPanels.find((panel) => panel.id === legacyTarget) || null;
    };

    const buttonPanelMap = tabButtons.map((button, index) => {
      const panel = resolvePanelByLegacyTarget(button) || tabPanels[index] || null;
      return { button, panel };
    }).filter((entry) => Boolean(entry.panel));

    if (buttonPanelMap.length === 0) {
      return;
    }

    structureLandingTabNavigation(targetDocument, tabNavigation, buttonPanelMap);

    tabNavigation.setAttribute("role", "tablist");
    tabNavigation.setAttribute("aria-label", strings.portalSectionsLabel);

    const uniquePanels = Array.from(new Set(buttonPanelMap.map((entry) => entry.panel)));

    buttonPanelMap.forEach((entry, index) => {
      const { button, panel } = entry;
      const tabId = button.id || `ccxp-lite-tab-${index + 1}`;
      button.id = tabId;
      applyTabPanelSemanticClass(button, panel);
      button.setAttribute("role", "tab");
      button.setAttribute("aria-controls", panel.id);
      button.setAttribute("aria-selected", "false");
      button.setAttribute("tabindex", "-1");
      if (button.tagName === "BUTTON") {
        button.type = "button";
      }

      panel.setAttribute("aria-labelledby", tabId);
      panel.hidden = true;
      panel.style.display = "none";
    });

    uniquePanels.forEach((panel) => {
      panel.hidden = true;
      panel.style.display = "none";
    });

    const getActiveIndex = () => {
      const byButtonClass = buttonPanelMap.findIndex(({ button }) => button.classList.contains("active"));
      if (byButtonClass >= 0) {
        return byButtonClass;
      }

      const byPanelVisibility = buttonPanelMap.findIndex(({ panel }) => panel.style.display !== "none" && !panel.hidden);
      if (byPanelVisibility >= 0) {
        return byPanelVisibility;
      }

      return 0;
    };

    const activateTabAt = (targetIndex, options = {}) => {
      const safeIndex = Math.max(0, Math.min(targetIndex, buttonPanelMap.length - 1));

      buttonPanelMap.forEach((entry, index) => {
        const isActive = index === safeIndex;
        entry.button.classList.toggle("active", isActive);
        entry.button.setAttribute("aria-selected", isActive ? "true" : "false");
        entry.button.setAttribute("tabindex", isActive ? "0" : "-1");
        entry.panel.hidden = !isActive;
        entry.panel.style.display = isActive ? "block" : "none";
      });

      if (options.focusButton) {
        buttonPanelMap[safeIndex].button.focus();
      }
    };

    buttonPanelMap.forEach((entry, index) => {
      const { button } = entry;

      button.addEventListener("click", (event) => {
        event.preventDefault();
        activateTabAt(index);
      });

      button.addEventListener("keydown", (event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          activateTabAt((index + 1) % buttonPanelMap.length, { focusButton: true });
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          activateTabAt((index - 1 + buttonPanelMap.length) % buttonPanelMap.length, { focusButton: true });
        } else if (event.key === "Home") {
          event.preventDefault();
          activateTabAt(0, { focusButton: true });
        } else if (event.key === "End") {
          event.preventDefault();
          activateTabAt(buttonPanelMap.length - 1, { focusButton: true });
        }
      });
    });

    activateTabAt(getActiveIndex());
  }

  function structureLandingTabNavigation(targetDocument, tabNavigation, buttonPanelMap) {
    if (!targetDocument || !tabNavigation || !Array.isArray(buttonPanelMap) || buttonPanelMap.length === 0) {
      return;
    }

    const fragment = targetDocument.createDocumentFragment();

    buttonPanelMap.forEach((entry, index) => {
      const item = targetDocument.createElement("span");
      item.className = "ccxp-lite-tab-item";

      if (index > 0) {
        const divider = targetDocument.createElement("span");
        divider.className = "ccxp-lite-tab-divider";
        divider.setAttribute("aria-hidden", "true");
        item.appendChild(divider);
      }

      item.appendChild(entry.button);
      fragment.appendChild(item);
    });

    tabNavigation.replaceChildren(fragment);
  }

  function applyTabPanelSemanticClass(button, panel) {
    if (!button || !panel) {
      return;
    }

    const label = String(button.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
    if (/(學生|校友|student|alumni)/i.test(label)) {
      panel.classList.add("ccxp-lite-student-alumni-panel");
    }
  }

  function extractLegacyTabTarget(button) {
    const onclickValue = String(button.getAttribute("onclick") || "");
    const targetMatch = onclickValue.match(/['\"]([^'\"]+)['\"]/);
    return targetMatch ? targetMatch[1] : "";
  }

  function findLoginSourceCell(targetDocument, loginForm) {
    if (loginForm) {
      return loginForm.closest("td, table, section, article") || loginForm;
    }

    return Array.from(targetDocument.querySelectorAll("td, table, div, section, article"))
      .find((cell) => cell.querySelector("form"));
  }

  function findCalendarTable(targetNode) {
    const calendarFrame = targetNode.querySelector("iframe[src*='calendar/cal.php']");
    if (!calendarFrame) {
      return null;
    }

    return Array.from(targetNode.querySelectorAll("table"))
      .find((table) => table.contains(calendarFrame) && ["月曆", "Calendar"].some((text) => table.textContent.includes(text)));
  }

  function findAnnouncementTable(targetDocument) {
    const rightPanel = Array.from(targetDocument.querySelectorAll("td"))
      .find((cell) => {
        const widthText = normalizeLegacyWidth(cell.getAttribute("width") || cell.style.width);
        if (widthText !== "35%" && widthText !== "35") {
          return false;
        }

        return Boolean(cell.querySelector(".board_item, .board_subject"));
      });

    const panelTables = rightPanel ? Array.from(rightPanel.querySelectorAll("table")) : [];
    const fallbackTables = Array.from(targetDocument.querySelectorAll("table"));

    const isAnnouncementTable = (table) => {
      const rows = Array.from(table.rows || []);
      if (rows.length === 0) {
        return false;
      }

      const headingCell = rows
        .flatMap((row) => Array.from(row.cells || []))
        .find((cell) => cell.classList.contains("board_item"));

      const headingText = normalizeAnnouncementHeading(headingCell && headingCell.textContent);
      const hasNoticeHeading = headingText.includes("系統公告") || headingText.includes("system notice");

      if (!hasNoticeHeading) {
        return false;
      }

      const boardHeaderRow = rows.find((row) => {
        const cells = Array.from(row.cells || []);
        return cells.filter((cell) => cell.classList.contains("board_subject")).length >= 2;
      });

      if (!boardHeaderRow) {
        return false;
      }

      const dateRows = rows.filter((row) => {
        const cells = Array.from(row.cells || []);
        if (cells.length < 2) {
          return false;
        }

        const firstCell = cells[0];
        const secondCell = cells[1];
        const firstClass = firstCell.classList;
        const secondClass = secondCell.classList;
        const isBoardPair = (firstClass.contains("board_0") && secondClass.contains("board_0"))
          || (firstClass.contains("board_1") && secondClass.contains("board_1"));

        if (!isBoardPair) {
          return false;
        }

        const rawDate = String(firstCell.textContent || "").replace(/\s+/g, "").trim();
        if (!/^\d{4}\/\d{2}\/\d{2}$/.test(rawDate)) {
          return false;
        }

        const topicText = String(secondCell.textContent || "").replace(/\s+/g, " ").trim();
        return topicText.length > 8;
      });

      return dateRows.length >= 3;
    };

    const preferred = panelTables.find((table) => {
      if (table.closest(".tabcontent")) {
        return false;
      }

      return isAnnouncementTable(table);
    });

    if (preferred) {
      return preferred;
    }

    return fallbackTables.find((table) => isAnnouncementTable(table)) || null;
  }

  function normalizeAnnouncementHeading(rawText) {
    return String(rawText || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function prepareAnnouncementTable(table, strings = getLocalizedStrings("zh")) {
    if (!table || table.dataset.ccxpLiteAnnouncementPrepared === "true") {
      return;
    }

    table.classList.add("ccxp-lite-announcement-table");

    const rows = Array.from(table.rows || []);
    rows.forEach((row) => {
      const cells = Array.from(row.cells || []);
      if (cells.length === 0) {
        return;
      }

      const hasOnlyDecorativeCells = cells.every((cell) => {
        const hasBgColor = String(cell.getAttribute("bgcolor") || "").trim().length > 0;
        const text = String(cell.textContent || "").replace(/\s+/g, "").trim();
        return hasBgColor && text.length === 0;
      });

      const hasOnlyEmptySpacerCells = cells.every((cell) => {
        const text = String(cell.textContent || "").replace(/\s+/g, "").trim();
        if (text.length > 0) {
          return false;
        }

        return !cell.querySelector("img, iframe, table, form, input, button, a, ul, ol, p");
      });

      const hasLegacySpacerHeight = String(row.getAttribute("height") || "").trim().length > 0
        || cells.some((cell) => String(cell.getAttribute("height") || "").trim().length > 0);

      if (hasOnlyDecorativeCells) {
        removeNode(row);
        return;
      }

      if (hasOnlyEmptySpacerCells && hasLegacySpacerHeight) {
        removeNode(row);
      }
    });

    const headerCell = rows
      .flatMap((row) => Array.from(row.cells || []))
      .find((cell) => cell.classList.contains("board_item"));
    const titleText = String(headerCell ? headerCell.textContent : "")
      .replace(/\s+/g, " ")
      .trim();

    const headerRow = rows.find((row) => {
      const cells = Array.from(row.cells || []);
      return cells.filter((cell) => cell.classList.contains("board_subject")).length >= 2;
    });
    if (headerRow) {
      removeNode(headerRow);
    }

    const entries = [];
    rows.forEach((row) => {
      const cells = Array.from(row.cells || []);
      if (cells.length < 2) {
        return;
      }

      const rawDate = String(cells[0].textContent || "").replace(/\s+/g, "").trim();
      if (!/^\d{4}\/\d{2}\/\d{2}$/.test(rawDate)) {
        return;
      }

      const topicCell = cells[1];
      const topicContent = topicCell.cloneNode(true);
      entries.push({
        date: rawDate,
        topicContent
      });
    });

    const tbody = table.tBodies[0] || table.appendChild(table.ownerDocument.createElement("tbody"));
    tbody.replaceChildren();

    const titleRow = table.ownerDocument.createElement("tr");
    titleRow.className = "ccxp-lite-announcement-title-row";
    const titleCell = table.ownerDocument.createElement("td");
    titleCell.className = "ccxp-lite-announcement-title";
    titleCell.textContent = titleText || strings.sidebarCategoryAnnouncementsAndVoting;
    titleRow.appendChild(titleCell);

    const contentRow = table.ownerDocument.createElement("tr");
    contentRow.className = "ccxp-lite-announcement-scroll-row";
    const contentCell = table.ownerDocument.createElement("td");
    contentCell.className = "ccxp-lite-announcement-content-cell";

    const list = table.ownerDocument.createElement("div");
    list.className = "ccxp-lite-announcement-list";

    entries.forEach((entry) => {
      const item = table.ownerDocument.createElement("article");
      item.className = "ccxp-lite-announcement-row";

      const entryRow = table.ownerDocument.createElement("div");
      entryRow.className = "ccxp-lite-announcement-entry";

      const body = table.ownerDocument.createElement("div");
      body.className = "ccxp-lite-announcement-topic";
      while (entry.topicContent.firstChild) {
        body.appendChild(entry.topicContent.firstChild);
      }

      const date = table.ownerDocument.createElement("div");
      date.className = "ccxp-lite-announcement-date";
      date.textContent = entry.date;

      entryRow.appendChild(body);
      entryRow.appendChild(date);
      item.appendChild(entryRow);
      list.appendChild(item);
    });

    contentCell.appendChild(list);
    contentRow.appendChild(contentCell);
    tbody.appendChild(titleRow);
    tbody.appendChild(contentRow);

    table.dataset.ccxpLiteAnnouncementPrepared = "true";
  }

  function findUtilityLinksTable(targetDocument) {
    const anchor = targetDocument.querySelector(
      "a[href*='ccc.site.nthu.edu.tw'], a[href*='aisccc.site.nthu.edu.tw'], a[href*='nthu-en.site.nthu.edu.tw']"
    );
    return anchor ? anchor.closest("table") : null;
  }

  function findServiceLink(targetDocument) {
    const anchor = targetDocument.querySelector("a[href*='inquire_cpr.html']");
    return anchor ? (anchor.closest("div") || anchor) : null;
  }

  function findCannotLoginLink(targetDocument, utilityLinksTable) {
    const isCannotLoginAnchor = (anchor) => {
      if (!anchor) {
        return false;
      }

      const href = String(anchor.getAttribute("href") || "").toLowerCase();
      if (href.includes("inquire_cpr.html") || href.includes("forget.php")) {
        return true;
      }

      return isCannotLoginLabel(anchor.textContent);
    };

    if (!utilityLinksTable) {
      const fallbackAnchor = targetDocument.querySelector("a[href*='forget.php'], a[href*='inquire_cpr.html']");
      return fallbackAnchor && isCannotLoginAnchor(fallbackAnchor) ? fallbackAnchor : null;
    }

    const anchors = Array.from(utilityLinksTable.querySelectorAll("a[href]"));
    const fromUtility = anchors.find((anchor) => isCannotLoginAnchor(anchor));
    if (fromUtility) {
      return fromUtility;
    }

    const fallbackAnchor = targetDocument.querySelector("a[href*='forget.php'], a[href*='inquire_cpr.html']");
    return fallbackAnchor && isCannotLoginAnchor(fallbackAnchor) ? fallbackAnchor : null;
  }

  function isCannotLoginLabel(label) {
    const normalized = String(label || "")
      .replace(/\s+/g, "")
      .toLowerCase();

    return normalized.includes("無法登入")
      || normalized.includes("无法登入")
      || normalized.includes("cannotlogin")
      || normalized.includes("can'tlogin")
      || normalized.includes("cantlogin");
  }

  function buildServicePhoneLink(targetDocument, serviceLinkNode, strings = getLocalizedStrings("zh")) {
    if (!serviceLinkNode) {
      return null;
    }

    const sourceAnchor = serviceLinkNode.matches("a[href]")
      ? serviceLinkNode
      : serviceLinkNode.querySelector("a[href]");

    return buildLandingSupportLink(targetDocument, sourceAnchor, strings.servicePhone);
  }

  function buildCannotLoginLink(targetDocument, sourceAnchor, strings = getLocalizedStrings("zh")) {
    if (!sourceAnchor) {
      return null;
    }

    const sourceLabel = String(sourceAnchor.textContent || "").trim();
    const labelText = isCannotLoginLabel(sourceLabel) ? strings.cannotLogin : (sourceLabel || strings.cannotLogin);
    return buildLandingSupportLink(targetDocument, sourceAnchor, labelText);
  }

  function buildLandingSupportLink(targetDocument, sourceAnchor, labelText) {
    if (!sourceAnchor) {
      return null;
    }

    const anchor = targetDocument.createElement("a");
    anchor.className = "ccxp-lite-landing-service-link";
    anchor.href = sourceAnchor.href;
    anchor.target = sourceAnchor.target || "_blank";
    anchor.rel = "noopener noreferrer";
    copyLegacyAnchorHandlers(sourceAnchor, anchor);

    const label = targetDocument.createElement("span");
    label.textContent = labelText;
    anchor.appendChild(label);
    anchor.appendChild(createLandingExternalLinkIcon(targetDocument));

    return anchor;
  }

  function buildLandingSupportLinks(targetDocument, serviceLinkNode, cannotLoginAnchor, strings = getLocalizedStrings("zh")) {
    const servicePhoneLink = buildServicePhoneLink(targetDocument, serviceLinkNode, strings);
    const cannotLoginLink = buildCannotLoginLink(targetDocument, cannotLoginAnchor, strings);

    if (!servicePhoneLink && !cannotLoginLink) {
      return null;
    }

    const wrap = targetDocument.createElement("div");
    wrap.className = "ccxp-lite-landing-support-links";

    if (servicePhoneLink) {
      wrap.appendChild(servicePhoneLink);
    }

    if (cannotLoginLink) {
      wrap.appendChild(cannotLoginLink);
    }

    return wrap;
  }

  function collapseLegacyServiceRow(serviceLinkNode) {
    if (!serviceLinkNode) {
      return;
    }

    const sourceAnchor = serviceLinkNode.matches("a[href]")
      ? serviceLinkNode
      : serviceLinkNode.querySelector("a[href*='inquire_cpr.html'], a[href]");

    if (!sourceAnchor) {
      return;
    }

    const sourceRow = sourceAnchor.closest("tr");
    if (!sourceRow) {
      removeNode(sourceAnchor.closest("div") || sourceAnchor);
      return;
    }

    const previousRow = sourceRow.previousElementSibling;
    const nextRow = sourceRow.nextElementSibling;

    removeNode(sourceRow);

    if (isLikelySpacerRow(previousRow)) {
      removeNode(previousRow);
    }

    if (isLikelySpacerRow(nextRow)) {
      removeNode(nextRow);
    }
  }

  function collapseLegacyCannotLoginLink(cannotLoginAnchor) {
    if (!cannotLoginAnchor) {
      return;
    }

    const sourceAnchor = cannotLoginAnchor.matches("a[href]")
      ? cannotLoginAnchor
      : cannotLoginAnchor.closest("a[href]");

    if (!sourceAnchor) {
      return;
    }

    removeAdjacentLegacyBreak(sourceAnchor, "previous");
    removeAdjacentLegacyBreak(sourceAnchor, "next");
    removeNode(sourceAnchor);
  }

  function removeAdjacentLegacyBreak(node, direction) {
    const sibling = direction === "previous"
      ? node.previousSibling
      : node.nextSibling;

    if (!sibling) {
      return;
    }

    if (sibling.nodeType === Node.TEXT_NODE) {
      const normalizedText = String(sibling.textContent || "").replace(/\u00a0/g, " ").trim();
      if (normalizedText.length === 0) {
        removeNode(sibling);
      }
      return;
    }

    if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === "BR") {
      removeNode(sibling);
    }
  }

  function buildHeaderUtilityLinks(targetDocument, utilityLinksTable, excludedAnchor, strings = getLocalizedStrings("zh")) {
    if (!utilityLinksTable) {
      return null;
    }

    const excludedHref = excludedAnchor
      ? String(excludedAnchor.getAttribute("href") || "")
      : "";

    const anchors = Array.from(utilityLinksTable.querySelectorAll("a[href]"))
      .filter((anchor) => anchor !== excludedAnchor)
      .filter((anchor) => {
        const href = String(anchor.getAttribute("href") || "");
        return href && href !== excludedHref && !href.toLowerCase().includes("inquire_cpr.html");
      })
      .filter((anchor) => anchor.textContent && anchor.textContent.trim().length > 0)
      .slice(0, 3);

    if (anchors.length === 0) {
      return null;
    }

    const nav = targetDocument.createElement("nav");
    nav.className = "ccxp-lite-landing-utility";
    nav.setAttribute("aria-label", strings.externalLinksLabel);

    anchors.forEach((sourceAnchor, index) => {
      const anchor = targetDocument.createElement("a");
      anchor.href = sourceAnchor.href;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.className = "ccxp-lite-landing-utility-link";
      copyLegacyAnchorHandlers(sourceAnchor, anchor);
      anchor.textContent = sourceAnchor.textContent.trim();
      anchor.appendChild(createLandingExternalLinkIcon(targetDocument));
      nav.appendChild(anchor);

      if (index < anchors.length - 1) {
        const separator = targetDocument.createElement("span");
        separator.className = "ccxp-lite-landing-utility-separator";
        separator.textContent = "|";
        nav.appendChild(separator);
      }
    });

    return nav;
  }

  function copyLegacyAnchorHandlers(sourceAnchor, targetAnchor) {
    if (!sourceAnchor || !targetAnchor) {
      return;
    }

    ["onclick", "onmousedown", "onmouseup", "onmouseover", "onmouseout", "onmouseenter", "onmouseleave", "onkeydown", "onkeyup"].forEach((name) => {
      const value = sourceAnchor.getAttribute(name);
      if (value) {
        targetAnchor.setAttribute(name, value);
      }
    });
  }

  function createLandingExternalLinkIcon(targetDocument) {
    const icon = targetDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("class", "ccxp-lite-landing-link-icon");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "2");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    icon.setAttribute("aria-hidden", "true");

    ["M15 3h6v6", "M10 14 21 3", "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"].forEach((pathData) => {
      const path = targetDocument.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathData);
      icon.appendChild(path);
    });

    return icon;
  }

  function collapseLegacyUtilityRow(utilityLinksTable) {
    if (!utilityLinksTable) {
      return;
    }

    const sourceCell = utilityLinksTable.closest("td");
    if (!sourceCell) {
      return;
    }

    const sourceRow = sourceCell.closest("tr");
    if (!sourceRow) {
      return;
    }

    removeNode(sourceCell);

    const rowCells = Array.from(sourceRow.children).filter((node) => node.tagName === "TD");
    rowCells.forEach((cell) => {
      if (isLegacySpacerCell(cell)) {
        removeNode(cell);
      }
    });

    const remainingCells = Array.from(sourceRow.children).filter((node) => node.tagName === "TD");
    if (remainingCells.length === 1) {
      remainingCells[0].setAttribute("width", "100%");
      remainingCells[0].style.width = "100%";
    }
  }

  function isLikelySpacerRow(row) {
    if (!row || row.tagName !== "TR") {
      return false;
    }

    const cells = Array.from(row.children).filter((node) => node.tagName === "TD");
    if (cells.length === 0) {
      return false;
    }

    const hasInteractiveContent = cells.some((cell) => cell.querySelector("a, button, input, select, textarea, table, iframe"));
    if (hasInteractiveContent) {
      return false;
    }

    const text = cells
      .map((cell) => String(cell.textContent || "").replace(/\u00a0/g, " "))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (text.length > 0) {
      return false;
    }

    const rowHeight = String(row.getAttribute("height") || "").trim();
    const cellHasHeight = cells.some((cell) => String(cell.getAttribute("height") || "").trim().length > 0);

    return rowHeight.length > 0 || cellHasHeight;
  }

  function isLegacySpacerCell(cell) {
    if (!cell) {
      return false;
    }

    const widthText = String(cell.getAttribute("width") || "").trim().toLowerCase();
    const normalizedText = String(cell.textContent || "").replace(/\u00a0/g, " ").trim();

    if ((widthText === "3%" || widthText === "3") && normalizedText.length === 0) {
      return true;
    }

    return normalizedText.length === 0 && cell.querySelector("table, iframe, form, input, button, a") === null;
  }

  function collapseLegacyThreeColumnRows(rootNode) {
    if (!rootNode) {
      return;
    }

    const rows = Array.from(rootNode.querySelectorAll("tr"));

    rows.forEach((row) => {
      if (shouldSkipLegacyRowCollapse(row)) {
        return;
      }

      const cells = Array.from(row.children).filter((node) => node.tagName === "TD");
      if (cells.length < 2) {
        return;
      }

      const leftCell = cells.find((cell) => isLegacyWideLeftCell(cell));
      const rightCell = cells.find((cell) => isLegacyRightPanelCell(cell));

      if (!leftCell || !rightCell) {
        return;
      }

      if (!isLikelyEmptyCell(leftCell)) {
        return;
      }

      const spacerCell = cells.find((cell) => isLegacySpacerCell(cell) || normalizeLegacyWidth(cell.getAttribute("width") || cell.style.width) === "3%");

      removeNode(leftCell);
      removeNode(spacerCell);

      rightCell.removeAttribute("width");
      rightCell.style.width = "100%";
      rightCell.style.minWidth = "0";
      rightCell.colSpan = Math.max(1, Number(rightCell.colSpan || 1));

      Array.from(row.children)
        .filter((node) => node.tagName === "TD")
        .forEach((cell) => {
          if (cell !== rightCell) {
            cell.removeAttribute("width");
          }
        });
    });
  }

  function isLegacyWideLeftCell(cell) {
    if (!cell) {
      return false;
    }

    const widthText = normalizeLegacyWidth(cell.getAttribute("width") || cell.style.width);
    const styleText = String(cell.getAttribute("style") || "").toLowerCase();
    return widthText === "60%" && styleText.includes("min-width") && styleText.includes("30em");
  }

  function isLegacyRightPanelCell(cell) {
    if (!cell) {
      return false;
    }

    const widthText = normalizeLegacyWidth(cell.getAttribute("width") || cell.style.width);
    return widthText === "35%";
  }

  function isLikelyEmptyCell(cell) {
    if (!cell) {
      return false;
    }

    const normalizedText = String(cell.textContent || "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (normalizedText.length > 0) {
      return false;
    }

    return cell.querySelector("img, iframe, form, input, button, select, textarea, a, object, embed, video, audio, table, div, span, ul, ol, p") === null;
  }

  function shouldSkipLegacyRowCollapse(row) {
    if (!row) {
      return true;
    }

    const table = row.closest("table");
    if (!table) {
      return false;
    }

    if (table.classList.contains("ccxp-lite-announcement-table")) {
      return true;
    }

    if (table.querySelector(".board_item, .board_subject, .board_0, .board_1")) {
      return true;
    }

    return false;
  }

  function normalizeLegacyWidth(rawValue) {
    return String(rawValue || "")
      .replace(/\s+/g, "")
      .toLowerCase();
  }

  function enhancePasswordVisibilityToggle(targetDocument, rootNode) {
    const passwordFields = Array.from(rootNode.querySelectorAll("input[name='passwd'], input[type='password']:not([name='passwd2'])"));
    const seen = new Set();
    const strings = getLandingStrings(targetDocument);

    passwordFields.forEach((field) => {
      if (!field || seen.has(field) || field.dataset.ccxpLitePasswordToggle === "true") {
        return;
      }

      seen.add(field);
      field.type = "password";
      removeRedundantPasswordLabelEyeIcon(field);

      const wrapper = targetDocument.createElement("span");
      wrapper.className = "ccxp-lite-password-field";

      if (!field.parentNode) {
        return;
      }

      field.parentNode.insertBefore(wrapper, field);
      wrapper.appendChild(field);

      const toggleButton = targetDocument.createElement("button");
      toggleButton.type = "button";
      toggleButton.className = "ccxp-lite-password-toggle";
      toggleButton.setAttribute("aria-label", strings.showPassword);
      toggleButton.appendChild(createPasswordVisibilityIcon(targetDocument, false));

      toggleButton.addEventListener("click", () => {
        const isHidden = field.type !== "text";
        field.type = isHidden ? "text" : "password";
        toggleButton.setAttribute("aria-label", isHidden ? strings.hidePassword : strings.showPassword);
        toggleButton.replaceChildren(createPasswordVisibilityIcon(targetDocument, isHidden));
      });

      wrapper.appendChild(toggleButton);
      field.dataset.ccxpLitePasswordToggle = "true";
    });
  }

  function removeRedundantPasswordLabelEyeIcon(passwordField) {
    if (!passwordField) {
      return;
    }

    const inlineScope = passwordField.closest("form") || passwordField.parentElement;
    if (inlineScope) {
      const legacyInlineToggles = Array.from(inlineScope.querySelectorAll("svg#showPassword, svg#hidePassword, svg[onclick*='togglePassword']"));

      legacyInlineToggles.forEach((node) => {
        const relation = node.compareDocumentPosition(passwordField);
        const isBeforeField = Boolean(relation & Node.DOCUMENT_POSITION_FOLLOWING);

        if (isBeforeField) {
          node.remove();
        }
      });
    }

    const row = passwordField.closest("tr");
    if (!row || row.dataset.ccxpLitePasswordLabelCleaned === "true") {
      return;
    }

    const labelCell = row.querySelector("th, td");
    if (!labelCell) {
      return;
    }

    const labelText = String(labelCell.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
    const isPasswordLabel = /(密碼|password)/i.test(labelText);

    if (isPasswordLabel) {
      Array.from(labelCell.querySelectorAll("svg")).forEach((node) => node.remove());

      Array.from(labelCell.querySelectorAll("a, button, span, i")).forEach((node) => {
        const text = String(node.textContent || "")
          .replace(/\s+/g, " ")
          .trim();
        const hasOnlyIconChild = node.querySelector("svg, img, i") !== null;

        if (!text && hasOnlyIconChild) {
          node.remove();
        }
      });
    }

    const eyePattern = /(eye|show|hide|visible|visibility|view|顯示|隱藏|密碼)/i;
    const candidates = Array.from(labelCell.querySelectorAll("img, svg, i, span, a, button"));

    candidates.forEach((node) => {
      const hints = [
        node.getAttribute("alt"),
        node.getAttribute("title"),
        node.getAttribute("aria-label"),
        node.getAttribute("class"),
        node.getAttribute("src"),
        node.textContent
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");

      if (hints.includes("👁") || eyePattern.test(hints)) {
        node.remove();
      }
    });

    row.dataset.ccxpLitePasswordLabelCleaned = "true";
  }

  function normalizeLoginFormLayout(rootNode) {
    const forms = Array.from(rootNode.querySelectorAll("form"));

    forms.forEach((formNode) => {
      if (formNode.dataset.ccxpLiteFormStructured !== "true") {
        structureLoginFormRows(rootNode.ownerDocument, formNode);
        rebuildFlatLoginFormLabels(rootNode.ownerDocument, formNode);
        groupLoginFieldRows(rootNode.ownerDocument, formNode);
      }

      formNode.classList.add("ccxp-lite-login-form");
      formNode.dataset.ccxpLiteFormStructured = "true";
    });
  }

  function structureLoginFormRows(targetDocument, formNode) {
    const rows = Array.from(formNode.querySelectorAll("tr"));

    rows.forEach((rowNode, rowIndex) => {
      if (!rowNode || rowNode.dataset.ccxpLiteLoginRow === "true") {
        return;
      }

      const cells = Array.from(rowNode.querySelectorAll(":scope > th, :scope > td"));
      if (cells.length === 0) {
        return;
      }

      const fieldPairs = collectLoginFieldPairs(rowNode, cells);
      if (fieldPairs.length === 0) {
        return;
      }

      const replacementRows = fieldPairs.map((fieldPair, pairIndex) => {
        const fieldId = ensureFieldId(fieldPair.fieldNode, rowIndex, pairIndex);
        return buildLoginFieldRow(targetDocument, fieldPair, fieldId, Math.max(1, cells.length));
      });

      rowNode.replaceWith(...replacementRows);
      replacementRows.forEach((replacementRow) => {
        replacementRow.dataset.ccxpLiteLoginRow = "true";
      });

      const table = rowNode.closest("table");
      if (table) {
        table.classList.add("ccxp-lite-login-form-table");
      }
    });
  }

  function rebuildFlatLoginFormLabels(targetDocument, formNode) {
    const fields = Array.from(formNode.querySelectorAll("input, select, textarea"));

    fields.forEach((fieldNode, fieldIndex) => {
      const inputType = (fieldNode.getAttribute("type") || "text").toLowerCase();
      if (["hidden", "submit", "button", "image", "reset", "checkbox", "radio", "file"].includes(inputType)) {
        return;
      }

      if (fieldNode.parentNode !== formNode) {
        return;
      }

      const labelSourceNode = findLegacyInlineLabelNode(fieldNode, formNode);
      if (!labelSourceNode) {
        return;
      }

      const labelText = getNodeText(labelSourceNode);
      if (!labelText) {
        return;
      }

      const fieldId = ensureFieldId(fieldNode, fieldIndex);
      const labelNode = targetDocument.createElement("label");
      labelNode.className = "ccxp-lite-login-field-label";
      labelNode.setAttribute("for", fieldId);
      labelNode.textContent = labelText;

      labelSourceNode.replaceWith(labelNode);
    });
  }

  function buildLoginFieldRow(targetDocument, fieldPair, fieldId, columnCount) {
    const row = targetDocument.createElement("tr");
    row.className = "ccxp-lite-login-field-row";

    const mergedCell = targetDocument.createElement("td");
    mergedCell.className = "ccxp-lite-login-field-cell";
    mergedCell.colSpan = columnCount;

    const fieldGroup = targetDocument.createElement("div");
    fieldGroup.className = "ccxp-lite-login-field";

    const label = targetDocument.createElement("label");
    label.className = "ccxp-lite-login-field-label";
    label.setAttribute("for", fieldId);
    label.textContent = resolveLoginFieldLabel(fieldPair, targetDocument);

    const controlWrap = targetDocument.createElement("div");
    controlWrap.className = "ccxp-lite-login-field-control";
    removeInlineLoginLabelNodes(fieldPair.fieldCell, fieldPair.fieldNode);
    moveChildNodes(fieldPair.fieldCell, controlWrap);

    fieldGroup.appendChild(label);
    fieldGroup.appendChild(controlWrap);
    mergedCell.appendChild(fieldGroup);
    row.appendChild(mergedCell);

    return row;
  }

  function groupLoginFieldRows(targetDocument, formNode) {
    if (!formNode || formNode.dataset.ccxpLiteFieldRowsGrouped === "true") {
      return;
    }

    const fieldRows = Array.from(formNode.querySelectorAll("tr.ccxp-lite-login-field-row"));
    if (fieldRows.length === 0) {
      return;
    }

    const fieldsContainer = targetDocument.createElement("div");
    fieldsContainer.className = "ccxp-lite-login-fields";

    const firstTable = fieldRows[0].closest("table");
    if (firstTable && firstTable.parentNode) {
      firstTable.parentNode.insertBefore(fieldsContainer, firstTable);
    } else {
      formNode.insertBefore(fieldsContainer, formNode.firstChild);
    }

    fieldRows.forEach((rowNode) => {
      const fieldGroup = rowNode.querySelector(".ccxp-lite-login-field");
      if (fieldGroup) {
        fieldsContainer.appendChild(fieldGroup);
      }

      removeNode(rowNode);
    });

    Array.from(formNode.querySelectorAll("table.ccxp-lite-login-form-table")).forEach((tableNode) => {
      if (!tableNode.querySelector("tr")) {
        removeNode(tableNode);
      }
    });

    formNode.dataset.ccxpLiteFieldRowsGrouped = "true";
  }

  function collectLoginFieldPairs(rowNode, cells) {
    const pairs = [];
    const usedFieldCells = new Set();

    cells.forEach((cellNode, cellIndex) => {
      const fieldNode = findPrimaryFieldControl(cellNode);
      if (!fieldNode) {
        return;
      }

      const fieldCell = fieldNode.closest("th, td") || cellNode;
      if (usedFieldCells.has(fieldCell)) {
        return;
      }

      const fieldCellIndex = cells.indexOf(fieldCell);
      const labelCell = resolveLabelCellForField(cells, fieldCellIndex >= 0 ? fieldCellIndex : cellIndex);
      const labelText = getPreferredLoginLabelText(labelCell, fieldCell, fieldNode);

      pairs.push({
        fieldNode,
        fieldCell,
        labelText
      });

      usedFieldCells.add(fieldCell);
    });

    if (pairs.length > 0) {
      return pairs;
    }

    const fallbackFieldNode = findPrimaryFieldControl(rowNode);
    if (!fallbackFieldNode) {
      return pairs;
    }

    const fallbackFieldCell = fallbackFieldNode.closest("th, td") || cells[cells.length - 1];
    const fallbackLabelCell = resolveLabelCellForField(cells, cells.indexOf(fallbackFieldCell));

    pairs.push({
      fieldNode: fallbackFieldNode,
      fieldCell: fallbackFieldCell,
      labelText: getPreferredLoginLabelText(fallbackLabelCell, fallbackFieldCell, fallbackFieldNode)
    });

    return pairs;
  }

  function resolveLabelCellForField(cells, fieldCellIndex) {
    for (let index = fieldCellIndex - 1; index >= 0; index -= 1) {
      const candidate = cells[index];
      if (!candidate) {
        continue;
      }

      if (findPrimaryFieldControl(candidate)) {
        continue;
      }

      if (!getNodeText(candidate)) {
        continue;
      }

      return candidate;
    }

    return cells[0] || null;
  }

  function getNodeText(node) {
    return String((node && node.textContent) || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function findLegacyInlineLabelNode(fieldNode, boundaryNode) {
    let currentNode = fieldNode.previousSibling;

    while (currentNode && currentNode !== boundaryNode) {
      if (currentNode.nodeType === Node.TEXT_NODE && !getNodeText(currentNode)) {
        currentNode = currentNode.previousSibling;
        continue;
      }

      if (currentNode.nodeType === Node.ELEMENT_NODE) {
        const tagName = currentNode.tagName.toLowerCase();

        if (tagName === "br") {
          currentNode = currentNode.previousSibling;
          continue;
        }

        if (["svg", "img", "a", "button"].includes(tagName)) {
          currentNode = currentNode.previousSibling;
          continue;
        }

        if (tagName === "label" && currentNode.classList.contains("ccxp-lite-login-field-label")) {
          return null;
        }
      }

      return getNodeText(currentNode) ? currentNode : null;
    }

    return null;
  }

  function getPreferredLoginLabelText(labelCell, fieldCell, fieldNode) {
    const explicitLabel = getNodeText(labelCell);
    if (explicitLabel) {
      return explicitLabel;
    }

    return getInlineLoginLabelText(fieldCell, fieldNode);
  }

  function resolveLoginFieldLabel(fieldPair, targetDocument) {
    const explicitLabel = String(fieldPair && fieldPair.labelText || "").trim();
    if (explicitLabel) {
      return explicitLabel;
    }

    const fieldName = String(fieldPair && fieldPair.fieldNode && fieldPair.fieldNode.getAttribute("name") || "")
      .trim()
      .toLowerCase();
    const strings = getLandingStrings(targetDocument);

    if (fieldName === "account") {
      return strings.fieldAccount;
    }

    if (fieldName === "id") {
      return strings.fieldStudentId;
    }

    if (fieldName === "passwd" || fieldName === "password") {
      return strings.fieldPassword;
    }

    if (fieldName === "passwd2" || fieldName === "captcha" || fieldName === "code") {
      return strings.fieldVerificationCode;
    }

    return fieldName || strings.fieldGeneric;
  }

  function getInlineLoginLabelText(fieldCell, fieldNode) {
    if (!fieldCell || !fieldNode) {
      return "";
    }

    const leadingNodes = collectLeadingNodesBeforeField(fieldCell, fieldNode);
    return leadingNodes
      .map((node) => getNodeText(node))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function removeInlineLoginLabelNodes(fieldCell, fieldNode) {
    collectLeadingNodesBeforeField(fieldCell, fieldNode).forEach((node) => {
      removeNode(node);
    });
  }

  function collectLeadingNodesBeforeField(fieldCell, fieldNode) {
    if (!fieldCell || !fieldNode || fieldNode.parentNode !== fieldCell) {
      return [];
    }

    const leadingNodes = [];
    let currentNode = fieldCell.firstChild;
    while (currentNode && currentNode !== fieldNode) {
      const nextNode = currentNode.nextSibling;
      const textContent = getNodeText(currentNode);
      const isBreak = currentNode.nodeType === Node.ELEMENT_NODE
        && currentNode.tagName
        && currentNode.tagName.toLowerCase() === "br";

      if (textContent || isBreak) {
        leadingNodes.push(currentNode);
      }

      currentNode = nextNode;
    }

    return leadingNodes;
  }

  function findPrimaryFieldControl(scopeNode) {
    const candidates = Array.from(scopeNode.querySelectorAll("input, select, textarea"));

    return candidates.find((field) => {
      const inputType = (field.getAttribute("type") || "text").toLowerCase();
      return !["hidden", "submit", "button", "image", "checkbox", "radio", "file"].includes(inputType);
    }) || null;
  }

  function ensureFieldId(fieldNode, rowIndex, pairIndex = 0) {
    if (fieldNode.id) {
      return fieldNode.id;
    }

    const baseName = String(fieldNode.getAttribute("name") || "field")
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "field";
    const pairSuffix = pairIndex > 0 ? `-${pairIndex + 1}` : "";
    const generatedId = `ccxp-lite-${baseName}-${rowIndex + 1}${pairSuffix}`;
    fieldNode.id = generatedId;
    return generatedId;
  }

  function removeLoginResetControls(rootNode) {
    const resetControls = Array.from(rootNode.querySelectorAll("form input[type='reset'], form button[type='reset']"));

    resetControls.forEach((controlNode) => {
      removeNode(controlNode);
    });
  }

  function forceCaptchaLabelDisplay(rootNode) {
    const captchaLabelPattern = /(驗證碼|captcha)/i;
    const spans = Array.from(rootNode.querySelectorAll("span"));

    spans.forEach((spanNode) => {
      const labelText = String(spanNode.textContent || "").replace(/\s+/g, " ").trim();
      if (!labelText || !captchaLabelPattern.test(labelText)) {
        return;
      }

      spanNode.style.display = "block";
    });
  }

  function replaceLoginFormImageButtons(targetDocument, rootNode) {
    const imageSubmitInputs = Array.from(rootNode.querySelectorAll("form input[type='image']"));

    imageSubmitInputs.forEach((inputNode) => {
      if (inputNode.dataset.ccxpLiteImageButtonReplaced === "true") {
        return;
      }

      if (shouldKeepLegacyLoginImageSubmit(inputNode)) {
        return;
      }

      if (isVerificationAudioControl(inputNode)) {
        const audioButton = createAudioIconButtonFromImageInput(targetDocument, inputNode);
        inputNode.replaceWith(audioButton);
        audioButton.dataset.ccxpLiteImageButtonReplaced = "true";
        return;
      }

      if (isAdjacentLoginClearControl(inputNode)) {
        removeNode(inputNode);
        return;
      }

      const label = resolveLegacyImageButtonLabel(inputNode);
      if (!label) {
        return;
      }

      if (isClearActionLabel(label)) {
        removeNode(inputNode);
        return;
      }

      const button = targetDocument.createElement("button");
      button.type = "submit";
      button.className = "button ccxp-lite-image-action-button";
      button.textContent = label;

      if (inputNode.id) {
        button.id = inputNode.id;
      }

      if (inputNode.name) {
        button.name = inputNode.name;
      }

      if (inputNode.title) {
        button.title = inputNode.title;
      }

      if (inputNode.className) {
        button.className = `${button.className} ${inputNode.className}`.trim();
      }

      if (inputNode.disabled) {
        button.disabled = true;
      }

      ["onclick", "formaction", "formmethod", "formenctype", "formtarget", "tabindex"].forEach((attributeName) => {
        const value = inputNode.getAttribute(attributeName);
        if (value) {
          button.setAttribute(attributeName, value);
        }
      });

      if (inputNode.hasAttribute("formnovalidate")) {
        button.setAttribute("formnovalidate", "");
      }

      inputNode.replaceWith(button);
      button.dataset.ccxpLiteImageButtonReplaced = "true";
    });

    const imageAnchors = Array.from(rootNode.querySelectorAll("form a > img[alt]"));
    imageAnchors.forEach((imageNode) => {
      const anchor = imageNode.closest("a");
      if (!anchor || anchor.dataset.ccxpLiteImageButtonReplaced === "true") {
        return;
      }

      if (isVerificationAudioControl(imageNode)) {
        anchor.classList.add("ccxp-lite-audio-icon-link");
        anchor.setAttribute("aria-label", resolveLegacyImageButtonLabel(imageNode) || getLandingStrings(targetDocument).playVerificationAudio);
        anchor.replaceChildren(createAudioIcon(targetDocument));
        anchor.dataset.ccxpLiteImageButtonReplaced = "true";
        return;
      }

      if (isAdjacentLoginClearControl(imageNode)) {
        removeNode(anchor);
        return;
      }

      const label = resolveLegacyImageButtonLabel(imageNode);
      if (!label) {
        return;
      }

      if (isClearActionLabel(label)) {
        removeNode(anchor);
        return;
      }

      anchor.classList.add("ccxp-lite-image-link-button");
      anchor.replaceChildren(targetDocument.createTextNode(label));
      anchor.dataset.ccxpLiteImageButtonReplaced = "true";
    });
  }

  function wrapPrimaryLoginButtons(targetDocument, rootNode) {
    const forms = Array.from(rootNode.querySelectorAll("form"));

    forms.forEach((formNode) => {
      normalizeNativeLoginSubmitControls(targetDocument, formNode);

      const allActionButtons = Array.from(formNode.querySelectorAll(".ccxp-lite-image-action-button, .ccxp-lite-image-link-button"));
      if (allActionButtons.length === 0) {
        return;
      }

      let actionGroup = formNode.querySelector(".ccxp-lite-login-action-group");
      if (!actionGroup) {
        actionGroup = targetDocument.createElement("div");
        actionGroup.className = "ccxp-lite-login-action-group";
        allActionButtons[0].parentNode?.insertBefore(actionGroup, allActionButtons[0]);
      }

      const primaryCandidates = allActionButtons.filter((buttonNode) => isPrimaryLoginActionLabel(buttonNode.textContent));
      const primaryButton = primaryCandidates[0] || allActionButtons[0];
      const orderedButtons = [
        primaryButton,
        ...allActionButtons.filter((buttonNode) => buttonNode !== primaryButton)
      ];

      orderedButtons.forEach((buttonNode) => {
        buttonNode.classList.remove("ccxp-lite-login-primary-button", "ccxp-lite-login-secondary-button");
        if (buttonNode === primaryButton) {
          buttonNode.classList.add("ccxp-lite-login-primary-button");
        } else {
          buttonNode.classList.add("ccxp-lite-login-secondary-button");
        }

        actionGroup.appendChild(buttonNode);
      });
    });
  }

  function normalizeNativeLoginSubmitControls(targetDocument, formNode) {
    const nativeSubmitInputs = Array.from(formNode.querySelectorAll("input[type='submit']"));

    nativeSubmitInputs.forEach((inputNode) => {
      if (inputNode.dataset.ccxpLiteSubmitRebuilt === "true") {
        return;
      }

      const label = String(inputNode.value || inputNode.getAttribute("value") || inputNode.textContent || "")
        .replace(/\s+/g, " ")
        .trim();

      if (!label) {
        return;
      }

      const button = targetDocument.createElement("button");
      button.type = "submit";
      button.className = "ccxp-lite-image-action-button";
      button.textContent = label;
      button.value = label;
      button.setAttribute("value", label);

      Array.from(inputNode.attributes).forEach((attribute) => {
        const attributeName = attribute.name.toLowerCase();
        if (attributeName === "type" || attributeName === "class") {
          return;
        }

        button.setAttribute(attribute.name, attribute.value);
      });

      if (inputNode.className) {
        button.className = `${button.className} ${inputNode.className}`.trim();
      }

      if (inputNode.disabled) {
        button.disabled = true;
      }

      inputNode.replaceWith(button);
      button.dataset.ccxpLiteSubmitRebuilt = "true";
    });

    const nativeSubmitButtons = Array.from(formNode.querySelectorAll("button[type='submit'], button:not([type])"));
    nativeSubmitButtons.forEach((buttonNode) => {
      if (buttonNode.classList.contains("ccxp-lite-audio-icon-button") || buttonNode.classList.contains("ccxp-lite-image-action-button")) {
        return;
      }

      buttonNode.classList.add("ccxp-lite-image-action-button");
    });
  }

  function isPrimaryLoginActionLabel(rawLabel) {
    const normalizedLabel = String(rawLabel || "")
      .replace(/\s+/g, "")
      .trim()
      .toLowerCase();

    if (!normalizedLabel) {
      return false;
    }

    return /(登入|登录|login|signin|logon|送出|確定|确定|submit)/i.test(normalizedLabel);
  }

  function removeLoginSpacingArtifacts(targetDocument, rootNode) {
    Array.from(rootNode.querySelectorAll("br")).forEach((node) => removeNode(node));

    const textNodes = [];
    const walker = targetDocument.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT);
    let currentNode = walker.nextNode();

    while (currentNode) {
      textNodes.push(currentNode);
      currentNode = walker.nextNode();
    }

    textNodes.forEach((textNode) => {
      const normalized = String(textNode.textContent || "").replace(/\u00a0|&nbsp;|&npsp;/gi, " ");
      if (normalized.trim()) {
        textNode.textContent = normalized;
        return;
      }

      removeNode(textNode);
    });
  }

  function alignCaptchaMediaRow(targetDocument, rootNode) {
    const captchaImages = Array.from(rootNode.querySelectorAll("img[src*='auth_img.php']"));

    captchaImages.forEach((captchaImage) => {
      const host = captchaImage.parentElement;
      if (!host) {
        return;
      }

      const audioControl = host.querySelector(".ccxp-lite-audio-icon-button, .ccxp-lite-audio-icon-link");
      if (!audioControl) {
        return;
      }

      const rowNode = captchaImage.closest("tr");
      if (rowNode) {
        rowNode.classList.add("ccxp-lite-captcha-row");
      }

      let mediaRow = host.querySelector(":scope > .ccxp-lite-captcha-media-row");
      if (!mediaRow) {
        mediaRow = targetDocument.createElement("span");
        mediaRow.className = "ccxp-lite-captcha-media-row";
        host.insertBefore(mediaRow, captchaImage);
      }

      if (captchaImage.parentNode !== mediaRow) {
        mediaRow.appendChild(captchaImage);
      }

      if (audioControl.parentNode !== mediaRow) {
        mediaRow.appendChild(audioControl);
      }
    });
  }

  function resolveLegacyImageButtonLabel(node) {
    if (!node) {
      return "";
    }

    const explicitAlt = normalizeLegacyButtonLabel(node.getAttribute("alt"));
    if (explicitAlt) {
      return explicitAlt;
    }

    if (node.tagName && node.tagName.toLowerCase() === "input") {
      const parentForm = node.form;
      const pairedImage = parentForm
        ? parentForm.querySelector(`img[alt][src='${cssEscape(node.getAttribute("src") || "")}]`)
        : null;
      const pairedAlt = normalizeLegacyButtonLabel(pairedImage && pairedImage.getAttribute("alt"));
      if (pairedAlt) {
        return pairedAlt;
      }
    }

    const titleLabel = normalizeLegacyButtonLabel(node.getAttribute("title"));
    if (titleLabel) {
      return titleLabel;
    }

    return "";
  }

  function normalizeLegacyButtonLabel(rawLabel) {
    return String(rawLabel || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function shouldKeepLegacyLoginImageSubmit(inputNode) {
    if (!inputNode || !inputNode.form) {
      return false;
    }

    const action = String(inputNode.form.getAttribute("action") || "").toLowerCase();
    const isLoginFlowForm = action.includes("pre_select_entry.php") || action.includes("select_entry.php");
    if (!isLoginFlowForm) {
      return false;
    }

    if (isVerificationAudioControl(inputNode) || isAdjacentLoginClearControl(inputNode)) {
      return false;
    }

    const label = resolveLegacyImageButtonLabel(inputNode);
    if (isClearActionLabel(label)) {
      return false;
    }

    return true;
  }

  function isClearActionLabel(label) {
    const normalized = String(label || "")
      .replace(/\s+/g, "")
      .toLowerCase();

    return normalized.includes("清除")
      || normalized.includes("clear")
      || normalized.includes("重填")
      || normalized.includes("reset");
  }

  function isVerificationAudioControl(node) {
    if (!node) {
      return false;
    }

    const row = node.closest("tr");
    if (row && row.querySelector("input[name='passwd2']")) {
      return true;
    }

    const hintText = [
      node.getAttribute("alt"),
      node.getAttribute("title"),
      node.getAttribute("src"),
      node.getAttribute("onclick")
    ]
      .map((value) => String(value || "").toLowerCase())
      .join(" ");

    return /(voice|audio|sound|speak|listen|語音|朗讀|播放)/.test(hintText);
  }

  function isAdjacentLoginClearControl(node) {
    if (!node) {
      return false;
    }

    const row = node.closest("tr");
    if (!row || row.querySelector("input[name='passwd2']")) {
      return false;
    }

    if (isClearLikeControl(node)) {
      return true;
    }

    const controls = collectLegacyActionControls(row);
    if (controls.length < 2) {
      return false;
    }

    const loginIndex = controls.findIndex((controlNode) => isLoginLikeControl(controlNode));
    const currentIndex = controls.findIndex((controlNode) => controlNode === node || controlNode.contains(node));

    if (loginIndex < 0 || currentIndex < 0 || currentIndex <= loginIndex) {
      return false;
    }

    const isTwoImagePair = controls.length === 2
      && controls.every((controlNode) => isImageActionControl(controlNode));

    return isTwoImagePair;
  }

  function collectLegacyActionControls(row) {
    return Array.from(row.querySelectorAll("input[type='image'], input[type='submit'], input[type='reset'], button, a > img"))
      .filter((node) => {
        if (node.matches("a > img")) {
          return true;
        }

        const type = String(node.getAttribute("type") || "").toLowerCase();
        if (node.tagName === "BUTTON" && !type) {
          return true;
        }

        return ["image", "submit", "reset", "button"].includes(type);
      });
  }

  function isImageActionControl(node) {
    if (!node) {
      return false;
    }

    if (node.matches("a > img")) {
      return true;
    }

    return String(node.getAttribute("type") || "").toLowerCase() === "image";
  }

  function isLoginLikeControl(node) {
    const hints = extractControlHints(node);
    return /(登入|login|sign\s*-?\s*in|submit)/i.test(hints);
  }

  function isClearLikeControl(node) {
    const type = String(node.getAttribute("type") || "").toLowerCase();
    if (type === "reset") {
      return true;
    }

    const hints = extractControlHints(node);
    return /(清除|重填|clear|reset)/i.test(hints);
  }

  function extractControlHints(node) {
    const anchor = node.matches("a > img") ? node.closest("a") : null;

    return [
      node.getAttribute("alt"),
      node.getAttribute("title"),
      node.getAttribute("name"),
      node.getAttribute("id"),
      node.getAttribute("value"),
      node.getAttribute("src"),
      node.getAttribute("onclick"),
      node.textContent,
      anchor && anchor.getAttribute("href"),
      anchor && anchor.getAttribute("onclick"),
      anchor && anchor.textContent
    ]
      .map((value) => String(value || ""))
      .join(" ")
      .toLowerCase();
  }

  function createAudioIconButtonFromImageInput(targetDocument, inputNode) {
    const button = targetDocument.createElement("button");
    button.type = "button";
    button.className = "ccxp-lite-audio-icon-button";
    button.appendChild(createAudioIcon(targetDocument));

    const label = resolveLegacyImageButtonLabel(inputNode) || getLandingStrings(targetDocument).playVerificationAudio;
    button.setAttribute("aria-label", label);
    button.title = label;

    if (inputNode.id) {
      button.id = inputNode.id;
    }

    if (inputNode.className) {
      button.className = `${button.className} ${inputNode.className}`.trim();
    }

    if (inputNode.disabled) {
      button.disabled = true;
    }

    ["onclick", "tabindex"].forEach((attributeName) => {
      const value = inputNode.getAttribute(attributeName);
      if (value) {
        button.setAttribute(attributeName, value);
      }
    });

    return button;
  }

  function getLandingStrings(targetDocument) {
    return getLocalizedStrings(resolveLandingLocale(
      targetDocument,
      targetDocument.querySelector("ul.links"),
      findLoginSourceCell(targetDocument, getLoginForm(targetDocument)),
      getLoginForm(targetDocument)
    ));
  }

  function createAudioIcon(targetDocument) {
    const icon = targetDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "2");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    icon.setAttribute("aria-hidden", "true");

    ["M11 5 6 9H2v6h4l5 4z", "M15.5 8.5a5 5 0 0 1 0 7", "M18.5 5.5a9 9 0 0 1 0 13"].forEach((pathData) => {
      const path = targetDocument.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathData);
      icon.appendChild(path);
    });

    return icon;
  }

  function cssEscape(value) {
    return String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'");
  }

  function createPasswordVisibilityIcon(targetDocument, visible) {
    const icon = targetDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "2");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    icon.setAttribute("aria-hidden", "true");

    if (visible) {
      [
        "M10.733 5.076A10.744 10.744 0 0 1 12 5c4.596 0 8.51 2.934 9.938 7a10.454 10.454 0 0 1-1.077 2.167",
        "M14.084 14.158a3 3 0 0 1-4.242-4.242",
        "M17.479 17.499A10.75 10.75 0 0 1 12 19c-4.596 0-8.51-2.934-9.938-7a10.525 10.525 0 0 1 4.423-5.29",
        "M2 2l20 20"
      ].forEach((pathData) => {
        const path = targetDocument.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", pathData);
        icon.appendChild(path);
      });
    } else {
      const path = targetDocument.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0");
      icon.appendChild(path);

      const circle = targetDocument.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", "12");
      circle.setAttribute("cy", "12");
      circle.setAttribute("r", "3");
      icon.appendChild(circle);
    }

    return icon;
  }


  namespace.landing = {
    isSupportedInquirePath,
    isLandingPage,
    preloadLandingCaptcha,
    simplifyLandingPage
  };
})(window);
