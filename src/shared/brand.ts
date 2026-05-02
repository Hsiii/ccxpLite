(function registerCcxpLiteSharedBrand(globalScope: Window & typeof globalThis) {
  const runtimeScope = globalScope;
  const namespace = (runtimeScope.CCXP_LITE ||= {}) as CcxpLiteNamespace;
  const { sharedConstants, sharedLocale } = namespace;
  if (!sharedConstants || !sharedLocale) {
    return;
  }

  const { ASSETS } = sharedConstants;
  const { getLocalizedStrings, resolveLocaleFromDocument } = sharedLocale;

  function createBrandImage(
    targetDocument: Document,
    className: string,
    assetPath = ASSETS.brandLogoPath,
  ) {
    const runtime = namespace.sharedDom?.getRuntimeSafely();
    const image = targetDocument.createElement("img");
    image.className = className;
    image.alt = getLocalizedStrings(resolveLocaleFromDocument(targetDocument)).sidebarTitle;

    if (runtime) {
      image.src = runtime.getURL(assetPath);
    }

    return image;
  }

  function createBrandCopy(
    targetDocument: Document,
    containerClassName: string,
    titleClassName: string,
    title: string,
  ) {
    const copy = targetDocument.createElement("div");
    copy.className = containerClassName;

    const titleNode = targetDocument.createElement("div");
    titleNode.className = titleClassName;

    if (titleClassName === "ccxp-lite-sidebar-brand-title" && title.includes(" ")) {
      for (const word of title.split(" ")) {
        const wordNode = targetDocument.createElement("span");
        wordNode.textContent = word;
        titleNode.append(wordNode);
      }
    } else {
      titleNode.textContent = title;
    }

    copy.append(titleNode);
    return copy;
  }

  function createBrandPartnerIcon(targetDocument: Document) {
    const icon = targetDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("class", "ccxp-lite-sidebar-brand-partner-icon");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "2");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    icon.setAttribute("aria-hidden", "true");

    for (const pathData of ["M18 6 6 18", "M6 6l12 12"]) {
      const path = targetDocument.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathData);
      icon.append(path);
    }

    return icon;
  }

  function createBrandPartnerLink(
    targetDocument: Document,
    options: {
      markClassName?: string;
      linkClassName?: string;
      labelClassName?: string;
      label?: string;
    } = {},
  ) {
    const mark = targetDocument.createElement("span");
    mark.className = options.markClassName || "";
    mark.append(createBrandPartnerIcon(targetDocument));

    const link = targetDocument.createElement("button");
    link.type = "button";
    link.className = options.linkClassName || "";
    link.setAttribute("aria-label", options.label || "");
    link.setAttribute("title", options.label || "");

    const label = targetDocument.createElement("span");
    label.className = options.labelClassName || "";
    label.textContent = options.label || "";
    link.append(label);

    return { mark, link };
  }

  namespace.sharedBrand = {
    createBrandImage,
    createBrandCopy,
    createBrandPartnerIcon,
    createBrandPartnerLink,
  };
})(globalThis);
