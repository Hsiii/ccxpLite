(function registerCcxpLiteSharedDom(globalScope: typeof globalThis) {
  const runtimeScope = globalScope;
  const namespace = runtimeScope.CCXP_LITE ?? {};
  const { sharedConstants, sharedTheme, sharedLocale, sharedBrand } = namespace;
  function isArray<T>(value: unknown): value is T[] {
    return value !== null && typeof value === "object" && value.constructor === Array;
  }

  function moveChildNodes(sourceNode: ParentNode & Node, targetNode: ParentNode & Node) {
    while (sourceNode.firstChild) {
      targetNode.append(sourceNode.firstChild);
    }
  }

  function removeNode(node: ChildNode | undefined) {
    if (node && node.parentNode) {
      node.remove();
    }
  }

  function ensureDocumentHead(targetDocument: Document) {
    const existingHead = targetDocument.querySelector("head");
    if (existingHead) {
      return existingHead;
    }
    const root = targetDocument.querySelector("html");
    if (!root) {
      return undefined;
    }
    const head = targetDocument.createElement("head");
    root.prepend(head);
    return head;
  }

  function ensureDocumentBody(targetDocument: Document) {
    const existingBody = targetDocument.querySelector("body");
    if (existingBody) {
      return existingBody;
    }
    const root = targetDocument.querySelector("html");
    if (!root) {
      return undefined;
    }
    const body = targetDocument.createElement("body");
    root.append(body);
    return body;
  }

  function isDocumentComplete(targetDocument: Document) {
    return targetDocument.readyState === "complete";
  }

  function cleanLegacyAttributes(node: Node | undefined) {
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
      if (style !== null && /background(-image)?\s*:/i.test(style)) {
        const htmlElement = el as HTMLElement;
        htmlElement.style.backgroundImage = "none";
        // If it's the body and we want to be very sure:
        if (el.tagName === "BODY") {
          htmlElement.style.background = "var(--ccxp-lite-bg)";
        }
      }
    };
    if (node.nodeType === Node.DOCUMENT_NODE) {
      const doc = node as Document;
      cleanElement(doc.documentElement);
      const legacyNodes = doc.documentElement.querySelectorAll(selector);
      for (const el of legacyNodes) {
        cleanElement(el);
      }
      cleanElement(doc.body);
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
      return typeof chrome !== "undefined";
    } catch {
      return false;
    }
  }

  function invalidateContext() {
    if (namespace.isOrphan === true) {
      return false;
    }
    namespace.isOrphan = true;
    triggerCleanup();
    return false;
  }

  function getRuntimeSafely() {
    if (namespace.isOrphan === true) {
      return undefined;
    }
    try {
      const runtime = typeof chrome === "undefined" ? undefined : chrome.runtime;
      return runtime?.id !== undefined && runtime.id !== "" ? runtime : undefined;
    } catch {
      invalidateContext();
      return undefined;
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
      return undefined;
    }
    try {
      return chrome.storage.local;
    } catch {
      invalidateContext();
      return undefined;
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
    if (namespace.isOrphan === true) {
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
    ensureDocumentHead,
    ensureDocumentBody,
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
    ensureDocumentHead,
    ensureDocumentBody,
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
