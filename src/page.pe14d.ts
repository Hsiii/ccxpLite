// @ts-nocheck
(function registerCcxpLitePe14dPatch(globalScope) {
  const PAGE_FLAG = "__ccxpLitePe14dPatchInstalled";
  const TRANSPORT_FRAME_ID = "ccxp-lite-pe14d-transport";
  const TRANSPORT_FRAME_NAME = "ccxp-lite-pe14d-transport";
  const STATE_STORAGE_KEY = "ccxp-lite-pe14d-submit-state";
  const TOAST_ID = "ccxp-lite-pe14d-toast";
  const TOAST_STYLE_ID = "ccxp-lite-pe14d-toast-style";
  const INTERCEPTED_ACTIONS = new Set(["getLabInsList", "ins"]);
  const RESTORE_TTL_MS = 30000;

  if (globalScope[PAGE_FLAG]) {
    return;
  }

  globalScope[PAGE_FLAG] = true;

  let wrappedToSubmit = null;
  let pendingSubmission = null;

  function isSupportedPage() {
    return /^\/ccxp\/INQUIRE\/PE\/1\/14D\/.+/i.test(globalScope.location.pathname);
  }

  if (!isSupportedPage()) {
    return;
  }

  restorePageState();
  ensureToastStyles();
  installWhenReady();

  function installWhenReady() {
    const installAttempt = () => {
      if (!isSupportedPage()) {
        return;
      }

      const currentToSubmit = globalScope.toSubmit;
      if (typeof currentToSubmit !== "function") {
        globalScope.setTimeout(installAttempt, 150);
        return;
      }

      if (currentToSubmit === wrappedToSubmit || currentToSubmit.__ccxpLiteWrapped === true) {
        return;
      }

      const originalToSubmit = currentToSubmit;

      wrappedToSubmit = function ccxpLiteWrappedToSubmit(form, actionName, actionValue) {
        if (!shouldInterceptSubmission(form, actionName)) {
          return originalToSubmit.call(this, form, actionName, actionValue);
        }

        return submitThroughTransport(originalToSubmit, form, actionName, actionValue);
      };

      wrappedToSubmit.__ccxpLiteWrapped = true;
      wrappedToSubmit.__ccxpLiteOriginal = originalToSubmit;
      globalScope.toSubmit = wrappedToSubmit;

      globalScope.setTimeout(installAttempt, 500);
    };

    installAttempt();
  }

  function shouldInterceptSubmission(form, actionName) {
    return Boolean(form && INTERCEPTED_ACTIONS.has(String(actionName || "")));
  }

  function submitThroughTransport(originalToSubmit, form, actionName, actionValue) {
    if (pendingSubmission) {
      return false;
    }

    const transportFrame = ensureTransportFrame();
    if (!transportFrame) {
      return originalToSubmit.call(globalScope, form, actionName, actionValue);
    }

    const snapshot = captureSnapshot(form, actionName);
    pendingSubmission = {
      actionName,
      snapshot,
      originalTarget: form.getAttribute("target") || "",
      frame: transportFrame,
      cleanedUp: false,
    };
    const originalTarget = pendingSubmission.originalTarget;

    persistSnapshot(snapshot);
    setPendingUi(true, actionName);

    const handleLoad = () => {
      processTransportResponse();
    };

    transportFrame.addEventListener("load", handleLoad, { once: true });
    form.setAttribute("target", TRANSPORT_FRAME_NAME);

    try {
      originalToSubmit.call(globalScope, form, actionName, actionValue);
    } catch (_error) {
      cleanupPendingSubmission();
      if (originalTarget) {
        form.setAttribute("target", originalTarget);
      } else {
        form.removeAttribute("target");
      }
      return originalToSubmit.call(globalScope, form, actionName, actionValue);
    } finally {
      globalScope.setTimeout(() => {
        if (!form) {
          return;
        }

        if (originalTarget) {
          form.setAttribute("target", originalTarget);
        } else {
          form.removeAttribute("target");
        }
      }, 0);
    }

    return false;
  }

  function ensureTransportFrame() {
    let frame = globalScope.document.getElementById(TRANSPORT_FRAME_ID);
    if (frame instanceof HTMLIFrameElement) {
      return frame;
    }

    frame = globalScope.document.createElement("iframe");
    frame.id = TRANSPORT_FRAME_ID;
    frame.name = TRANSPORT_FRAME_NAME;
    frame.setAttribute("aria-hidden", "true");
    Object.assign(frame.style, {
      display: "none",
      width: "0",
      height: "0",
      border: "0",
    });

    const host = globalScope.document.documentElement || globalScope.document.body;
    if (!host) {
      return null;
    }

    host.appendChild(frame);
    return frame;
  }

  function captureSnapshot(form, actionName) {
    const activeElement = globalScope.document.activeElement;
    return {
      actionName,
      createdAt: Date.now(),
      pathname: globalScope.location.pathname,
      scrollX: globalScope.scrollX,
      scrollY: globalScope.scrollY,
      activeName:
        activeElement instanceof HTMLElement && "name" in activeElement
          ? activeElement.name || ""
          : "",
      activeId: activeElement instanceof HTMLElement ? activeElement.id || "" : "",
      bodyScrollTop: globalScope.document.documentElement
        ? globalScope.document.documentElement.scrollTop
        : 0,
      formId: form.id || "",
    };
  }

  function persistSnapshot(snapshot) {
    try {
      globalScope.sessionStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(snapshot));
    } catch (_error) {
      // Ignore storage failures on legacy browsers.
    }
  }

  function restorePageState() {
    const snapshot = readStoredSnapshot();
    if (!snapshot) {
      return;
    }

    clearStoredSnapshot();

    const applyRestore = () => {
      globalScope.scrollTo(snapshot.scrollX || 0, snapshot.scrollY || snapshot.bodyScrollTop || 0);

      const focusTarget =
        (snapshot.activeId && globalScope.document.getElementById(snapshot.activeId)) ||
        (snapshot.activeName &&
          globalScope.document.querySelector(
            `[name="${escapeAttributeValue(snapshot.activeName)}"]`,
          )) ||
        null;

      if (focusTarget instanceof HTMLElement && typeof focusTarget.focus === "function") {
        focusTarget.focus({ preventScroll: true });
      }

      if (snapshot.actionName === "ins") {
        showToast("已新增，已保留目前位置");
      } else if (snapshot.actionName === "getLabInsList") {
        showToast("已更新任務資訊");
      }
    };

    if (globalScope.document.readyState === "complete") {
      globalScope.requestAnimationFrame(applyRestore);
      return;
    }

    globalScope.addEventListener(
      "load",
      () => {
        globalScope.requestAnimationFrame(applyRestore);
      },
      { once: true },
    );
  }

  function readStoredSnapshot() {
    try {
      const rawValue = globalScope.sessionStorage.getItem(STATE_STORAGE_KEY);
      if (!rawValue) {
        return null;
      }

      const snapshot = JSON.parse(rawValue);
      if (
        !snapshot ||
        snapshot.pathname !== globalScope.location.pathname ||
        Date.now() - Number(snapshot.createdAt || 0) > RESTORE_TTL_MS
      ) {
        return null;
      }

      return snapshot;
    } catch (_error) {
      return null;
    }
  }

  function clearStoredSnapshot() {
    try {
      globalScope.sessionStorage.removeItem(STATE_STORAGE_KEY);
    } catch (_error) {
      // Ignore storage failures on legacy browsers.
    }
  }

  function processTransportResponse() {
    if (!pendingSubmission || pendingSubmission.cleanedUp) {
      return;
    }

    const responseDocument = pendingSubmission.frame.contentDocument;
    if (!responseDocument || !responseDocument.body || !globalScope.document.body) {
      fallbackToHardReload();
      return;
    }

    try {
      replaceVisibleBody(responseDocument);
      syncDocumentTitle(responseDocument);
      restoreAfterPatchedUpdate(pendingSubmission.snapshot);
      clearStoredSnapshot();
      showToast(
        pendingSubmission.actionName === "ins" ? "已新增，未離開目前頁面" : "已更新任務資訊",
      );
    } catch (_error) {
      fallbackToHardReload();
      return;
    }

    cleanupPendingSubmission();
  }

  function replaceVisibleBody(sourceDocument) {
    const nextBody = globalScope.document.importNode(sourceDocument.body, true);
    globalScope.document.body.replaceWith(nextBody);
  }

  function syncDocumentTitle(sourceDocument) {
    if (sourceDocument.title) {
      globalScope.document.title = sourceDocument.title;
    }
  }

  function restoreAfterPatchedUpdate(snapshot) {
    globalScope.requestAnimationFrame(() => {
      globalScope.scrollTo(snapshot.scrollX || 0, snapshot.scrollY || snapshot.bodyScrollTop || 0);

      const focusTarget =
        (snapshot.activeId && globalScope.document.getElementById(snapshot.activeId)) ||
        (snapshot.activeName &&
          globalScope.document.querySelector(
            `[name="${escapeAttributeValue(snapshot.activeName)}"]`,
          )) ||
        null;

      if (focusTarget instanceof HTMLElement && typeof focusTarget.focus === "function") {
        focusTarget.focus({ preventScroll: true });
      }
    });
  }

  function fallbackToHardReload() {
    cleanupPendingSubmission();
    globalScope.location.reload();
  }

  function cleanupPendingSubmission() {
    if (!pendingSubmission) {
      return;
    }

    pendingSubmission.cleanedUp = true;
    setPendingUi(false, pendingSubmission.actionName);
    pendingSubmission = null;
  }

  function setPendingUi(isPending, actionName) {
    if (!globalScope.document.documentElement) {
      return;
    }

    globalScope.document.documentElement.dataset.ccxpLitePe14dPending = isPending ? actionName : "";
    if (!isPending) {
      return;
    }

    showToast(actionName === "ins" ? "送出中…" : "更新中…", true);
  }

  function ensureToastStyles() {
    if (globalScope.document.getElementById(TOAST_STYLE_ID)) {
      return;
    }

    const styleNode = globalScope.document.createElement("style");
    styleNode.id = TOAST_STYLE_ID;
    styleNode.textContent = `
      #${TOAST_ID} {
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 2147483647;
        max-width: 280px;
        padding: 12px 16px;
        border-radius: 12px;
        background: rgba(17, 24, 39, 0.88);
        color: #ffffff;
        font: 500 14px/1.4 "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif;
        box-shadow: 0 12px 32px rgba(17, 24, 39, 0.28);
        opacity: 0;
        transform: translateY(8px);
        transition: opacity 140ms ease, transform 140ms ease;
        pointer-events: none;
      }

      #${TOAST_ID}[data-visible="true"] {
        opacity: 1;
        transform: translateY(0);
      }
    `;

    (globalScope.document.head || globalScope.document.documentElement).appendChild(styleNode);
  }

  function showToast(message, isPersistent = false) {
    ensureToastStyles();

    let toast = globalScope.document.getElementById(TOAST_ID);
    if (!(toast instanceof HTMLElement)) {
      toast = globalScope.document.createElement("div");
      toast.id = TOAST_ID;
      (globalScope.document.body || globalScope.document.documentElement).appendChild(toast);
    }

    toast.textContent = message;
    toast.dataset.visible = "true";

    if (toast.__ccxpLiteToastTimer) {
      globalScope.clearTimeout(toast.__ccxpLiteToastTimer);
      toast.__ccxpLiteToastTimer = null;
    }

    if (!isPersistent) {
      toast.__ccxpLiteToastTimer = globalScope.setTimeout(() => {
        toast.dataset.visible = "false";
      }, 1800);
    }
  }

  function escapeAttributeValue(value) {
    return String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"');
  }
})(window);
