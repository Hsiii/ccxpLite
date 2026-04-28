(function registerCcxpLiteSidebarRuntime(globalScope: Window & typeof globalThis) {
  const namespace = (globalScope.CCXP_LITE || (globalScope.CCXP_LITE = {})) as CcxpLiteNamespace;
  const { shared, sidebarState, sidebarFavorites } = namespace;
  if (!shared || !sidebarState || !sidebarFavorites) {
    return;
  }

  const { TOKENS, ensureThemeDocument, cleanLegacyAttributes } = shared;
  const { getSidebarUiState, persistSidebarScroll } = sidebarState;
  const { getScopedSessionStorage, INITIAL_MAIN_URL_STORAGE_KEY } = sidebarFavorites;
  const DESTINATION_LOAD_TIMEOUT_MS = 8000;
  const EXTERNAL_LINK_PATH_PREFIXES = ["/ccxp/INQUIRE/PE/1/14D/"];

  function shouldOpenLeafInDestination(linkItem: CcxpLiteSidebarLinkItem, navDocument: Document) {
    if ((linkItem?.target || "main").toLowerCase() !== "main") {
      return false;
    }

    const resolvedUrl = resolveLeafUrl(linkItem, navDocument);
    if (!resolvedUrl) {
      return false;
    }

    return !isExternalLinkOnlyRoute(resolvedUrl);
  }

  function openLeafDestination(
    targetDocument: Document,
    navDocument: Document,
    linkItem: CcxpLiteSidebarLinkItem,
    rerender: () => void,
  ) {
    if (!shouldOpenLeafInDestination(linkItem, navDocument)) {
      openLeafInNewTab(linkItem, navDocument);
      return;
    }

    const state = getSidebarUiState(targetDocument);
    const legacyMainFrame = getLegacyMainFrame();
    if (state.sidebarVariant === "classic" && legacyMainFrame) {
      activateLegacyLink(linkItem, navDocument, legacyMainFrame);
      return;
    }

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

  function simplifyEmbeddedFrame(frame: HTMLIFrameElement | HTMLFrameElement) {
    const frameDocument = frame.contentDocument;
    if (!frameDocument || !frameDocument.body || !frameDocument.head) {
      return;
    }

    ensureThemeDocument(frameDocument, "main");
    cleanLegacyAttributes(frameDocument);
    frameDocument.body.classList.add(TOKENS.mainClass as string);

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
    } catch {
      return;
    }

    const currentUrl = readInitialFrameHref();
    if (!currentUrl) {
      return;
    }

    try {
      storage.setItem(INITIAL_MAIN_URL_STORAGE_KEY, currentUrl);
    } catch {
      // Ignore session storage failures.
    }
  }

  function openLeafInNewTab(activeLeaf: CcxpLiteSidebarLinkItem, navDocument: Document) {
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
    } catch {
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
    } catch {
      return null;
    }
  }

  function activateLegacyLink(
    linkItem: CcxpLiteSidebarLinkItem,
    navDocument: Document,
    destinationFrame: HTMLIFrameElement | HTMLFrameElement | null = null,
  ) {
    if (linkItem.clickLinkArgs) {
      const helperFrame = navDocument.querySelector("iframe[name='frame_7472']");
      const helperUrl = new URL("JH/JH01.php", navDocument.location.href);
      helperUrl.searchParams.set("ACIXSTORE", readAcixstore(navDocument.location.href));
      helperUrl.searchParams.set("name", linkItem.clickLinkArgs.name);
      helperUrl.searchParams.set("url", linkItem.clickLinkArgs.url);

      if (helperFrame && (helperFrame as HTMLIFrameElement).contentWindow) {
        const helperWindow = (helperFrame as HTMLIFrameElement).contentWindow;
        if (helperWindow) {
          helperWindow.location.replace(helperUrl.toString());
        }
      } else if (helperFrame) {
        helperFrame.setAttribute("src", helperUrl.toString());
      }
    }

    const resolvedUrl = resolveLeafUrl(linkItem, navDocument);
    const normalizedTarget = (linkItem.target || "main").toLowerCase();
    const resolvedDestinationFrame =
      normalizedTarget === "main" ? destinationFrame || getLegacyMainFrame() : destinationFrame;

    if (normalizedTarget === "_blank") {
      window.open(resolvedUrl, "_blank", "noopener");
      return;
    }

    if (normalizedTarget === "_top") {
      window.top.location.href = resolvedUrl;
      return;
    }

    if (normalizedTarget === "main" && resolvedDestinationFrame) {
      resolvedDestinationFrame.src = resolvedUrl;
      return;
    }

    window.location.href = resolvedUrl;
  }

  function isExternalLinkTarget(linkItem: CcxpLiteSidebarLinkItem | string, navDocument: Document) {
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

  function resolveLeafUrl(linkItem: CcxpLiteSidebarLinkItem, navDocument: Document) {
    return new URL(linkItem.href, navDocument.location.href).toString();
  }

  function isExternalLinkOnlyRoute(resolvedUrl: string) {
    try {
      const url = new URL(resolvedUrl);
      return EXTERNAL_LINK_PATH_PREFIXES.some((pathPrefix) => url.pathname.startsWith(pathPrefix));
    } catch {
      return false;
    }
  }

  function readAcixstore(locationHref: string) {
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
