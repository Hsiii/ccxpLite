(function injectCcxpLitePe14dPageScript() {
  const sharedDom = (window.CCXP_LITE as CcxpLiteNamespace)?.sharedDom;
  const pageScriptId = "ccxp-lite-pe14d-page-script";
  if (document.getElementById(pageScriptId)) {
    return;
  }

  const runtimeApi = sharedDom?.getRuntimeSafely
    ? sharedDom.getRuntimeSafely()
    : typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id
      ? (chrome.runtime as unknown as CcxpLiteRuntime)
      : null;
  if (!runtimeApi || !document.documentElement) {
    return;
  }

  const script = document.createElement("script");
  script.id = pageScriptId;
  script.src = runtimeApi.getURL("page.pe14d.js");
  script.async = false;
  script.addEventListener("load", () => {
    if (script.parentNode) {
      script.parentNode.removeChild(script);
    }
  });
  script.addEventListener("error", () => {
    if (script.parentNode) {
      script.parentNode.removeChild(script);
    }
  });

  document.documentElement.appendChild(script);
})();
