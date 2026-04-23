(function bootstrapCcxpLite() {
  const namespace = window.CCXP_LITE || {};
  const { shared, sidebar, landing } = namespace;

  if (!shared || !sidebar || !landing) {
    return;
  }

  const { ensureThemeDocument, removeNode } = shared;
  const { isSupportedInquirePath, isLandingPage, simplifyLandingPage } = landing;

  const RETRY_LIMIT = 40;
  const RETRY_DELAY_MS = 250;
  const LOADING_SPRITE_ID = "ccxp-lite-loading-sprite";
  const LOADING_SPRITE_STYLE_ID = "ccxp-lite-loading-sprite-style";
  const LOADING_SPRITE_TIMEOUT_MS = 8000;

  let attempts = 0;
  const loadingState = initializeLoadingSprite(document);

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

    attachFrameListener(frames.nav, () => {
      sidebar.simplifySidebar(frames.nav, retry, { hostDocument: document });
      updateLoadingStateForNav(frames.nav);
      markMainReady();
    });

    if (frames.top) {
      removeHeader(frames.top);
    }

    ensureAppShell(frames);
    sidebar.simplifySidebar(frames.nav, retry, { hostDocument: document });
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

        body {
          opacity: 0 !important;
        }

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
    if (targetDocument.body) {
      targetDocument.body.dataset.ccxpLiteLoadingReady = "true";
    }

    if (!sprite) {
      return;
    }

    sprite.style.opacity = "0";
    window.setTimeout(() => removeNode(sprite), 180);
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
    if (attempts >= RETRY_LIMIT) {
      return;
    }

    attempts += 1;
    window.setTimeout(attachAndApply, RETRY_DELAY_MS);
  }

  function ensureAppShell(frames) {
    ensureThemeDocument(document, "nav");
    ensureDocumentBody();

    const existingBody = document.getElementById("ccxp-lite-app-body");
    if (existingBody) {
      return existingBody;
    }

    hideLegacyFramesets();

    if (frames.nav) {
      frames.nav.style.display = "none";
    }

    if (frames.main) {
      frames.main.setAttribute("name", "ccxp-lite-legacy-main");
      frames.main.style.display = "none";
    }

    const body = ensureDocumentBody();
    body.id = "ccxp-lite-app-body";
    return body;
  }

  function ensureDocumentBody() {
    if (document.body) {
      return document.body;
    }

    const body = document.createElement("body");
    document.documentElement.appendChild(body);
    return body;
  }

  function hideLegacyFramesets() {
    document.documentElement.dataset.ccxpLiteScope = "nav";
    Array.from(document.querySelectorAll("frameset, frame")).forEach((node) => {
      if (node instanceof HTMLElement) {
        node.style.display = "none";
      } else {
        node.setAttribute("style", "display:none");
      }
    });
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
