(function registerCcxpLitePe14dPatch(globalScope: Window & typeof globalThis) {
  const PAGE_FLAG = "__ccxpLitePe14dPatchInstalled";
  const TRANSPORT_FRAME_ID = "ccxp-lite-pe14d-transport";
  const TRANSPORT_FRAME_NAME = "ccxp-lite-pe14d-transport";
  const STATE_STORAGE_KEY = "ccxp-lite-pe14d-submit-state";
  const INTERCEPTED_ACTIONS = new Set(["getLabInsList", "ins"]);
  const RESTORE_TTL_MS = 30000;

  if (globalScope[PAGE_FLAG]) {
    return;
  }

  globalScope[PAGE_FLAG] = true;

  let wrappedToSubmit = null;
  let pendingSubmission: {
    actionName: string;
    snapshot: CcxpLitePe14dSnapshot;
    originalTarget: string;
    frame: HTMLIFrameElement;
    cleanedUp: boolean;
  } | null = null;

  function isSupportedPage() {
    return /^\/ccxp\/INQUIRE\/PE\/1\/14D\/.+/i.test(globalScope.location.pathname);
  }

  if (!isSupportedPage()) {
    return;
  }

  restorePageState();
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

      wrappedToSubmit = function ccxpLiteWrappedToSubmit(
        form: HTMLFormElement,
        actionName?: string,
        actionValue?: string,
      ) {
        if (!shouldInterceptSubmission(form, actionName as string)) {
          return originalToSubmit.call(this, form, actionName, actionValue);
        }

        return submitThroughTransport(originalToSubmit, form, actionName as string, actionValue);
      };

      wrappedToSubmit.__ccxpLiteWrapped = true;
      wrappedToSubmit.__ccxpLiteOriginal = originalToSubmit;
      globalScope.toSubmit = wrappedToSubmit;

      globalScope.setTimeout(installAttempt, 500);
    };

    installAttempt();
  }

  function shouldInterceptSubmission(form: HTMLFormElement | null, actionName: string) {
    return Boolean(form && INTERCEPTED_ACTIONS.has(String(actionName || "")));
  }

  function submitThroughTransport(
    originalToSubmit: CcxpLiteWrappedSubmit,
    form: HTMLFormElement,
    actionName: string,
    actionValue?: string,
  ) {
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
    let frame = globalScope.document.getElementById(TRANSPORT_FRAME_ID) as HTMLIFrameElement | null;
    if (frame instanceof HTMLIFrameElement) {
      return frame;
    }

    frame = globalScope.document.createElement("iframe") as HTMLIFrameElement;
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

  function captureSnapshot(form: HTMLFormElement, actionName: string): CcxpLitePe14dSnapshot {
    const activeElement = globalScope.document.activeElement;
    return {
      actionName,
      createdAt: Date.now(),
      pathname: globalScope.location.pathname,
      scrollX: globalScope.scrollX,
      scrollY: globalScope.scrollY,
      activeName:
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLButtonElement ||
        activeElement instanceof HTMLSelectElement ||
        activeElement instanceof HTMLTextAreaElement
          ? activeElement.name || ""
          : "",
      activeId: activeElement instanceof HTMLElement ? activeElement.id || "" : "",
      bodyScrollTop: globalScope.document.documentElement
        ? globalScope.document.documentElement.scrollTop
        : 0,
      formId: form.id || "",
    };
  }

  function persistSnapshot(snapshot: CcxpLitePe14dSnapshot) {
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
      globalScope.scrollTo(
        (snapshot.scrollX || 0) as number,
        (snapshot.scrollY || snapshot.bodyScrollTop || 0) as number,
      );
      const focusTarget =
        (snapshot.activeId && globalScope.document.getElementById(snapshot.activeId)) ||
        (snapshot.activeName &&
          globalScope.document.querySelector(
            `[name="${escapeAttributeValue(snapshot.activeName as string)}"]`,
          )) ||
        null;
      if (focusTarget instanceof HTMLElement && typeof focusTarget.focus === "function") {
        focusTarget.focus({ preventScroll: true });
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

      const snapshot = JSON.parse(rawValue) as CcxpLitePe14dSnapshot;
      if (
        !snapshot ||
        snapshot.pathname !== globalScope.location.pathname ||
        Date.now() - Number(snapshot.createdAt || 0) > RESTORE_TTL_MS
      ) {
        return null;
      }

      return snapshot as CcxpLitePe14dSnapshot;
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
    } catch (_error) {
      fallbackToHardReload();
      return;
    }

    cleanupPendingSubmission();
  }

  function replaceVisibleBody(sourceDocument: Document) {
    const nextBody = globalScope.document.importNode(sourceDocument.body, true);
    globalScope.document.body.replaceWith(nextBody as Node);
  }

  function syncDocumentTitle(sourceDocument: Document) {
    if (sourceDocument.title) {
      globalScope.document.title = sourceDocument.title;
    }
  }

  function restoreAfterPatchedUpdate(snapshot: CcxpLitePe14dSnapshot) {
    globalScope.requestAnimationFrame(() => {
      globalScope.scrollTo(
        (snapshot.scrollX || 0) as number,
        (snapshot.scrollY || snapshot.bodyScrollTop || 0) as number,
      );
      const focusTarget =
        (snapshot.activeId && globalScope.document.getElementById(snapshot.activeId)) ||
        (snapshot.activeName &&
          globalScope.document.querySelector(
            `[name="${escapeAttributeValue(snapshot.activeName as string)}"]`,
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
    pendingSubmission = null;
  }

  function escapeAttributeValue(value) {
    return String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"');
  }
})(window);
