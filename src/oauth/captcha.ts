(function bootstrapCcxpLiteOauthCaptcha(globalScope: typeof globalThis) {
  const { CCXP_LITE: namespace } = globalScope as Window & typeof globalThis;
  const landingCaptcha = namespace?.landingCaptcha;
  if (!landingCaptcha) {
    return;
  }
  const targetDocument = globalScope.document;
  if (!isOauthAuthorizePage(targetDocument)) {
    return;
  }

  const bindAutofill = () => {
    landingCaptcha.enableLoginCaptchaAutofill(targetDocument, targetDocument);
  };

  if (targetDocument.readyState === "loading") {
    targetDocument.addEventListener("DOMContentLoaded", bindAutofill, {
      once: true,
    });
  } else {
    bindAutofill();
  }

  globalThis.requestAnimationFrame(bindAutofill);
  globalThis.setTimeout(bindAutofill, 0, undefined);
})(globalThis);

function isOauthAuthorizePage(targetDocument: Document) {
  return (
    targetDocument.location.hostname.toLowerCase() === "oauth.ccxp.nthu.edu.tw" &&
    /\/v\d+(?:\.\d+)?\/authorize\.php$/i.test(targetDocument.location.pathname)
  );
}
