(function bootstrapCcxpLite() {
  const namespace = globalThis.CCXP_LITE ?? {};
  const { shared } = namespace;
  const { sidebar } = namespace;
  const { landing } = namespace;
  if (!shared || !sidebar || !landing) {
    return;
  }
  const sharedLib = shared;
  const sidebarLib = sidebar;
  const landingLib = landing;
  const { TOKENS, removeNode, ensureThemeDocument, cleanLegacyAttributes } = sharedLib;
  const { isSupportedInquirePath, isLandingPage, simplifyLandingPage } = landingLib;
  const RETRY_LIMIT = 40;
  const RETRY_DELAY_MS = 250;
  const LAYERED_FRAMESET_COLUMNS = "*,0";
  const CLASSIC_FRAMESET_COLUMNS = "324,*";
  const FRAMESET_ROWS = "0,*";
  const LOADING_SPRITE_ID = "ccxp-lite-loading-sprite";
  const LOADING_SPRITE_STYLE_ID = "ccxp-lite-loading-sprite-style";
  const LOADING_SPRITE_TIMEOUT_MS = 8000;
  const SIDEBAR_VARIANT_STORAGE_KEY = "ccxp-lite-sidebar-variant";
  let attempts = 0;
  const loadingState = initializeLoadingSprite(document);
  sharedLib.addCleanupTask(() => {
    if (loadingState) {
      loadingState.released = true;
      releaseLoadingSprite(document);
    }
    // Clear frame markers so the new version can re-attach.
    const frames = findFrames();
    for (const frame of [frames.nav, frames.main, frames.top]) {
      if (frame) {
        delete frame.dataset.ccxpLiteListenerAttached;
      }
    }
  });
  function attachAndApply() {
    if (isLandingPage(document)) {
      landingLib.preloadLandingCaptcha(document);
      simplifyLandingPage(document, {
        retry,
        onReady: markLandingReady,
      });
      return;
    }
    const frames = findFrames();
    if (!frames.nav || !frames.main) {
      retry();
      return;
    }
    const navFrame = frames.nav;
    const mainFrame = frames.main;
    applyFramesetLayout();
    attachFrameListener(navFrame, () => {
      sidebarLib.simplifySidebar(navFrame, retry);
      updateLoadingStateForNav(navFrame);
      markMainReady();
    });
    attachFrameListener(mainFrame, () => {
      simplifyMainFrame(mainFrame);
    });
    if (frames.top) {
      removeHeader(frames.top);
    }
    sidebarLib.simplifySidebar(navFrame, retry);
    simplifyMainFrame(mainFrame);
    updateLoadingStateForNav(navFrame);
    markMainReady();
  }

  function initializeLoadingSprite(targetDocument: Document) {
    if (!isSupportedInquirePath(targetDocument)) {
      return undefined;
    }
    ensureLoadingSprite(targetDocument);
    const state: {
      navReady: boolean;
      mainReady: boolean;
      timerId: number | undefined;
      released: boolean;
    } = {
      navReady: false,
      mainReady: false,
      timerId: undefined,
      released: false,
    };
    state.timerId = globalThis.setTimeout(
      () => {
        releaseLoadingSprite(targetDocument);
        state.released = true;
      },
      LOADING_SPRITE_TIMEOUT_MS,
      undefined,
    );
    return state;
  }

  function ensureLoadingSprite(targetDocument: Document) {
    if (!targetDocument.querySelector(`#${CSS.escape(LOADING_SPRITE_STYLE_ID)}`)) {
      const styleNode = targetDocument.createElement("style");
      styleNode.id = LOADING_SPRITE_STYLE_ID;
      styleNode.textContent = `
        html, body {
          background: #ffffff !important;
        }

        html:not([data-ccxp-lite-loading-ready="true"]) body {
          opacity: 0 !important;
        }

        html[data-ccxp-lite-loading-ready="true"] body,
        body[data-ccxp-lite-loading-ready="true"] {
          opacity: 1 !important;
          transition: opacity 120ms ease;
        }

        #${LOADING_SPRITE_ID} {
          position: fixed;
          inset: 0;
          z-index: 2147483647;
          pointer-events: none;
          background: #ffffff;
          opacity: 1;
          transition: opacity 160ms ease;
        }

        #${LOADING_SPRITE_ID}::after {
          content: "";
          position: absolute;
          top: 50%;
          left: 50%;
          width: 22px;
          height: 22px;
          transform: translate(-50%, -50%);
          border-radius: 999px;
          background: #ffffff;
          box-shadow: 0 0 0 1px rgba(17, 24, 39, 0.08), 0 8px 24px rgba(17, 24, 39, 0.08);
        }
      `;
      targetDocument.head.append(styleNode);
    }
    if (!targetDocument.querySelector(`#${CSS.escape(LOADING_SPRITE_ID)}`)) {
      const sprite = targetDocument.createElement("div");
      sprite.id = LOADING_SPRITE_ID;
      targetDocument.documentElement.append(sprite);
    }
  }

  function releaseLoadingSprite(targetDocument: Document) {
    const sprite = targetDocument.querySelector<HTMLElement>(`#${CSS.escape(LOADING_SPRITE_ID)}`);
    const styleNode = targetDocument.querySelector<HTMLElement>(
      `#${CSS.escape(LOADING_SPRITE_STYLE_ID)}`,
    );
    const targetDocumentElement = targetDocument.documentElement;
    targetDocumentElement.dataset.ccxpLiteLoadingReady = "true";
    const targetBody = targetDocument.body;
    targetBody.dataset.ccxpLiteLoadingReady = "true";
    if (sprite) {
      sprite.style.opacity = "0";
    }
    globalThis.setTimeout(
      () => {
        removeNode(sprite ?? undefined);
        removeNode(styleNode ?? undefined);
      },
      180,
      undefined,
    );
  }

  function updateLoadingStateForNav(navFrame: HTMLIFrameElement | undefined) {
    if (!loadingState || loadingState.released) {
      return;
    }
    const navDocument = navFrame && navFrame.contentDocument;
    if (navDocument && navDocument.body.dataset.ccxpLiteSidebarApplied === "true") {
      loadingState.navReady = true;
    }
    tryReleaseLoadingSprite();
  }

  function markMainReady() {
    if (!loadingState || loadingState.released) {
      return;
    }
    loadingState.mainReady = true;
    tryReleaseLoadingSprite();
  }

  function markLandingReady() {
    if (!loadingState || loadingState.released) {
      return;
    }
    loadingState.navReady = true;
    loadingState.mainReady = true;
    tryReleaseLoadingSprite();
  }

  function tryReleaseLoadingSprite() {
    if (!loadingState || loadingState.released) {
      return;
    }
    if (!loadingState.navReady || !loadingState.mainReady) {
      return;
    }
    if (loadingState.timerId !== undefined) {
      globalThis.clearTimeout(loadingState.timerId);
    }
    loadingState.released = true;
    releaseLoadingSprite(document);
  }

  function findFrames() {
    const frameCandidates = [...document.querySelectorAll<HTMLIFrameElement>("frame")];
    const top = frameCandidates.find((frame) => {
      const src = (frame.getAttribute("src") ?? "").toLowerCase();
      const name = (frame.getAttribute("name") ?? "").toLowerCase();
      return src.includes("top.php") || src.includes("top.html") || name === "top";
    });
    const navBySource = frameCandidates.find((frame) => {
      const src = (frame.getAttribute("src") ?? "").toLowerCase();
      return src.includes("in_inq_stu.php") || src.includes("in_inq_stu.html");
    });
    const main = frameCandidates.find((frame) => {
      const name = (frame.getAttribute("name") ?? "").toLowerCase();
      return name === "main";
    });
    const navByName = frameCandidates.find((frame) => {
      const name = (frame.getAttribute("name") ?? "").toLowerCase();
      return name === "nav" || name === "menu" || name === "left" || name === "list";
    });
    const navFallback = frameCandidates.find((frame) => frame !== top && frame !== main);
    const nav = navBySource ?? navByName ?? navFallback;
    return { top, nav, main };
  }

  function attachFrameListener(frame: HTMLIFrameElement, callback: () => void) {
    if (frame.dataset.ccxpLiteListenerAttached === "true") {
      return;
    }
    frame.addEventListener("load", callback);
    const targetFrame = frame;
    targetFrame.dataset.ccxpLiteListenerAttached = "true";
    const poll = () => {
      if (!sharedLib.ensureContextValid()) {
        return;
      }
      try {
        const doc = frame.contentDocument;
        if (doc && doc.readyState !== "loading") {
          const isMain = (frame.getAttribute("name") ?? "").toLowerCase() === "main";
          const expectedScope = isMain ? "main" : "nav";
          if (doc.documentElement.dataset.ccxpLiteScope !== expectedScope) {
            callback();
          }
        }
      } catch {
        // Ignore cross-origin frame access errors.
      }
      globalThis.requestAnimationFrame(poll);
    };
    globalThis.requestAnimationFrame(poll);
  }

  function retry() {
    if (attempts >= RETRY_LIMIT || !sharedLib.ensureContextValid()) {
      return;
    }
    attempts++;
    globalThis.setTimeout(attachAndApply, RETRY_DELAY_MS, undefined);
  }

  function applyFramesetLayout() {
    const topFrameset = document.querySelector("frameset[rows]");
    const innerFrameset = document.querySelector("frameset[cols]");
    if (topFrameset) {
      topFrameset.setAttribute("rows", FRAMESET_ROWS);
    }
    if (innerFrameset) {
      innerFrameset.setAttribute("cols", getFramesetColumnsForVariant(readSidebarVariant()));
    }
  }

  function readSidebarVariant() {
    try {
      const storedValue = globalThis.localStorage.getItem(SIDEBAR_VARIANT_STORAGE_KEY);
      return storedValue === "layered" ? "layered" : "classic";
    } catch {
      return "classic";
    }
  }

  function getFramesetColumnsForVariant(variant: string) {
    return variant === "classic" ? CLASSIC_FRAMESET_COLUMNS : LAYERED_FRAMESET_COLUMNS;
  }

  function removeHeader(topFrame: HTMLIFrameElement) {
    const topDocument = topFrame.contentDocument;
    if (!topDocument) {
      retry();
      return;
    }
    if (topDocument.body.dataset.ccxpLiteHeaderRemoved === "true") {
      return;
    }
    topDocument.documentElement.style.display = "none";
    topDocument.body.textContent = "";
    topDocument.body.dataset.ccxpLiteHeaderRemoved = "true";
    topFrame.setAttribute("scrolling", "no");
  }

  function simplifyMainFrame(mainFrame: HTMLIFrameElement | undefined) {
    const mainDocument = mainFrame && mainFrame.contentDocument;
    if (!mainDocument) {
      return;
    }
    ensureThemeDocument(mainDocument, "main");
    cleanLegacyAttributes(mainDocument);
    mainDocument.body.classList.add(TOKENS.mainClass);
    mainDocument.body.style.setProperty("background-image", "none", "important");
    mainDocument.body.style.setProperty("background-color", "var(--ccxp-lite-bg)", "important");
    // Mount the lab button to the main frame in classic mode.
    const { sidebarState, sidebarUi, shared: sharedNamespace } = globalThis.CCXP_LITE ?? {};
    if (sidebarState && sidebarUi && sharedNamespace) {
      const state = sidebarState.getSidebarUiState(mainDocument);
      const strings = sharedNamespace.getLocalizedStrings(
        sharedNamespace.resolveLocaleFromDocument(mainDocument),
      );
      if (state.sidebarVariant === "classic") {
        sidebarUi.mountSidebarVariantSwitch(
          mainDocument,
          state,
          strings,
          () => {
            try {
              (window.top ?? globalThis).location.reload();
            } catch {
              globalThis.location.reload();
            }
          },
          undefined,
        );
      }
    }
  }
  attachAndApply();
})();
