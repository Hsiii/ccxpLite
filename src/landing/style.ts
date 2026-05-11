(function registerCcxpLiteLandingStyle(globalScope: typeof globalThis) {
  const runtimeScope = globalScope;
  const namespace = runtimeScope.CCXP_LITE ?? {};
  const { shared } = namespace;
  if (!shared) {
    return;
  }

  const { ensureThemeDocument, cleanLegacyAttributes } = shared;

  function applyLandingTheme(
    targetDocument: Document,
    rewriteResult: {
      shell: HTMLElement;
    },
  ) {
    ensureThemeDocument(targetDocument, "landing");
    cleanLegacyAttributes(rewriteResult.shell);
    cleanLegacyAttributes(targetDocument);
    const targetBody = targetDocument.body;
    targetBody.replaceChildren(rewriteResult.shell);
    targetBody.style.setProperty("background-image", "none", "important");
    targetBody.style.setProperty("background-color", "var(--ccxp-lite-bg)", "important");
    targetBody.dataset.ccxpLiteLandingApplied = "true";
  }

  namespace.landingStyle = {
    applyLandingTheme,
  };
})(globalThis);
