(function registerCcxpLiteLoginCaptcha(globalScope: typeof globalThis) {
  const runtimeScope = globalScope;
  const namespace = runtimeScope.CCXP_LITE ?? {};
  const { loginLocale, shared } = namespace;
  if (!loginLocale) {
    return;
  }
  const trackEvent = shared?.trackEvent ?? (() => undefined);
  const { getLoginForm } = loginLocale;
  const CAPTCHA_AUTOFILL_TIMEOUT_MS = 5000;
  const captchaAutofillStateByDocument = new WeakMap<Document, CcxpLiteCaptchaAutofillState>();
  function enableCaptchaAutofill(
    targetDocument: Document,
    rootNode: ParentNode,
    existingState?: CcxpLiteCaptchaAutofillState,
  ) {
    const form = getLoginForm(targetDocument);
    const state = existingState ?? getOrCreateCaptchaState(targetDocument, rootNode);
    if (!form || form.dataset.ccxpLiteCaptchaAutofillBound === "true" || !state) {
      return;
    }
    const triggerAutofill = () => {
      syncCaptchaAutofillState(targetDocument, state, rootNode);
      autofillCaptchaInput(targetDocument, state.image, state.input, state);
    };
    state.image.addEventListener("load", triggerAutofill);
    const observer = new MutationObserver((mutations: readonly MutationRecord[]) => {
      if (namespace.sharedDom?.ensureContextValid() === false) {
        observer.disconnect();
        return;
      }
      const shouldRefresh = mutations.some((mutation) => {
        if (mutation.type === "attributes" && mutation.attributeName === "src") {
          return true;
        }
        if (mutation.type !== "childList") {
          return false;
        }
        return (
          [...mutation.addedNodes, ...mutation.removedNodes].some(
            (node) => node instanceof HTMLImageElement,
          ) || mutation.target instanceof HTMLImageElement
        );
      });
      if (shouldRefresh) {
        triggerAutofill();
      }
    });
    observer.observe(state.mediaRow, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["src"],
    });
    triggerAutofill();
    globalThis.requestAnimationFrame(triggerAutofill);
    globalThis.setTimeout(triggerAutofill, 0, undefined);
    form.dataset.ccxpLiteCaptchaAutofillBound = "true";
  }

  function getOrCreateCaptchaState(
    targetDocument: Document,
    rootNode: ParentNode,
  ): CcxpLiteCaptchaAutofillState | undefined {
    const existingState = captchaAutofillStateByDocument.get(targetDocument);
    if (existingState) {
      syncCaptchaAutofillState(targetDocument, existingState, rootNode);
      return existingState;
    }
    const captchaField = resolveCaptchaField(rootNode);
    if (!captchaField) {
      return undefined;
    }
    const state = {
      ...captchaField,
      lastRequestedSrc: "",
      requestToken: 0,
      pendingRequest: undefined,
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
    const captchaState = state;
    const previousImage = captchaState.image;
    const latestField = resolveCaptchaField(rootNode);
    if (!latestField) {
      return captchaState;
    }
    captchaState.input = latestField.input;
    captchaState.image = latestField.image;
    captchaState.mediaRow = latestField.mediaRow;
    captchaState.scope = latestField.scope;
    captchaState.kind = latestField.kind;
    if (captchaState.image !== previousImage) {
      captchaState.image.addEventListener("load", () => {
        autofillCaptchaInput(targetDocument, captchaState.image, captchaState.input, captchaState);
      });
    }
    return captchaState;
  }

  function resolveCaptchaField(rootNode: ParentNode): CcxpLiteCaptchaField | undefined {
    const input = rootNode.querySelector<HTMLInputElement>(
      "input[name='passwd2'], input[name='captcha']",
    );
    if (!input) {
      return undefined;
    }
    const kind = input.name === "captcha" ? "oauth" : "legacy";
    const scope =
      input.closest(".ccxp-lite-login-field, .ccxp-lite-login-inline-field") ?? rootNode;
    const mediaRow =
      scope.querySelector(".ccxp-lite-captcha-media-row") ??
      rootNode.querySelector(".ccxp-lite-captcha-media-row");
    const image =
      scope.querySelector(
        ".ccxp-lite-captcha-media-row > img, .ccxp-lite-captcha-image-shell > img, img[src*='auth_img.php'], img[src*='captchaimg.php'], img[alt='CAPTCHA Image']",
      ) ??
      rootNode.querySelector(
        ".ccxp-lite-captcha-media-row > img, .ccxp-lite-captcha-image-shell > img, img[src*='auth_img.php'], img[src*='captchaimg.php'], img[alt='CAPTCHA Image']",
      );
    const resolvedMediaRow = (mediaRow ?? image?.parentElement) as HTMLElement | null;
    if (!image || !resolvedMediaRow) {
      return undefined;
    }
    return {
      input,
      image: image as HTMLImageElement,
      mediaRow: resolvedMediaRow,
      scope,
      kind,
    };
  }

  function setCaptchaLoadingState(
    state: CcxpLiteCaptchaAutofillState | undefined,
    isLoading: boolean,
  ) {
    if (!state) {
      return;
    }
    state.input.setAttribute("aria-busy", isLoading ? "true" : "false");
    if (isLoading) {
      clearCaptchaTimeoutFlash(state);
    }
  }

  function clearCaptchaTimeoutFlash(state: CcxpLiteCaptchaAutofillState | undefined) {
    const captchaState = state;
    if (!captchaState?.input) {
      return;
    }
    if (captchaState.timeoutFlashTimer !== undefined) {
      globalThis.clearTimeout(captchaState.timeoutFlashTimer);
      captchaState.timeoutFlashTimer = undefined;
    }
    delete captchaState.input.dataset.timeoutFlash;
  }

  function flashCaptchaTimeout(state: CcxpLiteCaptchaAutofillState | undefined) {
    const captchaState = state;
    if (!captchaState?.input) {
      return;
    }
    clearCaptchaTimeoutFlash(captchaState);
    // Trigger reflow
    const _reflow = captchaState.input.offsetWidth;
    captchaState.input.dataset.timeoutFlash = "true";
    captchaState.timeoutFlashTimer = globalThis.setTimeout(
      () => {
        delete captchaState.input.dataset.timeoutFlash;
        captchaState.timeoutFlashTimer = undefined;
      },
      1600,
      undefined,
    );
  }

  function autofillCaptchaInput(
    targetDocument: Document,
    captchaImage: HTMLImageElement,
    _captchaInput: HTMLInputElement,
    state: CcxpLiteCaptchaAutofillState,
  ) {
    const captchaSrc = getCaptchaRequestSource(captchaImage, targetDocument);
    if (
      captchaSrc === "" ||
      state.lastRequestedSrc === captchaSrc ||
      state.failedSrc === captchaSrc
    ) {
      return;
    }
    const captchaState = state;
    captchaState.lastRequestedSrc = captchaSrc;
    captchaState.requestToken++;
    const { requestToken } = captchaState;
    setCaptchaLoadingState(captchaState, true);
    requestCaptchaAnswerForCurrentImage(targetDocument, captchaState, captchaSrc)
      .then((answer) => {
        if (requestToken !== captchaState.requestToken || answer === "") {
          return;
        }
        const resolvedInput = state.input;
        resolvedInput.value = answer;
        resolvedInput.dispatchEvent(new Event("input", { bubbles: true }));
        resolvedInput.dispatchEvent(new Event("change", { bubbles: true }));
        captchaState.failedSrc = "";
        setCaptchaLoadingState(captchaState, false);
        trackEvent(targetDocument, {
          feature: "captcha",
          action: "autofill_result",
          surface: captchaState.kind === "oauth" ? "oauth" : "login",
          captcha_kind: captchaState.kind,
          outcome: "success",
        });
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
    state: CcxpLiteCaptchaAutofillState | undefined,
  ) {
    if (!state) {
      return;
    }
    const captchaSrc = getCaptchaRequestSource(state.image, targetDocument);
    if (captchaSrc === "") {
      return;
    }
    setCaptchaLoadingState(state, true);
    requestCaptchaAnswerForCurrentImage(targetDocument, state, captchaSrc).catch(
      (error: unknown) => {
        fallbackToManualCaptchaEntry(state, captchaSrc, {
          didTimeout: isCaptchaTimeoutError(error),
        });
      },
    );
  }

  function fallbackToManualCaptchaEntry(
    state: CcxpLiteCaptchaAutofillState | undefined,
    captchaSrc: string,
    options: {
      didTimeout?: boolean;
    } = {},
  ) {
    const captchaState = state;
    if (!captchaState) {
      return;
    }
    captchaState.lastRequestedSrc = "";
    captchaState.failedSrc = captchaSrc;
    captchaState.requestToken++;
    setCaptchaLoadingState(captchaState, false);
    captchaState.input.removeAttribute("aria-busy");
    trackEvent(captchaState.input.ownerDocument, {
      feature: "captcha",
      action: "autofill_result",
      surface: captchaState.kind === "oauth" ? "oauth" : "login",
      captcha_kind: captchaState.kind,
      outcome: options.didTimeout === true ? "timeout_fallback" : "manual_fallback",
    });
    if (options.didTimeout === true) {
      flashCaptchaTimeout(captchaState);
    }
  }

  async function requestCaptchaAnswerForCurrentImage(
    targetDocument: Document,
    state: CcxpLiteCaptchaAutofillState,
    captchaSrc: string,
  ) {
    const captchaState = state;
    if (captchaState.cachedSrc === captchaSrc && captchaState.cachedAnswer !== "") {
      return captchaState.cachedAnswer;
    }
    if (captchaState.pendingSrc === captchaSrc && captchaState.pendingRequest !== undefined) {
      return await captchaState.pendingRequest;
    }
    const request = resolveCaptchaPredictionSource(targetDocument, captchaState, captchaSrc)
      .then(
        async (predictionSource) =>
          await requestCaptchaAnswer(captchaState, captchaSrc, predictionSource),
      )
      .then((answer) => {
        if (answer !== "") {
          captchaState.cachedSrc = captchaSrc;
          captchaState.cachedAnswer = answer;
        }
        return answer;
      })
      .finally(() => {
        if (captchaState.pendingSrc === captchaSrc) {
          captchaState.pendingSrc = "";
          captchaState.pendingRequest = undefined;
        }
      });
    captchaState.pendingSrc = captchaSrc;
    captchaState.pendingRequest = request;
    return await request;
  }

  function getCaptchaRequestSource(
    captchaImage: HTMLImageElement | undefined,
    targetDocument: Document,
  ) {
    const rawSource = (captchaImage?.getAttribute("src") ?? "").trim();
    if (rawSource === "") {
      return "";
    }
    try {
      const parsed = new URL(rawSource, targetDocument.location.href);
      const pathSegments = parsed.pathname.split("/").filter(Boolean);
      const fileName = pathSegments.at(-1) ?? "";
      return `${fileName}${parsed.search}`;
    } catch {
      const trimmedSource = rawSource.replace(/^https?:\/\/[^/]+\//i, "");
      const sourceSegments = trimmedSource.split("/").filter(Boolean);
      return sourceSegments.at(-1) ?? "";
    }
  }

  async function downloadCaptchaImageBytes(targetDocument: Document, captchaSrc: string) {
    const captchaUrl = new URL(captchaSrc, targetDocument.location.href);
    return await fetchWithTimeout(
      captchaUrl.toString(),
      { credentials: "include" },
      CAPTCHA_AUTOFILL_TIMEOUT_MS,
    ).then(async (response) => {
      if (!response.ok) {
        throw new Error(`captcha-download-failed:${response.status}`);
      }
      return await response.arrayBuffer();
    });
  }

  async function requestCaptchaAnswer(
    state: CcxpLiteCaptchaAutofillState,
    captchaSrc: string,
    predictionSource: ArrayBuffer | HTMLImageElement,
  ) {
    const predictor =
      state.kind === "oauth" || captchaSrc.includes("captchaimg.php")
        ? namespace.oauthDecaptcha
        : namespace.decaptcha;
    if (!predictor) {
      return "";
    }
    return await Promise.resolve(predictor.predictDigits(predictionSource)).then((answer) =>
      answer.trim(),
    );
  }

  async function waitForCaptchaImageLoad(image: HTMLImageElement) {
    if (image.complete && image.naturalWidth > 0 && image.naturalHeight > 0) {
      return image;
    }
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        image.removeEventListener("load", handleLoad);
        image.removeEventListener("error", handleError);
      };
      const handleLoad = () => {
        cleanup();
        resolve();
      };
      const handleError = () => {
        cleanup();
        reject(new Error("captcha-image-load-failed"));
      };
      image.addEventListener("load", handleLoad, { once: true });
      image.addEventListener("error", handleError, { once: true });
    });
    if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
      throw new Error("captcha-image-size-unavailable");
    }
    return image;
  }

  async function resolveCaptchaPredictionSource(
    targetDocument: Document,
    state: CcxpLiteCaptchaAutofillState,
    captchaSrc: string,
  ) {
    if (state.kind === "oauth") {
      return await waitForCaptchaImageLoad(state.image);
    }
    try {
      return await downloadCaptchaImageBytes(targetDocument, captchaSrc);
    } catch (error: unknown) {
      try {
        return await waitForCaptchaImageLoad(state.image);
      } catch {
        throw error;
      }
    }
  }
  interface CcxpLiteCaptchaError extends Error {
    code?: string;
  }
  function isCaptchaTimeoutError(error: unknown) {
    const typedError = error as CcxpLiteCaptchaError | undefined;
    return (
      typedError !== undefined &&
      (typedError.name === "AbortError" ||
        typedError.name === "TimeoutError" ||
        typedError.code === "CAPTCHA_TIMEOUT")
    );
  }

  async function fetchWithTimeout(
    resource: RequestInfo | URL,
    options: RequestInit = {},
    timeoutMs = CAPTCHA_AUTOFILL_TIMEOUT_MS,
  ) {
    const controller = new AbortController();
    let didTimeout = false;
    const timerId = globalThis.setTimeout(
      () => {
        didTimeout = true;
        controller.abort();
      },
      timeoutMs,
      undefined,
    );
    return await fetch(resource, {
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
  namespace.loginCaptcha = {
    CAPTCHA_AUTOFILL_TIMEOUT_MS,
    enableCaptchaAutofill,
    getOrCreateCaptchaState,
    primeCaptchaAutofill,
  };
})(globalThis);
