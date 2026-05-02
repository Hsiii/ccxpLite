(function registerCcxpLiteLandingValidation(globalScope: typeof globalThis) {
  const runtimeScope = globalScope;
  const namespace = runtimeScope.CCXP_LITE ?? {};
  const { landingLocale } = namespace;
  if (!landingLocale) {
    return;
  }

  const { getLoginForm } = landingLocale;

  function captureLoginValidationState(targetDocument: Document): CcxpLiteLandingValidationState {
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

  function restoreLoginValidationGuards(
    targetDocument: Document,
    state: CcxpLiteLandingValidationState,
  ) {
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

    const startedAt = (state && state.startedAt) || Date.now();
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

    form.addEventListener("submit", () => {
      ensureLoginSubmissionPayload(form, targetDocument);
    });

    form.dataset.ccxpLiteValidationBound = "true";
  }

  function ensureLoginSubmissionPayload(form: HTMLFormElement | null, targetDocument: Document) {
    if (!form) {
      return;
    }

    const authImage = form.querySelector<HTMLImageElement>("img[src*='auth_img.php?pwdstr=']");
    const tokenFromImage = extractPwdstrFromImage(authImage, targetDocument);
    let fnstrField = form.querySelector<HTMLInputElement>("input[name='fnstr']");

    if (!fnstrField && tokenFromImage) {
      fnstrField = targetDocument.createElement("input");
      fnstrField.type = "hidden";
      fnstrField.name = "fnstr";
      form.append(fnstrField);
    }

    if (fnstrField && tokenFromImage && fnstrField.value !== tokenFromImage) {
      fnstrField.value = tokenFromImage;
    }
  }

  function extractPwdstrFromImage(imageNode: HTMLImageElement | null, targetDocument: Document) {
    if (!imageNode) {
      return "";
    }

    const rawSrc = imageNode.getAttribute("src") ?? "";

    try {
      const parsed = new URL(
        rawSrc,
        targetDocument.location && targetDocument.location.href
          ? targetDocument.location.href
          : globalThis.location.href,
      );
      return parsed.searchParams.get("pwdstr") ?? "";
    } catch {
      const match = rawSrc.match(/[&?]pwdstr=([^&]+)/i);
      return match ? decodeURIComponent(match[1] ?? "") : "";
    }
  }

  namespace.landingValidation = {
    captureLoginValidationState,
    restoreLoginValidationGuards,
    ensureLoginSubmissionPayload,
    extractPwdstrFromImage,
  };
})(globalThis);
