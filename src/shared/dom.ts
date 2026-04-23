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

  namespace.sharedDom = {
    moveChildNodes,
    removeNode,
    isDocumentComplete,
  };
})(window);
