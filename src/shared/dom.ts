(function registerCcxpLiteSharedDom(globalScope: Window & typeof globalThis) {
  const namespace = globalScope.CCXP_LITE || (globalScope.CCXP_LITE = {});
  const { sharedConstants, sharedTheme, sharedLocale, sharedBrand } = namespace;

  function moveChildNodes(sourceNode, targetNode) {
    while (sourceNode.firstChild) {
      targetNode.appendChild(sourceNode.firstChild);
    }
  }

  function removeNode(node) {
    if (node && node.parentNode) {
      node.parentNode.removeChild(node);
    }
  }

  function isDocumentComplete(targetDocument) {
    return targetDocument.readyState === "complete";
  }

  function cleanLegacyAttributes(node) {
    if (!node) {
      return;
    }

    const legacyAttrs = ["background", "bgcolor", "text", "link", "vlink", "alink"];
    const selector = legacyAttrs.map((attr) => `[${attr}]`).join(", ");

    const cleanElement = (el) => {
      if (el.nodeType !== Node.ELEMENT_NODE) {
        return;
      }
      legacyAttrs.forEach((attr) => {
        if (el.hasAttribute(attr)) {
          el.removeAttribute(attr);
        }
      });

      const style = el.getAttribute("style");
      if (style && /background(-image)?\s*:/i.test(style)) {
        el.style.backgroundImage = "none";
        // If it's the body and we want to be very sure:
        if (el.tagName === "BODY") {
          el.style.background = "var(--ccxp-lite-bg)";
        }
      }
    };

    if (node.nodeType === Node.DOCUMENT_NODE) {
      if (node.documentElement) {
        cleanElement(node.documentElement);
        const legacyNodes = node.documentElement.querySelectorAll(selector);
        legacyNodes.forEach(cleanElement);
      }
      if (node.body) {
        cleanElement(node.body);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      cleanElement(node);
      const legacyNodes = node.querySelectorAll(selector);
      legacyNodes.forEach(cleanElement);
    }
  }

  function hasRuntimeObject() {
    try {
      return typeof chrome !== "undefined" && !!chrome.runtime;
    } catch (_error) {
      return false;
    }
  }

  function invalidateContext() {
    if (namespace.isOrphan) {
      return false;
    }

    namespace.isOrphan = true;
    triggerCleanup();
    return false;
  }

  function getRuntimeSafely() {
    if (namespace.isOrphan) {
      return null;
    }

    try {
      const runtime = typeof chrome !== "undefined" ? chrome.runtime : null;
      return runtime && runtime.id ? runtime : null;
    } catch (_error) {
      invalidateContext();
      return null;
    }
  }

  function isContextValid() {
    return !!getRuntimeSafely();
  }

  function ensureContextValid() {
    if (isContextValid()) {
      return true;
    }

    if (hasRuntimeObject()) {
      invalidateContext();
    }

    return false;
  }

  function getLocalStorageAreaSafely() {
    const runtime = getRuntimeSafely();
    if (!runtime) {
      return null;
    }

    try {
      return chrome.storage ? chrome.storage.local : null;
    } catch (_error) {
      invalidateContext();
      return null;
    }
  }

  function triggerCleanup() {
    if (Array.isArray(namespace.cleanupTasks)) {
      namespace.cleanupTasks.forEach((task) => {
        try {
          task();
        } catch (_error) {
          // Ignore cleanup errors
        }
      });
      namespace.cleanupTasks = [];
    }
  }

  function addCleanupTask(task) {
    if (typeof task !== "function") {
      return;
    }

    if (namespace.isOrphan) {
      task();
      return;
    }

    if (!Array.isArray(namespace.cleanupTasks)) {
      namespace.cleanupTasks = [];
    }
    namespace.cleanupTasks.push(task);
  }

  namespace.sharedDom = {
    moveChildNodes,
    removeNode,
    isDocumentComplete,
    cleanLegacyAttributes,
    isContextValid,
    ensureContextValid,
    invalidateContext,
    getRuntimeSafely,
    getLocalStorageAreaSafely,
    addCleanupTask,
  };

  if (!sharedConstants || !sharedTheme || !sharedLocale || !sharedBrand) {
    return;
  }

  const { TOKENS, LOCALIZED_STRINGS, SIDEBAR_CATEGORIES, ASSETS } = sharedConstants;
  const { ensureThemeDocument } = sharedTheme;
  const { getLocalizedStrings, normalizeLocale, resolveLocaleFromDocument } = sharedLocale;
  const { createBrandImage, createBrandCopy, createBrandPartnerIcon, createBrandPartnerLink } =
    sharedBrand;

  namespace.shared = {
    TOKENS,
    STRINGS: LOCALIZED_STRINGS.zh,
    LOCALIZED_STRINGS,
    SIDEBAR_CATEGORIES,
    ASSETS,
    ensureThemeDocument,
    getLocalizedStrings,
    normalizeLocale,
    resolveLocaleFromDocument,
    createBrandImage,
    createBrandCopy,
    createBrandPartnerIcon,
    createBrandPartnerLink,
    moveChildNodes,
    removeNode,
    isDocumentComplete,
    cleanLegacyAttributes,
    isContextValid,
    ensureContextValid,
    invalidateContext,
    getRuntimeSafely,
    getLocalStorageAreaSafely,
    addCleanupTask,
  };
})(window);
