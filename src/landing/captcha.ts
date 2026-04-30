(function registerCcxpLiteLandingCaptcha(globalScope: Window & typeof globalThis) {
  const namespace = (globalScope.CCXP_LITE ||= {}) as CcxpLiteNamespace;
  const { landingLocale } = namespace;
  if (!landingLocale) {
    return;
  }

  const { getLoginForm } = landingLocale;
  const CAPTCHA_AUTOFILL_TIMEOUT_MS = 5000;
  const captchaAutofillStateByDocument = new WeakMap<Document, CcxpLiteCaptchaAutofillState>();

  function enableLoginCaptchaAutofill(
    targetDocument: Document,
    rootNode: ParentNode,
    existingState?: CcxpLiteCaptchaAutofillState | null,
  ) {
    const form = getLoginForm(targetDocument);
    const state = existingState || getOrCreateCaptchaAutofillState(targetDocument, rootNode);
    if (!form || form.dataset.ccxpLiteCaptchaAutofillBound === "true" || !state) {
      return;
    }

    const { input: captchaInput, image: captchaImage } = state;

    const triggerAutofill = () => {
      autofillCaptchaInput(targetDocument, captchaImage, captchaInput, state);
    };

    captchaImage.addEventListener("load", triggerAutofill);

    const observer = new MutationObserver((mutations) => {
      if (!namespace.sharedDom?.ensureContextValid()) {
        observer.disconnect();
        return;
      }
      if (mutations.some((mutation) => mutation.attributeName === "src")) {
        triggerAutofill();
      }
    });
    observer.observe(captchaImage, {
      attributes: true,
      attributeFilter: ["src"],
    });

    triggerAutofill();
    globalThis.requestAnimationFrame(triggerAutofill);
    globalThis.setTimeout(triggerAutofill, 0);

    form.dataset.ccxpLiteCaptchaAutofillBound = "true";
  }

  function getOrCreateCaptchaAutofillState(
    targetDocument: Document,
    rootNode: ParentNode,
  ): CcxpLiteCaptchaAutofillState | null {
    const existingState = captchaAutofillStateByDocument.get(targetDocument);
    if (existingState) {
      syncCaptchaAutofillState(targetDocument, existingState, rootNode);
      return existingState;
    }

    const captchaField = resolveCaptchaField(rootNode);
    if (!captchaField) {
      return null;
    }

    const state = {
      ...captchaField,
      lastRequestedSrc: "",
      requestToken: 0,
      pendingRequest: null,
      pendingSrc: "",
      failedSrc: "",
      cachedAnswer: "",
      cachedSrc: "",
    };

    captchaAutofillStateByDocument.set(targetDocument, state);
    primeCaptchaAutofill(targetDocument, state);
    return state;
  }

  function syncCaptchaAutofillState(
    targetDocument: Document,
    state: CcxpLiteCaptchaAutofillState,
    rootNode: ParentNode,
  ) {
    const latestField = resolveCaptchaField(rootNode);
    if (!latestField) {
      return state;
    }

    state.input = latestField.input;
    state.image = latestField.image;
    primeCaptchaAutofill(targetDocument, state);
    return state;
  }

  function resolveCaptchaField(rootNode: ParentNode): CcxpLiteCaptchaField | null {
    const input = rootNode.querySelector("input[name='passwd2']");
    if (!input) {
      return null;
    }

    const scope =
      input.closest(".ccxp-lite-login-field, .ccxp-lite-login-inline-field") || rootNode;
    const mediaRow =
      scope.querySelector(".ccxp-lite-captcha-media-row") ||
      rootNode.querySelector(".ccxp-lite-captcha-media-row");
    const image =
      scope.querySelector(
        ".ccxp-lite-captcha-media-row > img, .ccxp-lite-captcha-image-shell > img, img[src*='auth_img.php']",
      ) ||
      rootNode.querySelector(
        ".ccxp-lite-captcha-media-row > img, .ccxp-lite-captcha-image-shell > img, img[src*='auth_img.php']",
      );

    if (!image || !mediaRow) {
      return null;
    }

    return {
      input: input as HTMLInputElement,
      image: image as HTMLImageElement,
      mediaRow: mediaRow as HTMLElement,
      scope,
    };
  }

  function setCaptchaLoadingState(state: CcxpLiteCaptchaAutofillState | null, isLoading: boolean) {
    if (!state) {
      return;
    }

    if (state.input) {
      state.input.setAttribute("aria-busy", isLoading ? "true" : "false");
      if (isLoading) {
        clearCaptchaTimeoutFlash(state);
      }
    }
  }

  function clearCaptchaTimeoutFlash(state: CcxpLiteCaptchaAutofillState | null) {
    if (!state?.input) {
      return;
    }

    if (state.timeoutFlashTimer) {
      globalThis.clearTimeout(state.timeoutFlashTimer);
      state.timeoutFlashTimer = null;
    }

    delete state.input.dataset.timeoutFlash;
  }

  function flashCaptchaTimeout(state: CcxpLiteCaptchaAutofillState | null) {
    if (!state?.input) {
      return;
    }

    clearCaptchaTimeoutFlash(state);
    // Trigger reflow

    const _reflow = state.input.offsetWidth;
    state.input.dataset.timeoutFlash = "true";
    state.timeoutFlashTimer = globalThis.setTimeout(() => {
      if (!state.input) {
        return;
      }

      delete state.input.dataset.timeoutFlash;
      state.timeoutFlashTimer = null;
    }, 1600);
  }

  function autofillCaptchaInput(
    targetDocument: Document,
    captchaImage: HTMLImageElement,
    captchaInput: HTMLInputElement,
    state: CcxpLiteCaptchaAutofillState,
  ) {
    const captchaSrc = getCaptchaRequestSource(captchaImage, targetDocument);
    if (!captchaSrc || state.lastRequestedSrc === captchaSrc || state.failedSrc === captchaSrc) {
      return;
    }

    state.lastRequestedSrc = captchaSrc;
    state.requestToken += 1;
    const { requestToken } = state;
    setCaptchaLoadingState(state, true);

    requestCaptchaAnswerForCurrentImage(targetDocument, state, captchaSrc)
      .then((answer) => {
        if (requestToken !== state.requestToken || !answer) {
          return;
        }

        captchaInput.value = answer;
        captchaInput.dispatchEvent(new Event("input", { bubbles: true }));
        captchaInput.dispatchEvent(new Event("change", { bubbles: true }));
        state.failedSrc = "";
        setCaptchaLoadingState(state, false);
      })
      .catch((error: unknown) => {
        if (requestToken === state.requestToken) {
          fallbackToManualCaptchaEntry(state, captchaSrc, {
            didTimeout: isCaptchaTimeoutError(error),
          });
        }
      });
  }

  function primeCaptchaAutofill(
    targetDocument: Document,
    state: CcxpLiteCaptchaAutofillState | null,
  ) {
    if (!state || !state.image) {
      return;
    }

    const captchaSrc = getCaptchaRequestSource(state.image, targetDocument);
    if (!captchaSrc) {
      return;
    }

    setCaptchaLoadingState(state, true);
    requestCaptchaAnswerForCurrentImage(targetDocument, state.image, state, captchaSrc).catch(
      (error: unknown) => {
        fallbackToManualCaptchaEntry(state, captchaSrc, {
          didTimeout: isCaptchaTimeoutError(error),
        });
      },
    );
  }

  function fallbackToManualCaptchaEntry(
    state: CcxpLiteCaptchaAutofillState | null,
    captchaSrc: string,
    options: { didTimeout?: boolean } = {},
  ) {
    if (!state) {
      return;
    }

    state.lastRequestedSrc = "";
    state.failedSrc = captchaSrc || "";
    state.requestToken += 1;
    setCaptchaLoadingState(state, false);

    if (state.input) {
      state.input.removeAttribute("aria-busy");
    }

    if (options.didTimeout) {
      flashCaptchaTimeout(state);
    }
  }

  function requestCaptchaAnswerForCurrentImage(
    targetDocument: Document,
    state: CcxpLiteCaptchaAutofillState,
    captchaSrc: string,
  ) {
    if (state.cachedSrc === captchaSrc && state.cachedAnswer) {
      return Promise.resolve(state.cachedAnswer);
    }

    if (state.pendingSrc === captchaSrc && state.pendingRequest !== null) {
      return state.pendingRequest;
    }

    const request = downloadCaptchaImageBytes(targetDocument, captchaSrc)
      .then((imageBytes) => requestCaptchaAnswer(captchaSrc, imageBytes))
      .then((answer) => {
        if (answer) {
          state.cachedSrc = captchaSrc;
          state.cachedAnswer = answer;
        }

        return answer;
      })
      .finally(() => {
        if (state.pendingSrc === captchaSrc) {
          state.pendingSrc = "";
          state.pendingRequest = null;
        }
      });

    state.pendingSrc = captchaSrc;
    state.pendingRequest = request;
    return request;
  }

  function getCaptchaRequestSource(
    captchaImage: HTMLImageElement | null,
    targetDocument: Document,
  ) {
    const rawSource = (captchaImage?.getAttribute("src") || "").trim();
    if (!rawSource) {
      return "";
    }

    try {
      const parsed = new URL(
        rawSource,
        targetDocument.location && targetDocument.location.href
          ? targetDocument.location.href
          : globalThis.location.href,
      );
      const pathSegments = parsed.pathname.split("/").filter(Boolean);
      const fileName = pathSegments.at(-1) || "";
      return `${fileName}${parsed.search}`;
    } catch {
      const trimmedSource = rawSource.replace(/^https?:\/\/[^/]+\//i, "");
      const sourceSegments = trimmedSource.split("/").filter(Boolean);
      return sourceSegments.at(-1) || "";
    }
  }

  function downloadCaptchaImageBytes(targetDocument: Document, captchaSrc: string) {
    const captchaUrl = new URL(
      captchaSrc,
      targetDocument.location && targetDocument.location.href
        ? targetDocument.location.href
        : globalThis.location.href,
    );

    return fetchWithTimeout(
      captchaUrl.toString(),
      { credentials: "include" },
      CAPTCHA_AUTOFILL_TIMEOUT_MS,
    ).then((response) => {
      if (!response.ok) {
        throw new Error(`captcha-download-failed:${response.status}`);
      }

      return response.arrayBuffer();
    });
  }

  function requestCaptchaAnswer(_captchaSrc: string, imageBytes: ArrayBuffer) {
    const dc = namespace.decaptcha;
    if (!dc) {
      return Promise.resolve("");
    }
    return Promise.resolve(dc.predictDigits(imageBytes)).then((answer) => (answer || "").trim());
  }

  interface CcxpLiteCaptchaError extends Error {
    code?: string;
  }

  function isCaptchaTimeoutError(error: unknown) {
    const typedError = error as CcxpLiteCaptchaError | null;
    return Boolean(
      typedError &&
      (typedError.name === "AbortError" ||
        typedError.name === "TimeoutError" ||
        typedError.code === "CAPTCHA_TIMEOUT"),
    );
  }

  function fetchWithTimeout(
    resource: RequestInfo | URL,
    options: RequestInit = {},
    timeoutMs = CAPTCHA_AUTOFILL_TIMEOUT_MS,
  ) {
    const controller = new AbortController();
    let didTimeout = false;
    const timerId = globalThis.setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, timeoutMs);

    return fetch(resource, {
      ...options,
      signal: controller.signal,
    })
      .catch((error: unknown) => {
        if (didTimeout && error instanceof Error && error.name === "AbortError") {
          const timeoutError = new Error("captcha-timeout") as CcxpLiteCaptchaError;
          timeoutError.name = "TimeoutError";
          timeoutError.code = "CAPTCHA_TIMEOUT";
          throw timeoutError;
        }

        throw error;
      })
      .finally(() => {
        globalThis.clearTimeout(timerId);
      });
  }

  namespace.landingCaptcha = {
    CAPTCHA_AUTOFILL_TIMEOUT_MS,
    enableLoginCaptchaAutofill,
    getOrCreateCaptchaAutofillState,
    primeCaptchaAutofill,
  };
})(globalThis);
