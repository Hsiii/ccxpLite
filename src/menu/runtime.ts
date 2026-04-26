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
  const EXTERNAL_LINK_PATH_PREFIXES = ["/ccxp/INQUIRE/PE/1/14D/"];

  function shouldOpenLeafInDestination(linkItem, navDocument) {
    if ((linkItem?.target || "main").toLowerCase() !== "main") {
      return false;
    }

    const resolvedUrl = resolveLeafUrl(linkItem, navDocument);
    if (!resolvedUrl) {
      return false;
    }

    return !isExternalLinkOnlyRoute(resolvedUrl);
  }

  function openLeafDestination(targetDocument, navDocument, linkItem, rerender) {
    if (!shouldOpenLeafInDestination(linkItem, navDocument)) {
      openLeafInNewTab(linkItem, navDocument);
      return;
    }

    const legacyMainFrame = getLegacyMainFrame();
    if (legacyMainFrame) {
      activateLegacyLink(linkItem, navDocument, legacyMainFrame);
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

  function isExternalLinkTarget(linkItem, navDocument) {
    const normalizedTarget =
      typeof linkItem === "string"
        ? linkItem.toLowerCase()
        : (linkItem?.target || "main").toLowerCase();
    if (normalizedTarget === "_blank") {
      return true;
    }

    if (!linkItem || typeof linkItem === "string" || !navDocument) {
      return false;
    }

    const resolvedUrl = resolveLeafUrl(linkItem, navDocument);
    return isExternalLinkOnlyRoute(resolvedUrl);
  }

  function resolveLeafUrl(linkItem, navDocument) {
    return new URL(linkItem.href, navDocument.location.href).toString();
  }

  function isExternalLinkOnlyRoute(resolvedUrl) {
    try {
      const url = new URL(resolvedUrl);
      return EXTERNAL_LINK_PATH_PREFIXES.some((pathPrefix) => url.pathname.startsWith(pathPrefix));
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
    captureInitialMainFrameUrl,
    openLeafInNewTab,
    activateLegacyLink,
    isExternalLinkTarget,
  };
})(window);
