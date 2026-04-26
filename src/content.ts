(function bootstrapCcxpLite() {
  const namespace = window.CCXP_LITE || {};
  const { shared, sidebar, landing } = namespace;

  if (!shared || !sidebar || !landing) {
    return;
  }

  const { removeNode } = shared;
  const { isSupportedInquirePath, isLandingPage, simplifyLandingPage } = landing;

  const RETRY_LIMIT = 40;
  const RETRY_DELAY_MS = 250;
  const LAYERED_FRAMESET_COLUMNS = "*,0";
  const CLASSIC_FRAMESET_COLUMNS = "288,*";
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

    if (frames.top) {
      removeHeader(frames.top);
    }

    sidebar.simplifySidebar(frames.nav, retry);
    updateLoadingStateForNav(frames.nav);
    markMainReady();
  }

  function initializeLoadingSprite(targetDocument) {
    if (!isSupportedInquirePath(targetDocument)) {
      return null;
    }

    ensureLoadingSprite(targetDocument);

    const state = {
      navReady: false,
      mainReady: false,
      timerId: null,
      released: false,
    };

    state.timerId = window.setTimeout(() => {
      releaseLoadingSprite(targetDocument);
      state.released = true;
    }, LOADING_SPRITE_TIMEOUT_MS);

    return state;
  }

  function ensureLoadingSprite(targetDocument) {
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
        targetDocument.head.appendChild(styleNode);
      } else {
        targetDocument.documentElement.appendChild(styleNode);
      }
    }

    if (!targetDocument.getElementById(LOADING_SPRITE_ID)) {
      const sprite = targetDocument.createElement("div");
      sprite.id = LOADING_SPRITE_ID;
      targetDocument.documentElement.appendChild(sprite);
    }
  }

  function releaseLoadingSprite(targetDocument) {
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

    window.setTimeout(() => {
      removeNode(sprite);
      removeNode(styleNode);
    }, 180);
  }

  function updateLoadingStateForNav(navFrame) {
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

    if (loadingState.timerId) {
      window.clearTimeout(loadingState.timerId);
    }

    loadingState.released = true;
    releaseLoadingSprite(document);
  }

  function findFrames() {
    const frameCandidates = Array.from(document.querySelectorAll("frame"));
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

  function attachFrameListener(frame, callback) {
    if (frame.dataset.ccxpLiteListenerAttached === "true") {
      return;
    }

    frame.addEventListener("load", callback);
    frame.dataset.ccxpLiteListenerAttached = "true";
  }

  function retry() {
    if (attempts >= RETRY_LIMIT || !shared.ensureContextValid()) {
      return;
    }

    attempts += 1;
    window.setTimeout(attachAndApply, RETRY_DELAY_MS);
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
      return window.localStorage.getItem(SIDEBAR_VARIANT_STORAGE_KEY) === "classic"
        ? "classic"
        : "layered";
    } catch (_error) {
      return "layered";
    }
  }

  function getFramesetColumnsForVariant(variant) {
    return variant === "classic" ? CLASSIC_FRAMESET_COLUMNS : LAYERED_FRAMESET_COLUMNS;
  }

  function removeHeader(topFrame) {
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

  attachAndApply();
})();
