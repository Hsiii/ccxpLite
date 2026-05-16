(function bootstrapCcxpLiteOauthCaptcha(globalScope: typeof globalThis) {
  const { CCXP_LITE: namespace } = globalScope as Window & typeof globalThis;
  const loginCaptcha = namespace?.loginCaptcha;
  const shared = namespace?.shared;
  if (!loginCaptcha) {
    return;
  }
  const targetDocument = globalScope.document;
  if (!isOauthAuthorizePage(targetDocument)) {
    return;
  }
  shared?.trackPageView?.(targetDocument, {
    page_surface: "oauth_authorize",
  });

  const MAX_BIND_ATTEMPTS = 40;
  const RETRY_DELAY_MS = 250;
  let bindAttempts = 0;
  let retryTimerId: number | undefined;
  let fieldObserver: MutationObserver | undefined;

  const isAutofillBound = () =>
    targetDocument.querySelector("form")?.dataset.ccxpLiteCaptchaAutofillBound === "true";

  const stopRetry = () => {
    if (retryTimerId !== undefined) {
      globalThis.clearTimeout(retryTimerId);
      retryTimerId = undefined;
    }
    fieldObserver?.disconnect();
    fieldObserver = undefined;
  };

  const tryBindAutofill = () => {
    if (isAutofillBound()) {
      stopRetry();
      return true;
    }
    const state = loginCaptcha.getOrCreateCaptchaState(targetDocument, targetDocument);
    if (!state) {
      return false;
    }
    loginCaptcha.enableCaptchaAutofill(targetDocument, targetDocument, state);
    if (isAutofillBound()) {
      stopRetry();
      return true;
    }
    return false;
  };

  const scheduleRetry = () => {
    if (bindAttempts >= MAX_BIND_ATTEMPTS) {
      stopRetry();
      return;
    }
    retryTimerId = globalThis.setTimeout(
      () => {
        retryTimerId = undefined;
        bindAttempts++;
        if (!tryBindAutofill()) {
          scheduleRetry();
        }
      },
      RETRY_DELAY_MS,
      undefined,
    );
  };

  const bindAutofill = () => {
    bindAttempts++;
    if (!tryBindAutofill()) {
      scheduleRetry();
    }
  };

  if (targetDocument.readyState === "loading") {
    targetDocument.addEventListener("DOMContentLoaded", bindAutofill, {
      once: true,
    });
  } else {
    bindAutofill();
  }

  fieldObserver = new MutationObserver(() => {
    if (isAutofillBound()) {
      stopRetry();
      return;
    }
    tryBindAutofill();
  });
  fieldObserver.observe(targetDocument.documentElement, {
    childList: true,
    subtree: true,
  });

  globalThis.requestAnimationFrame(bindAutofill);
  globalThis.setTimeout(bindAutofill, 0, undefined);
})(globalThis);

function isOauthAuthorizePage(targetDocument: Document) {
  return (
    targetDocument.location.hostname.toLowerCase() === "oauth.ccxp.nthu.edu.tw" &&
    /\/v\d+(?:\.\d+)?\/authorize\.php$/i.test(targetDocument.location.pathname)
  );
}
