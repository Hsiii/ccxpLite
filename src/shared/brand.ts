(function registerCcxpLiteSharedBrand(globalScope) {
  const namespace = globalScope.CCXP_LITE || (globalScope.CCXP_LITE = {});
  const { sharedConstants, sharedLocale } = namespace;

  if (!sharedConstants || !sharedLocale) {
    return;
  }

  const { ASSETS } = sharedConstants;
  const { getLocalizedStrings, resolveLocaleFromDocument } = sharedLocale;

  function createBrandImage(targetDocument, className, assetPath = ASSETS.brandLogoPath) {
    const image = targetDocument.createElement("img");
    image.className = className;
    image.alt = getLocalizedStrings(resolveLocaleFromDocument(targetDocument)).sidebarTitle;
    image.src = chrome.runtime.getURL(assetPath);
    return image;
  }

  function createBrandCopy(targetDocument, containerClassName, titleClassName, title) {
    const copy = targetDocument.createElement("div");
    copy.className = containerClassName;

    const titleNode = targetDocument.createElement("div");
    titleNode.className = titleClassName;

    if (titleClassName === "ccxp-lite-sidebar-brand-title" && title.includes(" ")) {
      title.split(" ").forEach((word) => {
        const wordNode = targetDocument.createElement("span");
        wordNode.textContent = word;
        titleNode.appendChild(wordNode);
      });
    } else {
      titleNode.textContent = title;
    }

    copy.appendChild(titleNode);
    return copy;
  }

  namespace.sharedBrand = {
    createBrandImage,
    createBrandCopy,
  };
})(window);
