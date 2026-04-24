(function registerCcxpLiteSharedDom(globalScope) {
  const namespace = globalScope.CCXP_LITE || (globalScope.CCXP_LITE = {});

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

  namespace.sharedDom = {
    moveChildNodes,
    removeNode,
    isDocumentComplete,
    cleanLegacyAttributes,
  };
})(window);
