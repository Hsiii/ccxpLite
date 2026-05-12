(function registerCcxpLiteLoginValidation(globalScope: typeof globalThis) {
  const runtimeScope = globalScope;
  const namespace = runtimeScope.CCXP_LITE ?? {};
  const { loginLocale } = namespace;
  if (!loginLocale) {
    return;
  }

  const { getLoginForm } = loginLocale;

  function captureValidationState(targetDocument: Document): CcxpLiteLoginValidationState {
    const fnstrField = targetDocument.querySelector<HTMLInputElement>("input[name='fnstr']");
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
      fnstrSeed: seedPart,
    };
  }

  function restoreValidationGuards(targetDocument: Document, state: CcxpLiteLoginValidationState) {
    const fields = ["account", "passwd", "passwd2"]
      .map((name) => targetDocument.querySelector<HTMLInputElement>(`input[name='${name}']`))
      .filter((field): field is HTMLInputElement => field !== null);

    if (fields.length === 0) {
      return;
    }

    const form = getLoginForm(targetDocument);
    if (!form || form.dataset.ccxpLiteValidationBound === "true") {
      return;
    }

    const { startedAt } = state;
    const onFieldActivity = () => {
      if (Date.now() - startedAt > 30 * 60 * 1000) {
        targetDocument.location.reload();
      }
    };

    for (const eventName of ["click", "change", "keydown"]) {
      for (const field of fields) {
        field.addEventListener(eventName, onFieldActivity);
      }
    }

    applyLoginFieldAccessibility(targetDocument);
    annotatePrimaryLoginAction(form);
    bindEnterToPrimaryLoginAction(form);
    focusLoginEntryPoint(targetDocument, form);
    form.addEventListener("submit", () => {
      ensureSubmissionPayload(form, targetDocument);
    });

    form.dataset.ccxpLiteValidationBound = "true";
  }

  function applyLoginFieldAccessibility(targetDocument: Document) {
    const accountField = targetDocument.querySelector<HTMLInputElement>("input[name='account']");
    const passwordField = targetDocument.querySelector<HTMLInputElement>("input[name='passwd']");
    const captchaField = targetDocument.querySelector<HTMLInputElement>("input[name='passwd2']");
    if (accountField) {
      accountField.autocomplete = "username";
      accountField.setAttribute("autocapitalize", "off");
      accountField.setAttribute("spellcheck", "false");
      accountField.enterKeyHint = "next";
    }
    if (passwordField) {
      passwordField.autocomplete = "current-password";
      passwordField.setAttribute("autocapitalize", "off");
      passwordField.setAttribute("spellcheck", "false");
      passwordField.enterKeyHint = captchaField ? "next" : "go";
    }
    if (captchaField) {
      captchaField.autocomplete = "one-time-code";
      captchaField.inputMode = "numeric";
      captchaField.enterKeyHint = "go";
    }
  }

  function annotatePrimaryLoginAction(form: HTMLFormElement) {
    const primaryAction = resolvePrimaryLoginAction(form);
    if (!primaryAction) {
      return;
    }
    primaryAction.setAttribute("aria-keyshortcuts", "Enter");
  }

  function bindEnterToPrimaryLoginAction(form: HTMLFormElement) {
    const formNode = form;
    if (formNode.dataset.ccxpLiteEnterSubmitBound === "true") {
      return;
    }
    formNode.addEventListener("keydown", (event) => {
      if (
        event.key !== "Enter" ||
        event.defaultPrevented ||
        event.isComposing ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      ) {
        return;
      }
      const { target } = event;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }
      const inputType = (target.getAttribute("type") ?? "text").toLowerCase();
      if (
        ["button", "checkbox", "file", "hidden", "image", "radio", "reset", "submit"].includes(
          inputType,
        )
      ) {
        return;
      }
      event.preventDefault();
      triggerPrimaryLoginAction(formNode);
    });
    formNode.dataset.ccxpLiteEnterSubmitBound = "true";
  }

  function focusLoginEntryPoint(targetDocument: Document, form: HTMLFormElement) {
    const formNode = form;
    if (formNode.dataset.ccxpLiteInitialFocusApplied === "true") {
      return;
    }
    const focusTarget = resolveInitialFocusTarget(targetDocument, formNode);
    if (!focusTarget) {
      return;
    }
    globalThis.requestAnimationFrame(() => {
      focusTarget.focus({ preventScroll: true });
    });
    formNode.dataset.ccxpLiteInitialFocusApplied = "true";
  }

  function resolveInitialFocusTarget(targetDocument: Document, form: HTMLFormElement) {
    const accountField = targetDocument.querySelector<HTMLInputElement>("input[name='account']");
    const passwordField = targetDocument.querySelector<HTMLInputElement>("input[name='passwd']");
    const captchaField = targetDocument.querySelector<HTMLInputElement>("input[name='passwd2']");
    const preferredField = [accountField, passwordField, captchaField].find(
      (field) => field !== null && !field.disabled && field.value.trim() === "",
    );
    if (preferredField) {
      return preferredField;
    }
    return resolvePrimaryLoginAction(form);
  }

  function triggerPrimaryLoginAction(form: HTMLFormElement) {
    const primaryAction = resolvePrimaryLoginAction(form);
    if (primaryAction && !primaryAction.hasAttribute("disabled")) {
      primaryAction.click();
      return;
    }
    if (typeof form.requestSubmit === "function") {
      form.requestSubmit();
      return;
    }
    form.submit();
  }

  function resolvePrimaryLoginAction(form: HTMLFormElement) {
    return form.querySelector<HTMLElement>(
      ".ccxp-lite-login-primary-button, button[type='submit'], input[type='submit'], input[type='image'], button:not([type])",
    );
  }

  function ensureSubmissionPayload(form: HTMLFormElement | undefined, targetDocument: Document) {
    if (!form) {
      return;
    }

    const authImage = form.querySelector<HTMLImageElement>("img[src*='auth_img.php?pwdstr=']");
    const tokenFromImage = extractPwdstrFromImage(authImage ?? undefined, targetDocument);
    let fnstrField = form.querySelector<HTMLInputElement>("input[name='fnstr']");

    if (!fnstrField && tokenFromImage !== "") {
      fnstrField = targetDocument.createElement("input");
      fnstrField.type = "hidden";
      fnstrField.name = "fnstr";
      form.append(fnstrField);
    }

    if (fnstrField && tokenFromImage !== "" && fnstrField.value !== tokenFromImage) {
      fnstrField.value = tokenFromImage;
    }
  }

  function extractPwdstrFromImage(
    imageNode: HTMLImageElement | undefined,
    targetDocument: Document,
  ) {
    if (!imageNode) {
      return "";
    }

    const rawSrc = imageNode.getAttribute("src") ?? "";

    try {
      const parsed = new URL(rawSrc, targetDocument.location.href);
      return parsed.searchParams.get("pwdstr") ?? "";
    } catch {
      const match = rawSrc.match(/[&?]pwdstr=([^&]+)/i);
      return match ? decodeURIComponent(match[1]) : "";
    }
  }

  namespace.loginValidation = {
    captureValidationState,
    restoreValidationGuards,
    ensureSubmissionPayload,
    extractPwdstrFromImage,
  };
})(globalThis);
