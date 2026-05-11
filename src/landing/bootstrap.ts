(function registerCcxpLiteLandingBootstrap(globalScope: typeof globalThis) {
  const runtimeScope = globalScope;
  const namespace = runtimeScope.CCXP_LITE ?? {};
  const { shared } = namespace;
  const {
    landingIdentify,
    landingRewrite,
    landingStyle,
    landingLocale,
    landingValidation,
    landingCaptcha,
  } = namespace;
  if (
    !shared ||
    !landingIdentify ||
    !landingRewrite ||
    !landingStyle ||
    !landingLocale ||
    !landingValidation ||
    !landingCaptcha
  ) {
    return;
  }
  const identifyLib = landingIdentify;
  const rewriteLib = landingRewrite;
  const styleLib = landingStyle;
  const { ensureDocumentBody, isDocumentComplete } = shared;
  const { isSupportedInquirePath, isLandingPage } = landingLocale;
  const { restoreLoginValidationGuards } = landingValidation;
  const { enableLoginCaptchaAutofill, getOrCreateCaptchaAutofillState } = landingCaptcha;
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
    const targetBody = ensureDocumentBody(targetDocument);

    if (!targetBody) {
      retryFn();
      return;
    }

    if (targetBody.dataset.ccxpLiteLandingApplied === "true") {
      onReady();
      return;
    }
    if (!isDocumentComplete(targetDocument)) {
      retryFn();
      return;
    }
    const identifiedSurface = identifyLib.identifyLandingSurface(targetDocument);
    if (!identifiedSurface) {
      retryFn();
      return;
    }

    const rewriteResult = rewriteLib.rewriteLandingSurface(targetDocument, identifiedSurface);
    styleLib.applyLandingTheme(targetDocument, rewriteResult);
    enableLoginCaptchaAutofill(
      targetDocument,
      rewriteResult.loginSection as ParentNode,
      rewriteResult.captchaAutofillState,
    );
    restoreLoginValidationGuards(targetDocument, rewriteResult.loginValidationState);
    onReady();
  }
  namespace.landing = {
    isSupportedInquirePath,
    isLandingPage,
    preloadLandingCaptcha,
    simplifyLandingPage,
  };
})(globalThis);
