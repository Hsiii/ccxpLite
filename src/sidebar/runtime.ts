// @ts-nocheck
(function registerCcxpLiteSidebarRuntime(globalScope) {
  const namespace = globalScope.CCXP_LITE || (globalScope.CCXP_LITE = {});
  const { shared, sidebarState, sidebarFavorites } = namespace;
  if (!shared || !sidebarState || !sidebarFavorites) {
    return;
  }

  const { TOKENS, ensureThemeDocument, cleanLegacyAttributes } = shared;
  const { getSidebarUiState, persistSidebarScroll } = sidebarState;
  const { getScopedSessionStorage, INITIAL_MAIN_URL_STORAGE_KEY } = sidebarFavorites;
  const DESTINATION_LOAD_TIMEOUT_MS = 8000;

  function shouldOpenLeafInDestination(target) {
    return (target || "main").toLowerCase() === "main";
  }

  function openLeafDestination(targetDocument, navDocument, linkItem, rerender) {
    if (!shouldOpenLeafInDestination(linkItem.target)) {
      activateLegacyLink(linkItem, navDocument);
      return;
    }

    const state = getSidebarUiState(targetDocument);
    persistSidebarScroll(targetDocument, "category");
    state.activeLeaf = {
      id: linkItem.id,
      label: linkItem.label,
      href: linkItem.href,
      target: linkItem.target,
      clickLinkArgs: linkItem.clickLinkArgs,
      nonce: Date.now(),
    };
    captureInitialMainFrameUrl();
    rerender();
  }

  function simplifyEmbeddedFrame(frame) {
    const frameDocument = frame.contentDocument;
    if (!frameDocument || !frameDocument.body || !frameDocument.head) {
      return;
    }

    ensureThemeDocument(frameDocument, "main");
    cleanLegacyAttributes(frameDocument);
    frameDocument.body.classList.add(TOKENS.mainClass);

    // Force style override as a last resort
    frameDocument.body.style.setProperty("background-image", "none", "important");
    frameDocument.body.style.setProperty("background-color", "var(--ccxp-lite-bg)", "important");
  }

  function captureInitialMainFrameUrl() {
    const storage = getScopedSessionStorage();
    if (!storage) {
      return;
    }

    try {
      if (storage.getItem(INITIAL_MAIN_URL_STORAGE_KEY)) {
        return;
      }
    } catch (_error) {
      return;
    }

    const currentUrl = readInitialFrameHref();
    if (!currentUrl) {
      return;
    }

    try {
      storage.setItem(INITIAL_MAIN_URL_STORAGE_KEY, currentUrl);
    } catch (_error) {
      // Ignore session storage failures.
    }
  }

  function openLeafInNewTab(activeLeaf, navDocument) {
    const resolvedUrl = new URL(activeLeaf.href, navDocument.location.href).toString();
    window.open(resolvedUrl, "_blank", "noopener");
  }

  function readInitialFrameHref() {
    try {
      const frame = getLegacyMainFrame();
      if (!frame) {
        return "";
      }

      const scopeDocument = window.top ? window.top.document : document;
      const src = frame.getAttribute("src") || "";
      return src ? new URL(src, scopeDocument.location.href).toString() : "";
    } catch (_error) {
      return "";
    }
  }

  function getLegacyMainFrame() {
    try {
      const scopeDocument = window.top ? window.top.document : document;
      return (
        scopeDocument.querySelector("frame[name='main']") ||
        scopeDocument.querySelector("frame[name='ccxp-lite-legacy-main']") ||
        null
      );
    } catch (_error) {
      return null;
    }
  }

  function activateLegacyLink(linkItem, navDocument, destinationFrame = null) {
    if (linkItem.clickLinkArgs) {
      const helperFrame = navDocument.querySelector("iframe[name='frame_7472']");
      const helperUrl = new URL("JH/JH01.php", navDocument.location.href);
      helperUrl.searchParams.set("ACIXSTORE", readAcixstore(navDocument.location.href));
      helperUrl.searchParams.set("name", linkItem.clickLinkArgs.name);
      helperUrl.searchParams.set("url", linkItem.clickLinkArgs.url);

      if (helperFrame && helperFrame.contentWindow) {
        helperFrame.contentWindow.location.replace(helperUrl.toString());
      } else if (helperFrame) {
        helperFrame.setAttribute("src", helperUrl.toString());
      }
    }

    const resolvedUrl = new URL(linkItem.href, navDocument.location.href).toString();
    const normalizedTarget = (linkItem.target || "main").toLowerCase();

    if (normalizedTarget === "_blank") {
      window.open(resolvedUrl, "_blank", "noopener");
      return;
    }

    if (normalizedTarget === "_top") {
      window.top.location.href = resolvedUrl;
      return;
    }

    if (normalizedTarget === "main" && destinationFrame) {
      destinationFrame.src = resolvedUrl;
      return;
    }

    window.location.href = resolvedUrl;
  }

  function isExternalLinkTarget(target) {
    return (target || "main").toLowerCase() === "_blank";
  }

  function readAcixstore(locationHref) {
    const url = new URL(locationHref);
    return url.searchParams.get("ACIXSTORE") || "";
  }

  namespace.sidebarRuntime = {
    DESTINATION_LOAD_TIMEOUT_MS,
    shouldOpenLeafInDestination,
    openLeafDestination,
    simplifyEmbeddedFrame,
    getLegacyMainFrame,
    captureInitialMainFrameUrl,
    openLeafInNewTab,
    activateLegacyLink,
    isExternalLinkTarget,
  };
})(window);
