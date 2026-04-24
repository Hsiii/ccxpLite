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
  const EMBEDDED_DESTINATION_COLUMNS = "*,0";
  const LEGACY_MAIN_COLUMNS = `${TOKENS.sidebarWidth},*`;
  const LEGACY_MAIN_PATH_PREFIXES = ["/ccxp/INQUIRE/PE/1/14D/"];

  function shouldOpenLeafInDestination(linkItem, navDocument) {
    if ((linkItem?.target || "main").toLowerCase() !== "main") {
      return false;
    }

    const resolvedUrl = resolveLeafUrl(linkItem, navDocument);
    if (!resolvedUrl) {
      return false;
    }

    return !isLegacyMainOnlyRoute(resolvedUrl);
  }

  function openLeafDestination(targetDocument, navDocument, linkItem, rerender) {
    const state = getSidebarUiState(targetDocument);

    if (!shouldOpenLeafInDestination(linkItem, navDocument)) {
      state.activeLeaf = null;
      state.legacyMainActive = true;
      showLegacyMainFrame();
      activateLegacyLink(linkItem, navDocument);
      return;
    }

    persistSidebarScroll(targetDocument, "category");
    state.legacyMainActive = false;
    state.activeLeaf = {
      id: linkItem.id,
      label: linkItem.label,
      href: linkItem.href,
      target: linkItem.target,
      clickLinkArgs: linkItem.clickLinkArgs,
      nonce: Date.now(),
    };
    hideLegacyMainFrame();
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
    const resolvedUrl = resolveLeafUrl(activeLeaf, navDocument);
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

  function getInnerFrameset() {
    try {
      const scopeDocument = window.top ? window.top.document : document;
      return scopeDocument.querySelector("frameset[cols]") || null;
    } catch (_error) {
      return null;
    }
  }

  function showLegacyMainFrame() {
    const innerFrameset = getInnerFrameset();
    if (innerFrameset) {
      innerFrameset.setAttribute("cols", LEGACY_MAIN_COLUMNS);
    }
  }

  function hideLegacyMainFrame() {
    const innerFrameset = getInnerFrameset();
    if (innerFrameset) {
      innerFrameset.setAttribute("cols", EMBEDDED_DESTINATION_COLUMNS);
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

    const resolvedUrl = resolveLeafUrl(linkItem, navDocument);
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

  function resolveLeafUrl(linkItem, navDocument) {
    return new URL(linkItem.href, navDocument.location.href).toString();
  }

  function isLegacyMainOnlyRoute(resolvedUrl) {
    try {
      const url = new URL(resolvedUrl);
      return LEGACY_MAIN_PATH_PREFIXES.some((pathPrefix) => url.pathname.startsWith(pathPrefix));
    } catch (_error) {
      return false;
    }
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
    showLegacyMainFrame,
    hideLegacyMainFrame,
    captureInitialMainFrameUrl,
    openLeafInNewTab,
    activateLegacyLink,
    isExternalLinkTarget,
  };
})(window);
