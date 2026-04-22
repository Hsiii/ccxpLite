(function registerCcxpLiteSidebar(globalScope) {
  const namespace = globalScope.CCXP_LITE || (globalScope.CCXP_LITE = {});
  const { shared } = namespace;
  const { TOKENS, STRINGS, SIDEBAR_CATEGORIES, ASSETS, ensureThemeDocument, getLocalizedStrings, resolveLocaleFromDocument, createBrandImage, createBrandCopy } = shared;
  const FAVORITES_STORAGE_SCOPE_PATH = "/ccxp/INQUIRE/select_entry.php";
  const FAVORITES_STORAGE_KEY = `ccxp-lite-sidebar-favorites::${FAVORITES_STORAGE_SCOPE_PATH}`;
  const favoriteState = {
    ids: new Set(),
    hasLoaded: false,
    pendingLoad: null
  };
  const favoriteSubscribers = new Set();
  let favoriteStorageSyncBound = false;

  function simplifySidebar(navFrame, retry) {
    const navDocument = navFrame.contentDocument;

    if (!navDocument || !navDocument.body || !navDocument.head) {
      retry();
      return;
    }

    if (navDocument.body.dataset.ccxpLiteSidebarApplied !== "true" && !shared.isDocumentComplete(navDocument)) {
      retry();
      return;
    }

    const rawTree = parseSidebarTree(navDocument);

    if (!rawTree || !Array.isArray(rawTree.children)) {
      retry();
      return;
    }

    ensureThemeDocument(navDocument, "nav");
    const strings = getLocalizedStrings(resolveLocaleFromDocument(navDocument));

    if (navDocument.body.dataset.ccxpLiteSidebarApplied !== "true") {
      const helperFrame = navDocument.querySelector("iframe[name='frame_7472']");
      const shell = navDocument.createElement("div");
      shell.className = TOKENS.sidebarClass;
      const header = navDocument.createElement("div");
      header.className = "ccxp-lite-sidebar-header";

      const brand = navDocument.createElement("div");
      brand.className = "ccxp-lite-sidebar-brand";
      brand.appendChild(createBrandImage(navDocument, "ccxp-lite-sidebar-brand-logo", ASSETS.sidebarBrandLogoPath));
      brand.appendChild(createBrandCopy(navDocument, "ccxp-lite-sidebar-brand-copy", "ccxp-lite-sidebar-brand-title", strings.sidebarTitle));

      const divider = navDocument.createElement("div");
      divider.className = "ccxp-lite-sidebar-divider";

      const search = createSidebarSearch(navDocument, strings);

      const list = navDocument.createElement("aside");
      list.className = "ccxp-lite-sidebar-list";

      header.appendChild(brand);
      header.appendChild(divider);
      header.appendChild(search);
      shell.appendChild(header);
      shell.appendChild(list);

      navDocument.body.replaceChildren(shell);

      if (helperFrame) {
        helperFrame.style.display = "none";
        navDocument.body.appendChild(helperFrame);
      }

      navDocument.body.dataset.ccxpLiteSidebarApplied = "true";
    }

    const rerender = () => renderSidebar(navDocument, () => buildSidebarModel(rawTree, navDocument, strings), strings);
    ensureFavoriteStorageSync();
    favoriteSubscribers.add(rerender);
    ensureFavoriteIdsLoaded(rerender);
    rerender();
  }

  function buildSidebarModel(root, navDocument, strings) {
    const normalizedItems = (root.children || [])
      .map((entry, index) => normalizeRootEntry(entry, index, navDocument))
      .filter(Boolean);
    const favoriteIds = getFavoriteIds();
    const items = buildCategorizedSidebarItems(normalizedItems, favoriteIds, strings);

    return {
      items,
      initialExpandedItemIds: favoriteIds.size > 0 ? ["category-favorites"] : []
    };
  }

  function buildCategorizedSidebarItems(items, favoriteIds, strings = STRINGS) {
    const buckets = new Map(SIDEBAR_CATEGORIES.map((category) => [category.id, []]));
    const favoriteLinks = [];

    items.forEach((item) => {
      collectFavoriteLinks(item, favoriteIds, favoriteLinks);
      const category = findCategoryForItem(item);
      if (category) {
        buckets.get(category.id).push(item);
      }
    });

    return [
      {
        id: "category-favorites",
        label: strings.sidebarCategoryFavorites || "常用功能",
        icon: "star",
        directLinks: dedupeLinkItems(favoriteLinks),
        sections: [],
        emptyMessage: strings.sidebarFavoritesEmpty || "Press star at any function to save it here",
        kind: "category"
      },
      ...SIDEBAR_CATEGORIES
      .map((category) => {
        const categoryItems = buckets.get(category.id) || [];
        if (categoryItems.length === 0) {
          return null;
        }

        return {
          id: `category-${category.id}`,
          label: strings[category.labelKey] || category.fallbackLabel || category.id,
          icon: category.icon,
          directLinks: categoryItems.filter((item) => item.kind === "link").map((item) => item.linkItem),
          sections: categoryItems.filter((item) => item.kind !== "link"),
          emptyMessage: strings.emptyGroup,
          kind: "category"
        };
      })
      .filter(Boolean)
    ].filter(Boolean);
  }

  function findCategoryForItem(item) {
    const candidateLabels = collectSidebarLabels(item);

    return SIDEBAR_CATEGORIES.find((category) =>
      category.itemLabels.some((label) => {
        const normalizedCategoryLabel = normalizeSidebarLabel(label);
        return candidateLabels.some((candidateLabel) => isSidebarLabelMatch(candidateLabel, normalizedCategoryLabel));
      })
    ) || null;
  }

  function normalizeSidebarLabel(label) {
    return String(label || "")
      .replace(/[()（）]/g, " ")
      .replace(/[,&]/g, " ")
      .replace(/\s*\/\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function collectSidebarLabels(item) {
    if (!item) {
      return [];
    }

    const labels = [];
    const itemLabel = normalizeSidebarLabel(item.label);
    if (itemLabel) {
      labels.push(itemLabel);
    }

    (item.directLinks || []).forEach((linkItem) => {
      const linkLabel = normalizeSidebarLabel(linkItem.label);
      if (linkLabel) {
        labels.push(linkLabel);
      }
    });

    (item.sections || []).forEach((section) => {
      labels.push(...collectSidebarLabels(section));
    });

    return labels;
  }

  function isSidebarLabelMatch(candidateLabel, normalizedCategoryLabel) {
    if (!candidateLabel || !normalizedCategoryLabel) {
      return false;
    }

    return normalizedCategoryLabel === candidateLabel
      || candidateLabel.includes(normalizedCategoryLabel)
      || normalizedCategoryLabel.includes(candidateLabel);
  }

  function normalizeRootEntry(entryNode, index, navDocument) {
    if (!entryNode) {
      return null;
    }

    if (entryNode.children) {
      return normalizeTopLevelGroup(entryNode, index, navDocument);
    }

    const linkItem = normalizeLinkItem(entryNode, navDocument, []);
    if (!linkItem) {
      return null;
    }

    return {
      id: `link-${index}`,
      label: linkItem.label,
      linkItem,
      kind: "link"
    };
  }

  function normalizeTopLevelGroup(folderNode, index, navDocument) {
    const directLinks = [];
    const sections = [];
    const groupLabel = toPlainText(folderNode.desc, navDocument);
    const groupPathSegments = buildFavoritePathSegments([], groupLabel, `group-${index}`);

    (folderNode.children || []).forEach((childNode) => {
      if (childNode && childNode.children) {
        const section = normalizeSectionNode(childNode, `${index}-${sections.length}`, navDocument, groupPathSegments);
        if (section) {
          sections.push(section);
        }
        return;
      }

      const linkItem = normalizeLinkItem(childNode, navDocument, groupPathSegments);
      if (linkItem) {
        directLinks.push(linkItem);
      }
    });

    return {
      id: `group-${index}`,
      label: groupLabel,
      directLinks,
      sections,
      kind: "group"
    };
  }

  function normalizeSectionNode(folderNode, indexKey, navDocument, parentPathSegments) {
    const directLinks = [];
    const sections = [];
    const label = toPlainText(folderNode.desc, navDocument);
    const sectionPathSegments = buildFavoritePathSegments(parentPathSegments, label, `section-${indexKey}`);

    (folderNode.children || []).forEach((childNode) => {
      if (childNode && childNode.children) {
        const section = normalizeSectionNode(childNode, `${indexKey}-${sections.length}`, navDocument, sectionPathSegments);
        if (section) {
          sections.push(section);
        }
        return;
      }

      const linkItem = normalizeLinkItem(childNode, navDocument, sectionPathSegments);
      if (linkItem) {
        directLinks.push(linkItem);
      }
    });

    if (!label && directLinks.length === 0 && sections.length === 0) {
      return null;
    }

    return {
      id: `section-${indexKey}`,
      label,
      directLinks,
      sections,
      kind: "section"
    };
  }

  function normalizeLinkItem(itemNode, navDocument, parentPathSegments) {
    if (!itemNode || typeof itemNode.link !== "string") {
      return null;
    }

    const parsedLink = parseLegacyLink(itemNode.link);

    if (!parsedLink.href) {
      return null;
    }

    const rawHtml = String(itemNode.desc || "");
    const label = toPlainText(rawHtml, navDocument);
    const clickLinkArgs = parseClickLinkArgs(rawHtml);
    const pathSegments = buildFavoritePathSegments(parentPathSegments, label);
    return {
      id: createLinkId({
        label,
        pathSegments,
        href: parsedLink.href,
        target: parsedLink.target,
        clickLinkArgs
      }),
      legacyId: createLegacyLinkId({
        label,
        href: parsedLink.href,
        target: parsedLink.target,
        clickLinkArgs
      }),
      label,
      pathSegments,
      href: parsedLink.href,
      target: parsedLink.target,
      clickLinkArgs
    };
  }

  function parseLegacyLink(rawLink) {
    const hrefMatch = rawLink.match(/^'([^']+)'/);
    const targetMatch = rawLink.match(/target="?([^"\s]+)"?/i);

    return {
      href: hrefMatch ? hrefMatch[1] : "",
      target: targetMatch ? targetMatch[1] : "main"
    };
  }

  function parseClickLinkArgs(rawHtml) {
    const match = rawHtml.match(/ClickLink\("([^"]+)","([^"]+)"\)/);
    if (!match) {
      return null;
    }

    return {
      name: match[1],
      url: match[2]
    };
  }

  function toPlainText(rawHtml, navDocument) {
    if (!rawHtml) {
      return "";
    }

    const extractedVisibleText = extractLegacyVisibleText(rawHtml);
    if (extractedVisibleText) {
      return extractedVisibleText;
    }

    const scratch = navDocument.createElement("div");
    scratch.innerHTML = String(rawHtml)
      .replace(/onClick='[^']*'/gi, "")
      .replace(/\\"/g, "&quot;")
      .replace(/\\'/g, "&#39;")
      .replace(/<br\s*\/?>/gi, " ");
    return (scratch.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function extractLegacyVisibleText(rawHtml) {
    return [...String(rawHtml).replace(/<br\s*\/?>/gi, "\n").matchAll(/>([^<>]+)/g)]
      .map((match) => String(match[1] || "").replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  function renderSidebar(navDocument, modelInput, strings = STRINGS) {
    const shell = navDocument.querySelector(`.${TOKENS.sidebarClass}`);
    if (!shell) {
      return;
    }

    const sidebarList = shell.querySelector(".ccxp-lite-sidebar-list");
    if (!sidebarList) {
      return;
    }

    const searchInput = shell.querySelector(".ccxp-lite-sidebar-search-input");
    if (searchInput && searchInput.dataset.ccxpLiteSearchBound !== "true") {
      searchInput.addEventListener("input", () => renderSidebar(navDocument, modelInput, strings));
      searchInput.dataset.ccxpLiteSearchBound = "true";
    }
    const model = typeof modelInput === "function" ? modelInput() : modelInput;
    const searchQuery = searchInput ? searchInput.value.trim() : "";
    const activeModel = searchQuery
      ? filterSidebarModel(model, searchQuery)
      : model;
    const initialExpandedIds = new Set(model.initialExpandedItemIds || []);
    const storedExpandedIds = shell.dataset.expandedItemIds
      ? shell.dataset.expandedItemIds.split(",").filter(Boolean)
      : null;
    let expandedItemIds = new Set(
      searchQuery
        ? Array.from(activeModel.initialExpandedItemIds || [])
        : storedExpandedIds && storedExpandedIds.length > 0
          ? storedExpandedIds.filter((itemId) => model.items.some((item) => hasExpandableId(item, itemId)))
          : Array.from(initialExpandedIds)
    );
    const hasFavoritesCategory = activeModel.items.some((item) => item && item.id === "category-favorites");
    if (hasFavoritesCategory) {
      expandedItemIds.add("category-favorites");
    }

    const renderItems = () => {
      if (!searchQuery) {
        shell.dataset.expandedItemIds = Array.from(expandedItemIds).join(",");
      }
      sidebarList.innerHTML = "";

      if (activeModel.items.length === 0) {
        sidebarList.innerHTML = `<div class="ccxp-lite-empty">${searchQuery ? strings.sidebarSearchNoResults : strings.emptyGroup}</div>`;
        return;
      }

      activeModel.items.forEach((item) => {
        if (item.kind === "category" || item.kind === "group" || item.kind === "section") {
          sidebarList.appendChild(createExpandableGroup(navDocument, item, expandedItemIds, 0, strings, (groupId) => {
            if (expandedItemIds.has(groupId)) {
              expandedItemIds.delete(groupId);
            } else {
              expandedItemIds.add(groupId);
            }
            renderItems();
          }, () => renderSidebar(navDocument, modelInput, strings)));
          return;
        }

        sidebarList.appendChild(createLinkButton(navDocument, item.linkItem, "ccxp-lite-item", 0, strings, () => renderSidebar(navDocument, modelInput, strings)));
      });
    };

    renderItems();
  }

  function createExpandableGroup(targetDocument, group, expandedItemIds, depth, strings, onToggle, onFavoritesChange) {
    const isExpanded = expandedItemIds.has(group.id);
    const linkList = targetDocument.createElement("div");
    linkList.className = `ccxp-lite-sidebar-group${group.kind === "category" ? " ccxp-lite-category" : ""}`;

    const button = targetDocument.createElement("button");
    button.type = "button";
    button.className = "ccxp-lite-row-button ccxp-lite-expandable";
    button.setAttribute("aria-expanded", isExpanded ? "true" : "false");
    button.setAttribute("title", group.label);
    button.style.setProperty("--ccxp-lite-row-depth", String(getSidebarIndentLevel(group.kind, depth)));

    const leading = targetDocument.createElement("span");
    if (group.kind === "category") {
      leading.className = "ccxp-lite-row-leading";
      leading.appendChild(createCategoryIcon(targetDocument, group.icon));
      button.appendChild(leading);
    } else if (depth > 0) {
      button.appendChild(createRowLeadingSpacer(targetDocument));
    }

    button.appendChild(createRowLabel(targetDocument, group.label));
    button.appendChild(createChevronIcon(targetDocument, isExpanded));
    button.addEventListener("click", () => onToggle(group.id));

    linkList.appendChild(button);

    if (isExpanded) {
      const children = targetDocument.createElement("div");
      children.className = "ccxp-lite-link-list";
      if (group.kind === "category") {
        children.classList.add("ccxp-lite-link-list-first-layer");
      }

      group.directLinks.forEach((linkItem) => {
        children.appendChild(createLinkButton(targetDocument, linkItem, "ccxp-lite-item", depth + 1, strings, onFavoritesChange));
      });

      group.sections.forEach((section) => {
        children.appendChild(createExpandableGroup(targetDocument, section, expandedItemIds, depth + 1, strings, onToggle, onFavoritesChange));
      });

      if (children.childElementCount > 0) {
        linkList.appendChild(children);
      } else {
        const empty = targetDocument.createElement("div");
        empty.className = `ccxp-lite-empty${group.id === "category-favorites" ? " ccxp-lite-empty-favorites" : ""}`;
        empty.textContent = group.emptyMessage || strings.emptyGroup;
        linkList.appendChild(empty);
      }
    }

    return linkList;
  }

  function createSidebarSearch(targetDocument, strings) {
    const search = targetDocument.createElement("label");
    search.className = "ccxp-lite-sidebar-search";

    search.appendChild(createSearchIcon(targetDocument));

    const input = targetDocument.createElement("input");
    input.className = "ccxp-lite-sidebar-search-input";
    input.type = "search";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.placeholder = strings.sidebarSearchPlaceholder;
    input.setAttribute("aria-label", strings.sidebarSearchPlaceholder);
    search.appendChild(input);

    const spacer = targetDocument.createElement("span");
    spacer.className = "ccxp-lite-sidebar-search-spacer";
    spacer.setAttribute("aria-hidden", "true");
    search.appendChild(spacer);

    return search;
  }

  function filterSidebarModel(model, query) {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) {
      return model;
    }

    const expandedItemIds = new Set();
    const items = (model.items || [])
      .map((item) => filterSidebarItem(item, normalizedQuery, expandedItemIds))
      .filter(Boolean);

    return {
      items,
      initialExpandedItemIds: Array.from(expandedItemIds)
    };
  }

  function filterSidebarItem(item, normalizedQuery, expandedItemIds) {
    if (!item) {
      return null;
    }

    if (item.kind === "link") {
      return isSearchMatch(item.label, normalizedQuery) ? item : null;
    }

    const directLinks = (item.directLinks || []).filter((linkItem) => isSearchMatch(linkItem.label, normalizedQuery));
    const sections = (item.sections || [])
      .map((section) => filterSidebarItem(section, normalizedQuery, expandedItemIds))
      .filter(Boolean);
    const itemMatches = isSearchMatch(item.label, normalizedQuery);

    if (!itemMatches && directLinks.length === 0 && sections.length === 0) {
      return null;
    }

    if (sections.length > 0 || (!itemMatches && directLinks.length > 0)) {
      expandedItemIds.add(item.id);
    }

    if (itemMatches) {
      collectExpandableIds(item, expandedItemIds);
    }

    return {
      ...item,
      directLinks: itemMatches ? item.directLinks : directLinks,
      sections: itemMatches ? item.sections : sections
    };
  }

  function collectExpandableIds(item, expandedItemIds) {
    if (!item || !expandedItemIds || (item.kind !== "category" && item.kind !== "group" && item.kind !== "section")) {
      return;
    }

    expandedItemIds.add(item.id);
    (item.sections || []).forEach((section) => collectExpandableIds(section, expandedItemIds));
  }

  function isSearchMatch(text, normalizedQuery) {
    return normalizeSearchText(text).includes(normalizedQuery);
  }

  function normalizeSearchText(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function createLinkButton(targetDocument, linkItem, toneClass, depth, strings, onFavoritesChange) {
    const button = targetDocument.createElement("button");
    button.type = "button";
    button.className = `ccxp-lite-row-button ${toneClass}`;
    button.setAttribute("title", linkItem.label);
    button.style.setProperty("--ccxp-lite-row-depth", String(getSidebarIndentLevel("link", depth)));

    button.appendChild(createRowLabel(targetDocument, linkItem.label, isExternalLinkTarget(linkItem.target)));
    button.appendChild(createFavoriteToggle(targetDocument, linkItem, strings, onFavoritesChange));
    button.addEventListener("click", () => activateLegacyLink(linkItem, targetDocument));

    return button;
  }

  function createRowLabel(targetDocument, text, withExternalLinkIcon) {
    const labelWrap = targetDocument.createElement("span");
    labelWrap.className = "ccxp-lite-row-label-wrap";

    const label = targetDocument.createElement("span");
    label.className = "ccxp-lite-row-label";
    label.textContent = text;
    labelWrap.appendChild(label);

    if (withExternalLinkIcon) {
      labelWrap.appendChild(createExternalLinkIcon(targetDocument));
    }

    return labelWrap;
  }

  function createRowLeadingSpacer(targetDocument) {
    const spacer = targetDocument.createElement("span");
    spacer.className = "ccxp-lite-row-leading";
    spacer.setAttribute("aria-hidden", "true");
    return spacer;
  }

  function createFavoriteToggle(targetDocument, linkItem, strings, onFavoritesChange) {
    const favoriteButton = targetDocument.createElement("button");
    favoriteButton.type = "button";
    favoriteButton.className = "ccxp-lite-favorite-toggle";

    const isFavorite = isFavoriteLink(linkItem, getFavoriteIds());
    favoriteButton.setAttribute("aria-pressed", isFavorite ? "true" : "false");
    favoriteButton.setAttribute("aria-label", isFavorite ? `${strings.sidebarRemoveFavorite}: ${linkItem.label}` : `${strings.sidebarAddFavorite}: ${linkItem.label}`);
    favoriteButton.setAttribute("title", isFavorite ? strings.sidebarRemoveFavorite : strings.sidebarAddFavorite);
    favoriteButton.appendChild(createFavoriteStarIcon(targetDocument, isFavorite));

    favoriteButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const favoriteIds = getFavoriteIds();

      const matchingIds = getMatchingFavoriteIds(linkItem, favoriteIds);
      if (matchingIds.length > 0) {
        matchingIds.forEach((favoriteId) => favoriteIds.delete(favoriteId));
      } else {
        favoriteIds.add(linkItem.id);
      }

      writeFavoriteIds(favoriteIds);

      if (typeof onFavoritesChange === "function") {
        onFavoritesChange();
      }
    });

    return favoriteButton;
  }

  function hasExpandableId(item, itemId) {
    if (!item || (item.kind !== "category" && item.kind !== "group" && item.kind !== "section")) {
      return false;
    }

    return item.id === itemId || (item.sections || []).some((childItem) => hasExpandableId(childItem, itemId));
  }

  function getSidebarIndentLevel(kind, depth) {
    if (kind === "category") {
      return 0;
    }

    return Math.max(0, depth);
  }

  function activateLegacyLink(linkItem, navDocument) {
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

    const resolvedUrl = new URL(linkItem.href, navDocument.location.href).toString();
    const normalizedTarget = (linkItem.target || "main").toLowerCase();

    if (normalizedTarget === "_blank") {
      window.open(resolvedUrl, "_blank", "noopener");
      return;
    }

    if (normalizedTarget === "_top") {
      window.top.location.href = resolvedUrl;
      return;
    }

    if (normalizedTarget === "main" && window.top && window.top.frames && window.top.frames.main) {
      window.top.frames.main.location.href = resolvedUrl;
      return;
    }

    window.location.href = resolvedUrl;
  }

  function isExternalLinkTarget(target) {
    return (target || "main").toLowerCase() === "_blank";
  }

  function createExternalLinkIcon(targetDocument) {
    const icon = targetDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("class", "ccxp-lite-link-icon");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "2");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    icon.setAttribute("aria-hidden", "true");

    ["M15 3h6v6", "M10 14 21 3", "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"].forEach((pathData) => {
      const path = targetDocument.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathData);
      icon.appendChild(path);
    });

    return icon;
  }

  function createFavoriteStarIcon(targetDocument, isFavorite) {
    const icon = targetDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("class", `ccxp-lite-favorite-star${isFavorite ? " is-active" : ""}`);
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("fill", isFavorite ? "currentColor" : "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "2");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    icon.setAttribute("aria-hidden", "true");

    const path = targetDocument.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M11.525 2.295a.53.53 0 0 1 .95 0l2.262 4.584a.53.53 0 0 0 .399.29l5.06.735a.53.53 0 0 1 .294.904l-3.66 3.567a.53.53 0 0 0-.152.469l.864 5.039a.53.53 0 0 1-.768.559l-4.525-2.379a.53.53 0 0 0-.493 0l-4.525 2.38a.53.53 0 0 1-.768-.56l.864-5.039a.53.53 0 0 0-.152-.469L3.51 8.808a.53.53 0 0 1 .294-.904l5.06-.735a.53.53 0 0 0 .4-.29z");
    icon.appendChild(path);

    return icon;
  }

  function getFavoriteIds() {
    return new Set(favoriteState.ids);
  }

  function ensureFavoriteIdsLoaded(onReady) {
    if (favoriteState.hasLoaded) {
      if (typeof onReady === "function") {
        onReady();
      }
      return;
    }

    if (favoriteState.pendingLoad) {
      if (typeof onReady === "function") {
        favoriteState.pendingLoad.then(onReady);
      }
      return;
    }

    favoriteState.pendingLoad = readFavoritesFromStorage()
      .then((favoriteIds) => {
        favoriteState.ids = favoriteIds;
        favoriteState.hasLoaded = true;
      })
      .catch(() => {
        favoriteState.ids = new Set();
        favoriteState.hasLoaded = true;
      })
      .finally(() => {
        favoriteState.pendingLoad = null;
      });

    if (typeof onReady === "function") {
      favoriteState.pendingLoad.then(onReady);
    }
  }

  function writeFavoriteIds(favoriteIds) {
    favoriteState.ids = new Set(favoriteIds);
    favoriteState.hasLoaded = true;
    notifyFavoriteSubscribers();

    const storage = getScopedFavoriteStorage();
    if (!storage) {
      return;
    }

    try {
      storage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(favoriteIds)));
    } catch (_error) {
      // Ignore storage write failures; in-memory state still updates for the current page.
    }
  }

  function readFavoritesFromStorage() {
    return new Promise((resolve) => {
      const storage = getScopedFavoriteStorage();
      if (storage) {
        try {
          const storedValue = JSON.parse(storage.getItem(FAVORITES_STORAGE_KEY) || "[]");
          resolve(new Set(Array.isArray(storedValue) ? storedValue.map(normalizeFavoriteStorageValue).filter(Boolean) : []));
          return;
        } catch (_error) {
          // Fall through to migration fallback.
        }
      }

      readLegacyFavoritesFromExtensionStorage().then((favoriteIds) => {
        if (favoriteIds.size > 0) {
          writeFavoriteIds(favoriteIds);
        }
        resolve(favoriteIds);
      });
    });
  }

  function ensureFavoriteStorageSync() {
    const scopeWindow = getFavoriteScopeWindow();
    if (favoriteStorageSyncBound || !scopeWindow) {
      return;
    }

    scopeWindow.addEventListener("storage", (event) => {
      if (!event || event.key !== FAVORITES_STORAGE_KEY) {
        return;
      }

      let nextValue = [];
      try {
        nextValue = JSON.parse(event.newValue || "[]");
      } catch (_error) {
        nextValue = [];
      }

      favoriteState.ids = new Set(Array.isArray(nextValue) ? nextValue.map(normalizeFavoriteStorageValue).filter(Boolean) : []);
      favoriteState.hasLoaded = true;
      notifyFavoriteSubscribers();
    });

    favoriteStorageSyncBound = true;
  }

  function notifyFavoriteSubscribers() {
    favoriteSubscribers.forEach((callback) => {
      try {
        callback();
      } catch (_error) {
        // Ignore stale subscribers from replaced frame documents.
      }
    });
  }

  function getScopedFavoriteStorage() {
    const scopeWindow = getFavoriteScopeWindow();
    if (!scopeWindow) {
      return null;
    }

    try {
      return scopeWindow.localStorage || null;
    } catch (_error) {
      return null;
    }
  }

  function getFavoriteScopeWindow() {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      return window.top || window;
    } catch (_error) {
      return window;
    }
  }

  function readLegacyFavoritesFromExtensionStorage() {
    return new Promise((resolve) => {
      const storageApi = typeof chrome !== "undefined" && chrome.storage ? chrome.storage.local : null;
      if (!storageApi) {
        resolve(new Set());
        return;
      }

      storageApi.get(["ccxp-lite-sidebar-favorites"], (result) => {
        if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.lastError) {
          resolve(new Set());
          return;
        }

        const storedValue = result ? result["ccxp-lite-sidebar-favorites"] : [];
        resolve(new Set(Array.isArray(storedValue) ? storedValue.map(normalizeFavoriteStorageValue).filter(Boolean) : []));
      });
    });
  }

  function collectFavoriteLinks(item, favoriteIds, favoriteLinks) {
    if (!item) {
      return;
    }

    if (item.kind === "link") {
      if (item.linkItem && isFavoriteLink(item.linkItem, favoriteIds)) {
        favoriteLinks.push(item.linkItem);
      }
      return;
    }

    (item.directLinks || []).forEach((linkItem) => {
      if (isFavoriteLink(linkItem, favoriteIds)) {
        favoriteLinks.push(linkItem);
      }
    });

    (item.sections || []).forEach((section) => collectFavoriteLinks(section, favoriteIds, favoriteLinks));
  }

  function dedupeLinkItems(linkItems) {
    const seen = new Set();

    return linkItems.filter((linkItem) => {
      if (!linkItem || seen.has(linkItem.id)) {
        return false;
      }

      seen.add(linkItem.id);
      return true;
    });
  }

  function createLinkId(linkItem) {
    const pathSignature = Array.isArray(linkItem.pathSegments)
      ? linkItem.pathSegments.map(normalizeFavoriteText).filter(Boolean).join(">")
      : "";
    const clickSignature = linkItem.clickLinkArgs
      ? `${String(linkItem.clickLinkArgs.name || "").trim()}::${normalizeFavoriteUrl(linkItem.clickLinkArgs.url)}`
      : "";

    return [
      "v2",
      pathSignature,
      normalizeFavoriteText(linkItem.label),
      normalizeFavoriteText(linkItem.target),
      clickSignature
    ].join("||");
  }

  function createLegacyLinkId(linkItem) {
    const clickSignature = linkItem.clickLinkArgs
      ? `${String(linkItem.clickLinkArgs.name || "").trim()}::${normalizeFavoriteUrl(linkItem.clickLinkArgs.url)}`
      : "";

    return [
      normalizeFavoriteText(linkItem.label),
      normalizeFavoriteUrl(linkItem.href),
      normalizeFavoriteText(linkItem.target),
      clickSignature
    ].join("||");
  }

  function normalizeFavoriteStorageValue(value) {
    if (typeof value !== "string") {
      return "";
    }

    const parts = value.split("||");
    if (parts.length === 4) {
      return createLegacyLinkId({
        label: parts[0],
        href: parts[1],
        target: parts[2],
        clickLinkArgs: parseFavoriteClickSignature(parts[3])
      });
    }

    if (parts.length !== 5 || parts[0] !== "v2") {
      return normalizeFavoriteText(value);
    }

    return createLinkId({
      pathSegments: parseFavoritePathSignature(parts[1]),
      label: parts[2],
      target: parts[3],
      clickLinkArgs: parseFavoriteClickSignature(parts[4])
    });
  }

  function parseFavoritePathSignature(signature) {
    return String(signature || "")
      .split(">")
      .map(normalizeFavoriteText)
      .filter(Boolean);
  }

  function parseFavoriteClickSignature(signature) {
    const normalizedSignature = String(signature || "").trim();
    if (!normalizedSignature) {
      return null;
    }

    const separatorIndex = normalizedSignature.indexOf("::");
    if (separatorIndex === -1) {
      return {
        name: normalizedSignature,
        url: ""
      };
    }

    return {
      name: normalizedSignature.slice(0, separatorIndex),
      url: normalizedSignature.slice(separatorIndex + 2)
    };
  }

  function normalizeFavoriteText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function buildFavoritePathSegments(parentPathSegments, label, fallbackSegment) {
    const normalizedParentSegments = Array.isArray(parentPathSegments)
      ? parentPathSegments.map(normalizeFavoriteText).filter(Boolean)
      : [];
    const normalizedLabel = normalizeFavoriteText(label);

    if (normalizedLabel) {
      return [...normalizedParentSegments, normalizedLabel];
    }

    if (fallbackSegment) {
      return [...normalizedParentSegments, fallbackSegment];
    }

    return normalizedParentSegments;
  }

  function isFavoriteLink(linkItem, favoriteIds) {
    return getMatchingFavoriteIds(linkItem, favoriteIds).length > 0;
  }

  function getMatchingFavoriteIds(linkItem, favoriteIds) {
    if (!linkItem || !favoriteIds) {
      return [];
    }

    return [linkItem.id, linkItem.legacyId]
      .filter(Boolean)
      .filter((favoriteId, index, values) => values.indexOf(favoriteId) === index)
      .filter((favoriteId) => favoriteIds.has(favoriteId));
  }

  function normalizeFavoriteUrl(rawValue) {
    const value = String(rawValue || "").trim();
    if (!value) {
      return "";
    }

    try {
      const url = new URL(value, "https://www.ccxp.nthu.edu.tw/");
      const volatileParams = ["acixstore", "sid", "session", "phpsessid", "token", "_", "t"];
      volatileParams.forEach((key) => url.searchParams.delete(key));

      const sortedEntries = Array.from(url.searchParams.entries()).sort(([leftKey, leftValue], [rightKey, rightValue]) => {
        if (leftKey === rightKey) {
          return leftValue.localeCompare(rightValue);
        }
        return leftKey.localeCompare(rightKey);
      });

      url.search = "";
      sortedEntries.forEach(([key, entryValue]) => url.searchParams.append(key, entryValue));

      const normalizedPath = url.pathname.replace(/\/+/g, "/");
      const normalizedQuery = url.searchParams.toString();
      const normalizedHash = url.hash || "";

      return `${normalizedPath}${normalizedQuery ? `?${normalizedQuery}` : ""}${normalizedHash}`;
    } catch (_error) {
      return value
        .replace(/([?&])(ACIXSTORE|sid|session|PHPSESSID|token|_|t)=[^&#]*/gi, "$1")
        .replace(/[?&]+$/, "")
        .replace(/[?&]{2,}/g, "&")
        .replace("?&", "?");
    }
  }

  function createSearchIcon(targetDocument) {
    const icon = targetDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("class", "ccxp-lite-sidebar-search-icon");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "2");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    icon.setAttribute("aria-hidden", "true");

    ["M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16", "m21 21-4.3-4.3"].forEach((pathData) => {
      const path = targetDocument.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathData);
      icon.appendChild(path);
    });

    return icon;
  }

  function createChevronIcon(targetDocument, isExpanded) {
    const icon = targetDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("class", `ccxp-lite-chevron${isExpanded ? " is-expanded" : ""}`);
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "2.25");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    icon.setAttribute("aria-hidden", "true");

    const path = targetDocument.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "m9 6 6 6-6 6");
    icon.appendChild(path);
    return icon;
  }

  function createCategoryIcon(targetDocument, iconName) {
    const icon = targetDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("class", "ccxp-lite-category-icon");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "2");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    icon.setAttribute("aria-hidden", "true");

    getCategoryIconShapes(iconName).forEach((shape) => {
      const tagName = typeof shape === "string" ? "path" : shape.tag;
      const attributes = typeof shape === "string" ? { d: shape } : shape.attributes;
      const element = targetDocument.createElementNS("http://www.w3.org/2000/svg", tagName);
      Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
      icon.appendChild(element);
    });

    return icon;
  }

  function getCategoryIconShapes(iconName) {
    const iconShapeMap = {
      "circle-user-round": [
        "M17.925 20.056a6 6 0 0 0-11.851.001",
        { tag: "circle", attributes: { cx: "12", cy: "11", r: "4" } },
        { tag: "circle", attributes: { cx: "12", cy: "12", r: "10" } }
      ],
      "calendar-range": [
        "M8 2v4",
        "M16 2v4",
        "M3 10h18",
        "M7 14h5",
        "M16 14h1",
        "M16 18h1",
        "M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
      ],
      "notepad-text": [
        "M8 2v4",
        "M12 2v4",
        "M16 2v4",
        "M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z",
        "M8 10h6",
        "M8 14h8",
        "M8 18h5"
      ],
      "message-square-more": [
        "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
        "M8 10h.01",
        "M12 10h.01",
        "M16 10h.01"
      ],
      "refresh-cw": [
        "M21 2v6h-6",
        "M3 22v-6h6",
        "M20.49 9A9 9 0 0 0 5.64 5.64L3 8",
        "M3.51 15A9 9 0 0 0 18.36 18.36L21 16"
      ],
      "graduation-cap": [
        "m22 10-10-5L2 10l10 5z",
        "M6 12v5c3 2 9 2 12 0v-5",
        "M19 13v6"
      ],
      "dollar-sign": [
        "M12 2v20",
        "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
      ],
      house: [
        "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",
        "M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
      ],
      "notebook-pen": [
        "M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4",
        "M2 6h4",
        "M2 10h4",
        "M2 14h4",
        "M2 18h4",
        "M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"
      ],
      school: [
        "M14 21v-3a2 2 0 0 0-4 0v3",
        "M18 4.933V21",
        "m4 6 7.106-3.79a2 2 0 0 1 1.788 0L20 6",
        "m6 11-3.52 2.147a1 1 0 0 0-.48.854V19a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a1 1 0 0 0-.48-.853L18 11",
        "M6 4.933V21",
        "M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4"
      ],
      megaphone: [
        "M3 11v2",
        "M11 5 18 3v18l-7-2-5-4V9z",
        "M11 19v3",
        "M7 15v5"
      ],
      star: [
        "M11.525 2.295a.53.53 0 0 1 .95 0l2.262 4.584a.53.53 0 0 0 .399.29l5.06.735a.53.53 0 0 1 .294.904l-3.66 3.567a.53.53 0 0 0-.152.469l.864 5.039a.53.53 0 0 1-.768.559l-4.525-2.379a.53.53 0 0 0-.493 0l-4.525 2.38a.53.53 0 0 1-.768-.56l.864-5.039a.53.53 0 0 0-.152-.469L3.51 8.808a.53.53 0 0 1 .294-.904l5.06-.735a.53.53 0 0 0 .4-.29z"
      ],
      folders: [
        "M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z",
        "M2 10h20"
      ]
    };

    return iconShapeMap[iconName] || iconShapeMap.folders;
  }

  function parseSidebarTree(navDocument) {
    const statements = Array.from(navDocument.scripts)
      .map((script) => script.textContent || "")
      .join("\n")
      .split(";")
      .map((statement) => statement.trim())
      .filter(Boolean);

    const nodes = new Map();
    const root = { desc: "", children: [] };
    nodes.set("foldersTree", root);

    const stringPattern = "\"(?:[^\"\\\\]|\\\\.)*\"|'(?:[^'\\\\]|\\\\.)*'";
    const rootRegex = new RegExp(`^foldersTree\\s*=\\s*gFld\\s*\\(\\s*(${stringPattern})\\s*,\\s*(${stringPattern})\\s*\\)$`);
    const folderRegex = new RegExp(`^(\\w+)\\s*=\\s*insFld\\s*\\(\\s*(\\w+)\\s*,\\s*gFld\\s*\\(\\s*(${stringPattern})\\s*,\\s*(${stringPattern})\\s*\\)\\s*\\)$`);
    const docRegex = new RegExp(`^insDoc\\s*\\(\\s*(\\w+)\\s*,\\s*gLnk\\s*\\(\\s*([^,]+?)\\s*,\\s*(${stringPattern})\\s*,\\s*(${stringPattern})\\s*\\)\\s*\\)$`);

    statements.forEach((statement) => {
      const rootMatch = statement.match(rootRegex);
      if (rootMatch) {
        root.desc = parseJsStringLiteral(rootMatch[1]);
        return;
      }

      const folderMatch = statement.match(folderRegex);
      if (folderMatch) {
        const [, variableName, parentName, descLiteral] = folderMatch;
        const folderNode = { desc: parseJsStringLiteral(descLiteral), children: [] };
        nodes.set(variableName, folderNode);
        const parentNode = nodes.get(parentName);
        if (parentNode) {
          parentNode.children.push(folderNode);
        }
        return;
      }

      const docMatch = statement.match(docRegex);
      if (docMatch) {
        const [, parentName, targetToken, descLiteral, hrefLiteral] = docMatch;
        const parentNode = nodes.get(parentName);
        if (!parentNode) {
          return;
        }

        parentNode.children.push({
          desc: parseJsStringLiteral(descLiteral),
          link: buildLegacyLinkString(targetToken.trim(), parseJsStringLiteral(hrefLiteral))
        });
      }
    });

    return root.children.length > 0 ? root : null;
  }

  function parseJsStringLiteral(literal) {
    const quote = literal[0];
    const inner = literal.slice(1, -1);

    if (quote === "\"") {
      return JSON.parse(literal);
    }

    return inner
      .replace(/\\\\/g, "\\")
      .replace(/\\'/g, "'")
      .replace(/\\"/g, "\"")
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t");
  }

  function buildLegacyLinkString(targetToken, href) {
    return `'${href}' target="${targetToken === "1" ? "_blank" : "main"}"`;
  }

  function readAcixstore(locationHref) {
    const url = new URL(locationHref);
    return url.searchParams.get("ACIXSTORE") || "";
  }

  namespace.sidebar = {
    simplifySidebar
  };
})(window);
