(function registerCcxpLiteLoginBootstrap(globalScope: typeof globalThis) {
  const runtimeScope = globalScope;
  const namespace = runtimeScope.CCXP_LITE ?? {};
  const { shared } = namespace;
  const { loginIdentify, loginRewrite, loginStyle, loginLocale, loginValidation, loginCaptcha } =
    namespace;
  if (
    !shared ||
    !loginIdentify ||
    !loginRewrite ||
    !loginStyle ||
    !loginLocale ||
    !loginValidation ||
    !loginCaptcha
  ) {
    return;
  }
  const identifyLib = loginIdentify;
  const rewriteLib = loginRewrite;
  const styleLib = loginStyle;
  const { ensureDocumentBody, isDocumentComplete } = shared;
  const { isSupportedInquirePath, isLoginPage } = loginLocale;
  const { restoreValidationGuards } = loginValidation;
  const { enableCaptchaAutofill, getOrCreateCaptchaState } = loginCaptcha;
  function preloadCaptcha(targetDocument: Document) {
    if (!isLoginPage(targetDocument)) {
      return;
    }
    getOrCreateCaptchaState(targetDocument, targetDocument);
  }

  function simplifyLoginPage(
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
    const identifiedSurface = identifyLib.identifyLoginSurface(targetDocument);
    if (!identifiedSurface) {
      retryFn();
      return;
    }

    const rewriteResult = rewriteLib.rewriteLoginSurface(targetDocument, identifiedSurface);
    styleLib.applyLoginTheme(targetDocument, rewriteResult);
    enableCaptchaAutofill(
      targetDocument,
      rewriteResult.loginSection as ParentNode,
      rewriteResult.captchaAutofillState,
    );
    restoreValidationGuards(targetDocument, rewriteResult.loginValidationState);
    onReady();
  }
  namespace.login = {
    isSupportedInquirePath,
    isLoginPage,
    preloadCaptcha,
    simplifyLoginPage,
  };
})(globalThis);
