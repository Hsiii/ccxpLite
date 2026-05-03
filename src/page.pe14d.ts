(function registerCcxpLitePe14dPatch(globalScope: typeof globalThis) {
  const runtimeScope = globalScope as typeof globalThis & {
    __ccxpLitePe14dPatchInstalled?: boolean;
    toSubmit?: CcxpLiteWrappedSubmit;
  };
  const PAGE_FLAG = "__ccxpLitePe14dPatchInstalled";
  const TRANSPORT_FRAME_ID = "ccxp-lite-pe14d-transport";
  const TRANSPORT_FRAME_NAME = "ccxp-lite-pe14d-transport";
  const STATE_STORAGE_KEY = "ccxp-lite-pe14d-submit-state";
  const INTERCEPTED_ACTIONS: ReadonlySet<string> = new Set(["getLabInsList", "ins"]);
  const RESTORE_TTL_MS = 30_000;
  if (runtimeScope[PAGE_FLAG] === true) {
    return;
  }
  runtimeScope[PAGE_FLAG] = true;
  let pendingSubmission:
    | {
        actionName: string;
        snapshot: CcxpLitePe14dSnapshot;
        originalTarget: string;
        frame: HTMLIFrameElement;
        cleanedUp: boolean;
      }
    | undefined;
  function isSupportedPage() {
    return /^\/ccxp\/inquire\/pe\/1\/14d\/.+/i.test(globalScope.location.pathname);
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
      const currentToSubmit = runtimeScope.toSubmit;
      if (typeof currentToSubmit !== "function") {
        globalScope.setTimeout(installAttempt, 150, undefined);
        return;
      }
      if (currentToSubmit.__ccxpLiteWrapped === true) {
        return;
      }
      const originalToSubmit = currentToSubmit;
      const wrappedToSubmit = function wrappedToSubmit(
        this: unknown,
        form: HTMLFormElement,
        actionName?: string,
        actionValue?: string,
      ) {
        if (!shouldInterceptSubmission(form, actionName ?? "")) {
          return originalToSubmit.call(this, form, actionName, actionValue);
        }
        return submitThroughTransport(originalToSubmit, form, actionName ?? "", actionValue);
      };
      wrappedToSubmit.__ccxpLiteWrapped = true;
      wrappedToSubmit.__ccxpLiteOriginal = originalToSubmit;
      runtimeScope.toSubmit = wrappedToSubmit;
      globalScope.setTimeout(installAttempt, 500, undefined);
    };
    installAttempt();
  }

  function shouldInterceptSubmission(_form: HTMLFormElement, actionName: string) {
    return INTERCEPTED_ACTIONS.has(actionName);
  }

  function submitThroughTransport(
    originalToSubmit: CcxpLiteWrappedSubmit,
    form: HTMLFormElement,
    actionName: string,
    actionValue?: string,
  ): unknown {
    if (pendingSubmission) {
      return false;
    }
    const transportFrame = ensureTransportFrame();
    const snapshot = captureSnapshot(form, actionName);
    pendingSubmission = {
      actionName,
      snapshot,
      originalTarget: form.getAttribute("target") ?? "",
      frame: transportFrame,
      cleanedUp: false,
    };
    const { originalTarget } = pendingSubmission;
    persistSnapshot(snapshot);
    transportFrame.addEventListener("load", processTransportResponse, { once: true });
    form.setAttribute("target", TRANSPORT_FRAME_NAME);
    try {
      originalToSubmit.call(globalScope, form, actionName, actionValue);
    } catch {
      cleanupPendingSubmission();
      if (originalTarget === "") {
        form.removeAttribute("target");
      } else {
        form.setAttribute("target", originalTarget);
      }
    } finally {
      globalScope.setTimeout(
        () => {
          if (originalTarget === "") {
            form.removeAttribute("target");
          } else {
            form.setAttribute("target", originalTarget);
          }
        },
        0,
        undefined,
      );
    }
    return false;
  }

  function ensureTransportFrame() {
    let frame = globalScope.document.querySelector<HTMLIFrameElement>(
      `#${CSS.escape(TRANSPORT_FRAME_ID)}`,
    );
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
    const host = globalScope.document.documentElement;
    host.append(frame);
    return frame;
  }

  function captureSnapshot(form: HTMLFormElement, actionName: string): CcxpLitePe14dSnapshot {
    const { activeElement } = globalScope.document;
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
          ? activeElement.name
          : "",
      activeId: activeElement instanceof HTMLElement ? activeElement.id : "",
      bodyScrollTop: globalScope.document.documentElement.scrollTop,
      formId: form.id,
    };
  }

  function persistSnapshot(snapshot: CcxpLitePe14dSnapshot) {
    try {
      globalScope.sessionStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
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
      globalScope.scrollTo(snapshot.scrollX, snapshot.scrollY);
      const focusTarget =
        (snapshot.activeId === ""
          ? undefined
          : globalScope.document.querySelector(`#${CSS.escape(snapshot.activeId)}`)) ??
        (snapshot.activeName === ""
          ? undefined
          : globalScope.document.querySelector(
              `[name="${escapeAttributeValue(snapshot.activeName)}"]`,
            ));
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
      if (rawValue === null || rawValue === "") {
        return undefined;
      }
      const snapshot = JSON.parse(rawValue) as CcxpLitePe14dSnapshot;
      if (
        snapshot.pathname !== globalScope.location.pathname ||
        Date.now() - snapshot.createdAt > RESTORE_TTL_MS
      ) {
        return undefined;
      }
      return snapshot;
    } catch {
      return undefined;
    }
  }

  function clearStoredSnapshot() {
    try {
      globalScope.sessionStorage.removeItem(STATE_STORAGE_KEY);
    } catch {
      // Ignore storage failures on legacy browsers.
    }
  }

  function processTransportResponse() {
    const currentSubmission = pendingSubmission;
    if (!currentSubmission) {
      return;
    }
    if (currentSubmission.cleanedUp) {
      return;
    }
    const responseDocument = currentSubmission.frame.contentDocument;
    if (!responseDocument) {
      fallbackToHardReload();
      return;
    }
    try {
      replaceVisibleBody(responseDocument);
      syncDocumentTitle(responseDocument);
      restoreAfterPatchedUpdate(currentSubmission.snapshot);
      clearStoredSnapshot();
    } catch {
      fallbackToHardReload();
      return;
    }
    cleanupPendingSubmission();
  }

  function replaceVisibleBody(sourceDocument: Document) {
    const nextBody = runtimeScope.document.importNode(sourceDocument.body, true);
    runtimeScope.document.body.replaceWith(nextBody as Node);
  }

  function syncDocumentTitle(sourceDocument: Document) {
    if (sourceDocument.title !== "") {
      runtimeScope.document.title = sourceDocument.title;
    }
  }

  function restoreAfterPatchedUpdate(snapshot: CcxpLitePe14dSnapshot) {
    globalScope.requestAnimationFrame(() => {
      globalScope.scrollTo(snapshot.scrollX, snapshot.scrollY);
      const focusTarget =
        (snapshot.activeId === ""
          ? undefined
          : globalScope.document.querySelector(`#${CSS.escape(snapshot.activeId)}`)) ??
        (snapshot.activeName === ""
          ? undefined
          : globalScope.document.querySelector(
              `[name="${escapeAttributeValue(snapshot.activeName)}"]`,
            ));
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
    pendingSubmission = undefined;
  }

  function escapeAttributeValue(value: string | undefined): string {
    return (value ?? "").replaceAll("\\", "\\\\").replaceAll('"', String.raw`\"`);
  }
})(globalThis);
