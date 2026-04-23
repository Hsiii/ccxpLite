// @ts-nocheck
(function registerCcxpLiteLandingCaptcha(globalScope) {
  const namespace = globalScope.CCXP_LITE || (globalScope.CCXP_LITE = {});
  const { decaptcha, landingLocale } = namespace;
  if (!landingLocale) {
    return;
  }

  const { getLoginForm } = landingLocale;
  const CAPTCHA_AUTOFILL_TIMEOUT_MS = 5000;
  const captchaAutofillStateByDocument = new WeakMap();

  function enableLoginCaptchaAutofill(targetDocument, rootNode, existingState) {
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
      if (mutations.some((mutation) => mutation.attributeName === "src")) {
        triggerAutofill();
      }
    });
    observer.observe(captchaImage, {
      attributes: true,
      attributeFilter: ["src"],
    });

    triggerAutofill();
    window.requestAnimationFrame(triggerAutofill);
    window.setTimeout(triggerAutofill, 0);

    form.dataset.ccxpLiteCaptchaAutofillBound = "true";
  }

  function getOrCreateCaptchaAutofillState(targetDocument, rootNode) {
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

  function syncCaptchaAutofillState(targetDocument, state, rootNode) {
    const latestField = resolveCaptchaField(rootNode);
    if (!latestField) {
      return state;
    }

    state.input = latestField.input;
    state.image = latestField.image;
    primeCaptchaAutofill(targetDocument, state);
    return state;
  }

  function resolveCaptchaField(rootNode) {
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

    return { input, image, mediaRow, scope };
  }

  function setCaptchaLoadingState(state, isLoading) {
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

  function clearCaptchaTimeoutFlash(state) {
    if (!state?.input) {
      return;
    }

    if (state.timeoutFlashTimer) {
      window.clearTimeout(state.timeoutFlashTimer);
      state.timeoutFlashTimer = null;
    }

    state.input.removeAttribute("data-timeout-flash");
  }

  function flashCaptchaTimeout(state) {
    if (!state?.input) {
      return;
    }

    clearCaptchaTimeoutFlash(state);
    void state.input.offsetWidth;
    state.input.setAttribute("data-timeout-flash", "true");
    state.timeoutFlashTimer = window.setTimeout(() => {
      if (!state.input) {
        return;
      }

      state.input.removeAttribute("data-timeout-flash");
      state.timeoutFlashTimer = null;
    }, 1600);
  }

  function autofillCaptchaInput(targetDocument, captchaImage, captchaInput, state) {
    const captchaSrc = getCaptchaRequestSource(captchaImage, targetDocument);
    if (!captchaSrc || state.lastRequestedSrc === captchaSrc || state.failedSrc === captchaSrc) {
      return;
    }

    state.lastRequestedSrc = captchaSrc;
    state.requestToken += 1;
    const requestToken = state.requestToken;
    setCaptchaLoadingState(state, true);

    requestCaptchaAnswerForCurrentImage(targetDocument, captchaImage, state, captchaSrc)
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
      .catch((error) => {
        if (requestToken === state.requestToken) {
          fallbackToManualCaptchaEntry(state, captchaSrc, {
            didTimeout: isCaptchaTimeoutError(error),
          });
        }
      });
  }

  function primeCaptchaAutofill(targetDocument, state) {
    if (!state || !state.image) {
      return;
    }

    const captchaSrc = getCaptchaRequestSource(state.image, targetDocument);
    if (!captchaSrc) {
      return;
    }

    setCaptchaLoadingState(state, true);
    requestCaptchaAnswerForCurrentImage(targetDocument, state.image, state, captchaSrc).catch(
      (error) => {
        fallbackToManualCaptchaEntry(state, captchaSrc, {
          didTimeout: isCaptchaTimeoutError(error),
        });
      },
    );
  }

  function fallbackToManualCaptchaEntry(state, captchaSrc, options = {}) {
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

  function requestCaptchaAnswerForCurrentImage(targetDocument, captchaImage, state, captchaSrc) {
    if (state.cachedSrc === captchaSrc && state.cachedAnswer) {
      return Promise.resolve(state.cachedAnswer);
    }

    if (state.pendingSrc === captchaSrc && state.pendingRequest) {
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

  function getCaptchaRequestSource(captchaImage, targetDocument) {
    const rawSource = String(captchaImage?.getAttribute("src") || "").trim();
    if (!rawSource) {
      return "";
    }

    try {
      const parsed = new URL(
        rawSource,
        targetDocument.location && targetDocument.location.href
          ? targetDocument.location.href
          : window.location.href,
      );
      const pathSegments = parsed.pathname.split("/").filter(Boolean);
      const fileName = pathSegments[pathSegments.length - 1] || "";
      return `${fileName}${parsed.search}`;
    } catch (_error) {
      const trimmedSource = rawSource.replace(/^https?:\/\/[^/]+\//i, "");
      const sourceSegments = trimmedSource.split("/").filter(Boolean);
      return sourceSegments[sourceSegments.length - 1] || "";
    }
  }

  function downloadCaptchaImageBytes(targetDocument, captchaSrc) {
    const captchaUrl = new URL(
      captchaSrc,
      targetDocument.location && targetDocument.location.href
        ? targetDocument.location.href
        : window.location.href,
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

  function requestCaptchaAnswer(_captchaSrc, imageBytes) {
    return Promise.resolve(decaptcha.predictDigits(imageBytes)).then((answer) =>
      String(answer || "").trim(),
    );
  }

  function isCaptchaTimeoutError(error) {
    return Boolean(
      error &&
      (error.name === "AbortError" ||
        error.name === "TimeoutError" ||
        error.code === "CAPTCHA_TIMEOUT"),
    );
  }

  function fetchWithTimeout(resource, options = {}, timeoutMs = CAPTCHA_AUTOFILL_TIMEOUT_MS) {
    const controller = new AbortController();
    let didTimeout = false;
    const timerId = window.setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, timeoutMs);

    return fetch(resource, {
      ...options,
      signal: controller.signal,
    })
      .catch((error) => {
        if (didTimeout && error?.name === "AbortError") {
          const timeoutError = new Error("captcha-timeout");
          timeoutError.name = "TimeoutError";
          timeoutError.code = "CAPTCHA_TIMEOUT";
          throw timeoutError;
        }

        throw error;
      })
      .finally(() => {
        window.clearTimeout(timerId);
      });
  }

  namespace.landingCaptcha = {
    CAPTCHA_AUTOFILL_TIMEOUT_MS,
    enableLoginCaptchaAutofill,
    getOrCreateCaptchaAutofillState,
    primeCaptchaAutofill,
  };
})(window);
