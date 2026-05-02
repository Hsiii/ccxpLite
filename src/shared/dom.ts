(function registerCcxpLiteSharedDom(globalScope: Window & typeof globalThis) {
  const namespace = (globalScope.CCXP_LITE ||= {}) as CcxpLiteNamespace;
  const { sharedConstants, sharedTheme, sharedLocale, sharedBrand } = namespace;

  function isArray<T>(value: unknown): value is T[] {
    return Object.prototype.toString.call(value) === "[object Array]";
  }

  function moveChildNodes(sourceNode: ParentNode & Node, targetNode: ParentNode & Node) {
    while (sourceNode.firstChild) {
      targetNode.append(sourceNode.firstChild);
    }
  }

  function removeNode(node: ChildNode | null) {
    if (node && node.parentNode) {
      node.remove();
    }
  }

  function isDocumentComplete(targetDocument: Document) {
    return targetDocument.readyState === "complete";
  }

  function cleanLegacyAttributes(node: Node | null) {
    if (!node) {
      return;
    }

    const legacyAttrs = ["background", "bgcolor", "text", "link", "vlink", "alink"];
    const selector = legacyAttrs.map((attr) => `[${attr}]`).join(", ");

    const cleanElement = (el: Element) => {
      if (el.nodeType !== Node.ELEMENT_NODE) {
        return;
      }
      for (const attr of legacyAttrs) {
        if (el.hasAttribute(attr)) {
          el.removeAttribute(attr);
        }
      }

      const style = el.getAttribute("style");
      if (style && /background(-image)?\s*:/i.test(style)) {
        (el as HTMLElement).style.backgroundImage = "none";
        // If it's the body and we want to be very sure:
        if (el.tagName === "BODY") {
          (el as HTMLElement).style.background = "var(--ccxp-lite-bg)";
        }
      }
    };

    if (node.nodeType === Node.DOCUMENT_NODE) {
      const doc = node as Document;
      if (doc.documentElement) {
        cleanElement(doc.documentElement);
        const legacyNodes = doc.documentElement.querySelectorAll(selector);
        for (const el of legacyNodes) {
          cleanElement(el);
        }
      }
      if (doc.body) {
        cleanElement(doc.body);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      cleanElement(el);
      const legacyNodes = el.querySelectorAll(selector);
      for (const item of legacyNodes) {
        cleanElement(item);
      }
    }
  }

  function hasRuntimeObject() {
    try {
      return typeof chrome !== "undefined" && Boolean(chrome.runtime);
    } catch {
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
      const runtime = typeof chrome === "undefined" ? null : chrome.runtime;
      return runtime && runtime.id ? runtime : null;
    } catch {
      invalidateContext();
      return null;
    }
  }

  function isContextValid() {
    return Boolean(getRuntimeSafely());
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
    } catch {
      invalidateContext();
      return null;
    }
  }

  function triggerCleanup() {
    if (isArray(namespace.cleanupTasks)) {
      for (const task of namespace.cleanupTasks) {
        try {
          task();
        } catch {
          // Ignore cleanup errors
        }
      }
      namespace.cleanupTasks = [];
    }
  }

  function addCleanupTask(task: () => void) {
    if (typeof task !== "function") {
      return;
    }

    if (namespace.isOrphan) {
      task();
      return;
    }

    if (!isArray(namespace.cleanupTasks)) {
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
    invalidateContext: () => {
      invalidateContext();
    },
    getRuntimeSafely,
    getLocalStorageAreaSafely,
    addCleanupTask,
  };
})(globalThis);
