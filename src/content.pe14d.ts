(function injectCcxpLitePe14dPageScript() {
  const sharedDom = (globalThis.CCXP_LITE as CcxpLiteNamespace)?.sharedDom;
  const pageScriptId = "ccxp-lite-pe14d-page-script";
  if (document.querySelector(`#${CSS.escape(pageScriptId)}`)) {
    return;
  }

  const getRuntimeApi = (): CcxpLiteRuntime | null => {
    if (sharedDom?.getRuntimeSafely) {
      return sharedDom.getRuntimeSafely();
    }
    if (typeof chrome !== "undefined" && chrome.runtime?.id) {
      return chrome.runtime as unknown as CcxpLiteRuntime;
    }
    return null;
  };

  const runtimeApi = getRuntimeApi();
  if (!runtimeApi || !document.documentElement) {
    return;
  }

  const script = document.createElement("script");
  script.id = pageScriptId;
  script.src = runtimeApi.getURL("page.pe14d.js");
  script.async = false;
  script.addEventListener("load", () => {
    if (script.parentNode) {
      script.remove();
    }
  });
  script.addEventListener("error", () => {
    if (script.parentNode) {
      script.remove();
    }
  });

  document.documentElement.append(script);
})();
