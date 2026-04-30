(function bootstrapCcxpLite() {
  const namespace = (globalThis.CCXP_LITE || {}) as CcxpLiteNamespace;
  const { shared } = namespace;
  const { sidebar } = namespace;
  const { landing } = namespace;

  if (!shared || !sidebar || !landing) {
    return;
  }

  const { TOKENS, removeNode, ensureThemeDocument, cleanLegacyAttributes } = shared;
  const { isSupportedInquirePath, isLandingPage, simplifyLandingPage } = landing;

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

  shared.addCleanupTask(() => {
    if (loadingState) {
      loadingState.released = true;
      releaseLoadingSprite(document);
    }

    // Clear frame markers so new version can re-attach
    const frames = findFrames();
    [frames.nav, frames.main, frames.top].forEach((frame) => {
      if (frame) {
        frame.removeAttribute("data-ccxp-lite-listener-attached");
      }
    });
  });

  function attachAndApply() {
    if (isLandingPage(document)) {
      landing.preloadLandingCaptcha(document);
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

    applyFramesetLayout();
    attachFrameListener(frames.nav, () => {
      sidebar.simplifySidebar(frames.nav, retry);
      updateLoadingStateForNav(frames.nav);
      markMainReady();
    });
    attachFrameListener(frames.main, () => {
      simplifyMainFrame(frames.main);
    });

    if (frames.top) {
      removeHeader(frames.top);
    }

    sidebar.simplifySidebar(frames.nav, retry);
    simplifyMainFrame(frames.main);
    updateLoadingStateForNav(frames.nav);
    markMainReady();
  }

  function initializeLoadingSprite(targetDocument: Document) {
    if (!isSupportedInquirePath(targetDocument)) {
      return null;
    }

    ensureLoadingSprite(targetDocument);

    const state: {
      navReady: boolean;
      mainReady: boolean;
      timerId: number | null;
      released: boolean;
    } = {
      navReady: false,
      mainReady: false,
      timerId: null,
      released: false,
    };

    state.timerId = globalThis.setTimeout(() => {
      releaseLoadingSprite(targetDocument);
      state.released = true;
    }, LOADING_SPRITE_TIMEOUT_MS);

    return state;
  }

  function ensureLoadingSprite(targetDocument: Document) {
    if (!targetDocument || !targetDocument.documentElement) {
      return;
    }

    if (!targetDocument.getElementById(LOADING_SPRITE_STYLE_ID)) {
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

      if (targetDocument.head) {
        targetDocument.head.append(styleNode);
      } else {
        targetDocument.documentElement.append(styleNode);
      }
    }

    if (!targetDocument.getElementById(LOADING_SPRITE_ID)) {
      const sprite = targetDocument.createElement("div");
      sprite.id = LOADING_SPRITE_ID;
      targetDocument.documentElement.append(sprite);
    }
  }

  function releaseLoadingSprite(targetDocument: Document) {
    const sprite = targetDocument.getElementById(LOADING_SPRITE_ID);
    const styleNode = targetDocument.getElementById(LOADING_SPRITE_STYLE_ID);

    if (targetDocument.documentElement) {
      targetDocument.documentElement.dataset.ccxpLiteLoadingReady = "true";
    }

    if (targetDocument.body) {
      targetDocument.body.dataset.ccxpLiteLoadingReady = "true";
    }

    if (sprite) {
      sprite.style.opacity = "0";
    }

    globalThis.setTimeout(() => {
      removeNode(sprite);
      removeNode(styleNode);
    }, 180);
  }

  function updateLoadingStateForNav(navFrame: HTMLIFrameElement | null) {
    if (!loadingState || loadingState.released) {
      return;
    }

    const navDocument = navFrame && navFrame.contentDocument;
    if (
      navDocument &&
      navDocument.body &&
      navDocument.body.dataset.ccxpLiteSidebarApplied === "true"
    ) {
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

    if (loadingState.timerId !== null) {
      globalThis.clearTimeout(loadingState.timerId);
    }

    loadingState.released = true;
    releaseLoadingSprite(document);
  }

  function findFrames() {
    const frameCandidates = Array.from(document.querySelectorAll<HTMLIFrameElement>("frame"));
    const top = frameCandidates.find((frame) => {
      const src = (frame.getAttribute("src") || "").toLowerCase();
      const name = (frame.getAttribute("name") || "").toLowerCase();
      return src.includes("top.php") || src.includes("top.html") || name === "top";
    });

    const navBySource = frameCandidates.find((frame) => {
      const src = (frame.getAttribute("src") || "").toLowerCase();
      return src.includes("in_inq_stu.php") || src.includes("in_inq_stu.html");
    });

    const main = frameCandidates.find((frame) => {
      const name = (frame.getAttribute("name") || "").toLowerCase();
      return name === "main";
    });

    const navByName = frameCandidates.find((frame) => {
      const name = (frame.getAttribute("name") || "").toLowerCase();
      return name === "nav" || name === "menu" || name === "left" || name === "list";
    });

    const navFallback = frameCandidates.find((frame) => frame !== top && frame !== main) || null;
    const nav = navBySource || navByName || navFallback;

    return { top, nav, main };
  }

  function attachFrameListener(frame: HTMLIFrameElement, callback: () => void) {
    if (frame.dataset.ccxpLiteListenerAttached === "true") {
      return;
    }

    frame.addEventListener("load", callback);
    frame.dataset.ccxpLiteListenerAttached = "true";

    const poll = () => {
      if (!shared.ensureContextValid()) {
        return;
      }

      try {
        const doc = frame.contentDocument;
        if (doc && doc.documentElement && doc.head && doc.body) {
          const isMain = (frame.getAttribute("name") || "").toLowerCase() === "main";
          const expectedScope = isMain ? "main" : "nav";

          if (doc.documentElement.dataset.ccxpLiteScope !== expectedScope) {
            callback();
          }
        }
      } catch {
        // Ignore cross-origin frame access errors
      }

      globalThis.requestAnimationFrame(poll);
    };

    globalThis.requestAnimationFrame(poll);
  }

  function retry() {
    if (attempts >= RETRY_LIMIT || !shared.ensureContextValid()) {
      return;
    }

    attempts += 1;
    globalThis.setTimeout(attachAndApply, RETRY_DELAY_MS);
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

    if (!topDocument || !topDocument.body || !topDocument.head) {
      retry();
      return;
    }

    if (topDocument.body.dataset.ccxpLiteHeaderRemoved === "true") {
      return;
    }

    topDocument.documentElement.style.display = "none";
    topDocument.body.replaceChildren();
    topDocument.body.dataset.ccxpLiteHeaderRemoved = "true";
    topFrame.setAttribute("scrolling", "no");
  }

  function simplifyMainFrame(mainFrame: HTMLIFrameElement | null) {
    const mainDocument = mainFrame && mainFrame.contentDocument;
    if (!mainDocument || !mainDocument.body || !mainDocument.head) {
      return;
    }

    ensureThemeDocument(mainDocument, "main");
    cleanLegacyAttributes(mainDocument);
    mainDocument.body.classList.add(TOKENS.mainClass);
    mainDocument.body.style.setProperty("background-image", "none", "important");
    mainDocument.body.style.setProperty("background-color", "var(--ccxp-lite-bg)", "important");

    // Mount lab button to main frame if in classic mode
    const { sidebarState, sidebarUi, shared: sharedLib } = globalThis.CCXP_LITE || {};
    if (sidebarState && sidebarUi && sharedLib) {
      const state = sidebarState.getSidebarUiState(mainDocument);
      const strings = sharedLib.getLocalizedStrings(
        sharedLib.resolveLocaleFromDocument(mainDocument),
      );
      if (state.sidebarVariant === "classic") {
        sidebarUi.mountSidebarVariantSwitch(
          mainDocument,
          state,
          strings,
          () => {
            try {
              (window.top || globalThis).location.reload();
            } catch {
              globalThis.location.reload();
            }
          },
          null,
        );
      }
    }
  }

  attachAndApply();
})();
