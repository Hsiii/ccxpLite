(function registerCcxpLiteLandingLocale(globalScope: Window & typeof globalThis) {
  globalScope.CCXP_LITE ||= {};
  const namespace = globalScope.CCXP_LITE;

  function isSupportedInquirePath(targetDocument: Document) {
    const pathName = (
      (targetDocument.location && targetDocument.location.pathname) ||
      ""
    ).toLowerCase();
    return /\/ccxp\/inquire\/(?:index\.php)?\/?$/.test(pathName);
  }

  function isLandingPage(targetDocument: Document) {
    if (!isSupportedInquirePath(targetDocument)) {
      return false;
    }

    return Boolean(getLoginForm(targetDocument) || hasLandingTabContent(targetDocument));
  }

  function hasLandingTabContent(targetDocument: Document) {
    return Boolean(targetDocument.querySelector(".tab, .tabcontent"));
  }

  function resolveLandingLocale(
    targetDocument: Document,
    languageLinks: ParentNode | null,
    loginSourceCell: ParentNode | null,
    loginForm: HTMLFormElement | null,
  ): CcxpLiteLocale {
    const htmlLang = (
      (targetDocument.documentElement && targetDocument.documentElement.lang) ||
      ""
    ).toLowerCase();
    if (htmlLang.startsWith("en")) {
      return "en";
    }

    if (htmlLang.startsWith("zh")) {
      return "zh";
    }

    const search = (
      (targetDocument.location && targetDocument.location.search) ||
      ""
    ).toLowerCase();
    const langMatch = search.match(/[?&]lang=([^&]+)/);
    if (langMatch) {
      const langValue = decodeURIComponent(langMatch[1]);
      if (langValue.includes("en")) {
        return "en";
      }
      if (/(zh|cht|chs|tw|cn)/.test(langValue)) {
        return "zh";
      }
    }

    if (languageLinks) {
      const currentLangNode = languageLinks.querySelector(
        ".active, .current, .selected, [aria-current='page'], strong, b",
      );
      if (currentLangNode) {
        const currentLangText = (currentLangNode.textContent || "").toLowerCase();
        if (currentLangText.includes("english")) {
          return "en";
        }
        if (/中文|chinese/.test(currentLangText)) {
          return "zh";
        }
      }
    }

    const formInputTextSample = loginForm
      ? Array.from(loginForm.querySelectorAll("input, select, textarea, button"))
          .map((node) =>
            [
              node.getAttribute("placeholder") || "",
              node.getAttribute("value") || "",
              node.getAttribute("title") || "",
              node.getAttribute("aria-label") || "",
              node.getAttribute("name") || "",
            ].join(" "),
          )
          .join(" ")
      : "";

    const loginTextSample = [
      loginForm && loginForm.textContent,
      loginSourceCell && loginSourceCell.textContent,
      formInputTextSample,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const localePairs = [
      { zh: ["帳號", "學號"], en: ["account", "username", "user id", "student id"] },
      { zh: ["密碼"], en: ["password"] },
      { zh: ["驗證碼"], en: ["captcha", "verification code", "security code"] },
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

  function getLoginForm(targetDocument: Document): HTMLFormElement | null {
    const forms = Array.from(targetDocument.querySelectorAll("form"));

    const candidates = forms.filter((form) => {
      const action = (form.getAttribute("action") || "").toLowerCase();
      const hasKnownAction =
        action.includes("pre_select_entry.php") || action.includes("select_entry.php");
      const hasPasswordField = Boolean(
        form.querySelector("input[type='password'], input[name='passwd'], input[name='passwd2']"),
      );
      const hasAccountLikeField = Boolean(
        form.querySelector("input[name='account'], input[name='id'], input[type='text']"),
      );
      const hasCredentials =
        Boolean(form.querySelector("input[name='account']")) &&
        Boolean(form.querySelector("input[name='passwd'], input[name='passwd2']"));
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

  function isLikelyVisibleForm(formNode: HTMLFormElement) {
    if (!formNode) {
      return false;
    }

    if (formNode.hidden) {
      return false;
    }

    let node: HTMLElement | null = formNode;
    while (node && node !== document.body) {
      if (node.nodeType !== Node.ELEMENT_NODE) {
        node = node.parentElement;
        continue;
      }

      const style = globalThis.getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden") {
        return false;
      }

      node = node.parentElement;
    }

    const rect = formNode.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  namespace.landingLocale = {
    isSupportedInquirePath,
    isLandingPage,
    resolveLandingLocale,
    getLoginForm,
  };
})(globalThis);
