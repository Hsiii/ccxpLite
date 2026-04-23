// @ts-nocheck
(function registerCcxpLiteSidebar(globalScope) {
  const namespace = globalScope.CCXP_LITE || (globalScope.CCXP_LITE = {});
  const { shared } = namespace;
  const {
    TOKENS,
    STRINGS,
    SIDEBAR_CATEGORIES,
    ASSETS,
    ensureThemeDocument,
    getLocalizedStrings,
    resolveLocaleFromDocument,
    createBrandImage,
    createBrandCopy,
  } = shared;

  const FAVORITES_STORAGE_SCOPE_PATH = "/ccxp/INQUIRE/select_entry.php";
  const FAVORITES_STORAGE_KEY = `ccxp-lite-sidebar-favorites::${FAVORITES_STORAGE_SCOPE_PATH}`;
  const INITIAL_MAIN_URL_STORAGE_KEY = `ccxp-lite-sidebar-initial-main-url::${FAVORITES_STORAGE_SCOPE_PATH}`;

  const favoriteState = {
    ids: new Set(),
    hasLoaded: false,
    pendingLoad: null,
  };

  const favoriteSubscribers = new Set();
  const sidebarUiStateByDocument = new WeakMap();
  let favoriteStorageSyncBound = false;
  const DESTINATION_LOAD_TIMEOUT_MS = 8000;

  function simplifySidebar(navFrame, retry, options = {}) {
    const navDocument = navFrame.contentDocument;
    const hostDocument = options.hostDocument || navDocument;

    if (!navDocument || !navDocument.body || !navDocument.head) {
      retry();
      return;
    }

    if (
      navDocument.body.dataset.ccxpLiteSidebarApplied !== "true" &&
      !shared.isDocumentComplete(navDocument)
    ) {
      retry();
      return;
    }

    const rawTree = parseSidebarTree(navDocument);
    if (!rawTree || !Array.isArray(rawTree.children)) {
      retry();
      return;
    }

    ensureThemeDocument(navDocument, "nav");
    ensureThemeDocument(hostDocument, "nav");
    const strings = getLocalizedStrings(resolveLocaleFromDocument(navDocument));
    captureInitialMainFrameUrl();

    if (hostDocument.body.dataset.ccxpLiteSidebarApplied !== "true") {
      const helperFrame = navDocument.querySelector("iframe[name='frame_7472']");
      const shell = hostDocument.createElement("div");
      shell.className = `${TOKENS.sidebarClass} ccxp-lite-app-shell`;

      const header = hostDocument.createElement("div");
      header.className = "ccxp-lite-sidebar-header";

      const brand = hostDocument.createElement("button");
      brand.type = "button";
      brand.className = "ccxp-lite-sidebar-brand ccxp-lite-sidebar-brand-button";
      brand.setAttribute("aria-label", strings.sidebarResetHome);
      brand.setAttribute("title", strings.sidebarResetHome);
      brand.appendChild(
        createBrandImage(hostDocument, "ccxp-lite-sidebar-brand-logo", ASSETS.sidebarBrandLogoPath),
      );
      brand.appendChild(
        createBrandCopy(
          hostDocument,
          "ccxp-lite-sidebar-brand-copy",
          "ccxp-lite-sidebar-brand-title",
          strings.sidebarTitle,
        ),
      );

      const breadcrumb = hostDocument.createElement("div");
      breadcrumb.className = "ccxp-lite-sidebar-breadcrumb";

      const search = createSidebarSearch(hostDocument, strings);

      const content = hostDocument.createElement("main");
      content.className = "ccxp-lite-sidebar-content";

      const footer = hostDocument.createElement("footer");
      footer.className = "ccxp-lite-sidebar-footer";

      header.appendChild(brand);
      header.appendChild(breadcrumb);
      header.appendChild(search);
      shell.appendChild(header);
      shell.appendChild(content);
      shell.appendChild(footer);

      hostDocument.body.replaceChildren(shell);

      if (helperFrame) {
        helperFrame.style.display = "none";
        navDocument.body.appendChild(helperFrame);
      }

      brand.addEventListener("click", () => {
        const state = getSidebarUiState(hostDocument);
        state.currentCategoryId = "";
        state.activeLeaf = null;
        renderSidebar(
          hostDocument,
          navDocument,
          () => buildSidebarModel(rawTree, navDocument, strings),
          strings,
        );
      });

      hostDocument.body.dataset.ccxpLiteSidebarApplied = "true";
    }

    const rerender = () =>
      renderSidebar(
        hostDocument,
        navDocument,
        () => buildSidebarModel(rawTree, navDocument, strings),
        strings,
      );
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
    return buildCategorizedSidebarItems(normalizedItems, favoriteIds, strings);
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

    return {
      favorites: {
        id: "category-favorites",
        label: strings.sidebarCategoryFavorites || "常用功能",
        icon: "star",
        directLinks: dedupeLinkItems(favoriteLinks),
        sections: [],
        emptyMessage: strings.sidebarFavoritesEmpty || "Press star at any function to save it here",
        kind: "category",
      },
      categories: SIDEBAR_CATEGORIES.map((category) => {
        const categoryItems = buckets.get(category.id) || [];
        if (categoryItems.length === 0) {
          return null;
        }

        return {
          id: `category-${category.id}`,
          label: strings[category.labelKey] || category.fallbackLabel || category.id,
          icon: category.icon,
          directLinks: categoryItems
            .filter((item) => item.kind === "link")
            .map((item) => item.linkItem),
          sections: categoryItems.filter((item) => item.kind !== "link"),
          emptyMessage: strings.emptyGroup,
          kind: "category",
        };
      }).filter(Boolean),
    };
  }

  function findCategoryForItem(item) {
    const candidateLabels = collectSidebarLabels(item);

    return (
      SIDEBAR_CATEGORIES.find((category) =>
        category.itemLabels.some((label) => {
          const normalizedCategoryLabel = normalizeSidebarLabel(label);
          return candidateLabels.some((candidateLabel) =>
            isSidebarLabelMatch(candidateLabel, normalizedCategoryLabel),
          );
        }),
      ) || null
    );
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

    return (
      normalizedCategoryLabel === candidateLabel ||
      candidateLabel.includes(normalizedCategoryLabel) ||
      normalizedCategoryLabel.includes(candidateLabel)
    );
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
      kind: "link",
    };
  }

  function normalizeTopLevelGroup(folderNode, index, navDocument) {
    const directLinks = [];
    const sections = [];
    const groupLabel = toPlainText(folderNode.desc, navDocument);
    const groupPathSegments = buildFavoritePathSegments([], groupLabel, `group-${index}`);

    (folderNode.children || []).forEach((childNode) => {
      if (childNode && childNode.children) {
        const section = normalizeSectionNode(
          childNode,
          `${index}-${sections.length}`,
          navDocument,
          groupPathSegments,
        );
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
      kind: "group",
    };
  }

  function normalizeSectionNode(folderNode, indexKey, navDocument, parentPathSegments) {
    const directLinks = [];
    const sections = [];
    const label = toPlainText(folderNode.desc, navDocument);
    const sectionPathSegments = buildFavoritePathSegments(
      parentPathSegments,
      label,
      `section-${indexKey}`,
    );

    (folderNode.children || []).forEach((childNode) => {
      if (childNode && childNode.children) {
        const section = normalizeSectionNode(
          childNode,
          `${indexKey}-${sections.length}`,
          navDocument,
          sectionPathSegments,
        );
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
      kind: "section",
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
        clickLinkArgs,
      }),
      legacyId: createLegacyLinkId({
        label,
        href: parsedLink.href,
        target: parsedLink.target,
        clickLinkArgs,
      }),
      label,
      pathSegments,
      href: parsedLink.href,
      target: parsedLink.target,
      clickLinkArgs,
    };
  }

  function parseLegacyLink(rawLink) {
    const hrefMatch = rawLink.match(/^'([^']+)'/);
    const targetMatch = rawLink.match(/target="?([^"\s]+)"?/i);

    return {
      href: hrefMatch ? hrefMatch[1] : "",
      target: targetMatch ? targetMatch[1] : "main",
    };
  }

  function parseClickLinkArgs(rawHtml) {
    const match = rawHtml.match(/ClickLink\("([^"]+)","([^"]+)"\)/);
    if (!match) {
      return null;
    }

    return {
      name: match[1],
      url: match[2],
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
    return (scratch.textContent || "").replace(/\s+/g, " ").trim();
  }

  function extractLegacyVisibleText(rawHtml) {
    return [
      ...String(rawHtml)
        .replace(/<br\s*\/?>/gi, "\n")
        .matchAll(/>([^<>]+)/g),
    ]
      .map((match) =>
        String(match[1] || "")
          .replace(/\s+/g, " ")
          .trim(),
      )
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  function renderSidebar(hostDocument, navDocument, modelInput, strings = STRINGS) {
    const shell = hostDocument.querySelector(`.${TOKENS.sidebarClass}`);
    if (!shell) {
      return;
    }

    const content = shell.querySelector(".ccxp-lite-sidebar-content");
    const breadcrumb = shell.querySelector(".ccxp-lite-sidebar-breadcrumb");
    const footer = shell.querySelector(".ccxp-lite-sidebar-footer");
    if (!content || !breadcrumb || !footer) {
      return;
    }

    const searchInput = shell.querySelector(".ccxp-lite-sidebar-search-input");
    const state = getSidebarUiState(hostDocument);

    if (searchInput && searchInput.dataset.ccxpLiteSearchBound !== "true") {
      searchInput.addEventListener("input", () => {
        state.searchQuery = searchInput.value.trim();
        renderSidebar(hostDocument, navDocument, modelInput, strings);
      });
      searchInput.dataset.ccxpLiteSearchBound = "true";
    }

    if (searchInput && searchInput.value !== state.searchQuery) {
      searchInput.value = state.searchQuery;
    }

    const model = typeof modelInput === "function" ? modelInput() : modelInput;
    const filteredCategories = filterCategories(model.categories || [], state.searchQuery);
    const activeCategoryFromFiltered = filteredCategories.find(
      (category) => category.id === state.currentCategoryId,
    );
    const activeCategory =
      activeCategoryFromFiltered ||
      model.categories.find((category) => category.id === state.currentCategoryId) ||
      null;

    if (state.currentCategoryId && !activeCategory) {
      state.currentCategoryId = "";
    }

    breadcrumb.replaceChildren(createBreadcrumb(hostDocument, activeCategory, strings));
    footer.replaceChildren(createGitHubLink(hostDocument, strings));
    content.innerHTML = "";

    if (state.activeLeaf) {
      content.appendChild(
        createDestinationView(
          hostDocument,
          navDocument,
          activeCategory,
          state.activeLeaf,
          strings,
          () => renderSidebar(hostDocument, navDocument, modelInput, strings),
        ),
      );
      restoreSidebarScroll(content, state.scrollTopByView.destination);
      return;
    }

    if (state.currentCategoryId && activeCategory) {
      content.appendChild(
        createCategoryDetailView(hostDocument, navDocument, activeCategory, state, strings, () =>
          renderSidebar(hostDocument, navDocument, modelInput, strings),
        ),
      );
      restoreSidebarScroll(content, state.scrollTopByView.category);
      return;
    }

    content.appendChild(
      createDashboardView(
        hostDocument,
        navDocument,
        filterFavoriteLinks(model.favorites.directLinks || [], state.searchQuery),
        filteredCategories,
        state,
        strings,
        () => renderSidebar(hostDocument, navDocument, modelInput, strings),
      ),
    );
    restoreSidebarScroll(content, state.scrollTopByView.root);
  }

  function getSidebarUiState(navDocument) {
    if (sidebarUiStateByDocument.has(navDocument)) {
      return sidebarUiStateByDocument.get(navDocument);
    }

    const state = {
      currentCategoryId: "",
      searchQuery: "",
      viewMode: "grid",
      activeLeaf: null,
      scrollTopByView: {
        root: 0,
        category: 0,
        destination: 0,
      },
    };

    sidebarUiStateByDocument.set(navDocument, state);
    return state;
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

    return search;
  }

  function createBreadcrumb(targetDocument, activeCategory, strings) {
    const fragment = targetDocument.createDocumentFragment();
    const home = targetDocument.createElement("span");
    home.className = "ccxp-lite-breadcrumb-item";
    home.textContent = strings.sidebarBreadcrumbHome;
    fragment.appendChild(home);

    if (activeCategory) {
      const separator = targetDocument.createElement("span");
      separator.className = "ccxp-lite-breadcrumb-separator";
      separator.textContent = "/";
      fragment.appendChild(separator);

      const current = targetDocument.createElement("span");
      current.className = "ccxp-lite-breadcrumb-item is-current";
      current.textContent = activeCategory.label;
      fragment.appendChild(current);
    }

    return fragment;
  }

  function createDashboardView(
    targetDocument,
    navDocument,
    favorites,
    categories,
    state,
    strings,
    rerender,
  ) {
    const layout = targetDocument.createElement("div");
    layout.className = "ccxp-lite-dashboard";

    layout.appendChild(
      createPinnedSection(targetDocument, navDocument, favorites, strings, rerender),
    );
    layout.appendChild(
      createAllSection(targetDocument, navDocument, categories, state, strings, rerender),
    );

    return layout;
  }

  function createPinnedSection(targetDocument, navDocument, favorites, strings, rerender) {
    const section = targetDocument.createElement("section");
    section.className = "ccxp-lite-pane ccxp-lite-pane-pinned";

    const header = targetDocument.createElement("div");
    header.className = "ccxp-lite-pane-header";
    header.appendChild(createSectionHeading(targetDocument, strings.sidebarPinned));
    section.appendChild(header);

    const body = targetDocument.createElement("div");
    body.className = "ccxp-lite-pinned-list";

    if (!favoriteState.hasLoaded) {
      body.appendChild(createSkeletonStack(targetDocument, 3, "ccxp-lite-skeleton-card"));
    } else if (favorites.length === 0) {
      body.appendChild(
        createEmptyState(
          targetDocument,
          strings.sidebarFavoritesEmptyTitle,
          strings.sidebarFavoritesEmptyBody,
        ),
      );
    } else {
      favorites.forEach((linkItem) => {
        body.appendChild(
          createPinnedLinkCard(targetDocument, navDocument, linkItem, strings, rerender),
        );
      });
    }

    section.appendChild(body);
    return section;
  }

  function createAllSection(targetDocument, navDocument, categories, state, strings, rerender) {
    const section = targetDocument.createElement("section");
    section.className = "ccxp-lite-pane ccxp-lite-pane-all";

    const header = targetDocument.createElement("div");
    header.className = "ccxp-lite-pane-header";
    header.appendChild(createSectionHeading(targetDocument, strings.sidebarAll));
    header.appendChild(createViewModeSwitch(targetDocument, state, strings, rerender));
    section.appendChild(header);

    const body = targetDocument.createElement("div");
    body.className = `ccxp-lite-category-browser is-${state.viewMode}`;

    if (categories.length === 0) {
      body.appendChild(
        createEmptyState(
          targetDocument,
          strings.sidebarSearchEmptyTitle,
          strings.sidebarSearchEmptyBody,
        ),
      );
    } else {
      categories.forEach((category) => {
        body.appendChild(
          createCategoryCard(targetDocument, category, state.viewMode, () => {
            persistSidebarScroll(targetDocument, "root");
            state.currentCategoryId = category.id;
            state.activeLeaf = null;
            rerender();
          }),
        );
      });
    }

    section.appendChild(body);
    return section;
  }

  function createCategoryDetailView(
    targetDocument,
    navDocument,
    category,
    state,
    strings,
    rerender,
  ) {
    const filteredCategory = state.searchQuery
      ? filterCategoryTree(category, state.searchQuery)
      : category;

    const section = targetDocument.createElement("section");
    section.className = "ccxp-lite-pane ccxp-lite-pane-detail";

    const header = targetDocument.createElement("div");
    header.className = "ccxp-lite-pane-header ccxp-lite-pane-header-detail";

    const backButton = targetDocument.createElement("button");
    backButton.type = "button";
    backButton.className = "ccxp-lite-back-button";
    backButton.setAttribute("aria-label", strings.sidebarBack);
    backButton.setAttribute("title", strings.sidebarBack);
    backButton.appendChild(createBackIcon(targetDocument));
    backButton.addEventListener("click", () => {
      if (state.activeLeaf) {
        persistSidebarScroll(targetDocument, "destination");
        state.activeLeaf = null;
      } else {
        persistSidebarScroll(targetDocument, "category");
        state.currentCategoryId = "";
      }
      rerender();
    });
    header.appendChild(backButton);
    header.appendChild(createSectionHeading(targetDocument, category.label));
    section.appendChild(header);

    const body = targetDocument.createElement("div");
    body.className = "ccxp-lite-category-detail";

    if (!filteredCategory) {
      body.appendChild(
        createEmptyState(
          targetDocument,
          strings.sidebarSearchEmptyTitle,
          strings.sidebarSearchEmptyBody,
        ),
      );
    } else {
      if ((filteredCategory.directLinks || []).length > 0) {
        body.appendChild(
          createLinkCollection(
            targetDocument,
            navDocument,
            filteredCategory.directLinks,
            strings,
            rerender,
          ),
        );
      }

      (filteredCategory.sections || []).forEach((group) => {
        body.appendChild(
          createCategoryBlock(targetDocument, navDocument, group, strings, rerender),
        );
      });

      if (body.childElementCount === 0) {
        body.appendChild(
          createEmptyState(
            targetDocument,
            strings.sidebarSectionEmptyTitle,
            strings.sidebarSectionEmptyBody,
          ),
        );
      }
    }

    section.appendChild(body);
    return section;
  }

  function createCategoryBlock(targetDocument, navDocument, group, strings, rerender) {
    const block = targetDocument.createElement("section");
    block.className = "ccxp-lite-category-block";

    if (group.label) {
      const title = targetDocument.createElement("h3");
      title.className = "ccxp-lite-category-block-title";
      title.textContent = group.label;
      block.appendChild(title);
    }

    if ((group.directLinks || []).length > 0) {
      block.appendChild(
        createLinkCollection(targetDocument, navDocument, group.directLinks, strings, rerender),
      );
    }

    (group.sections || []).forEach((section) => {
      block.appendChild(
        createCategoryBlock(targetDocument, navDocument, section, strings, rerender),
      );
    });

    return block;
  }

  function createLinkCollection(targetDocument, navDocument, linkItems, strings, rerender) {
    const list = targetDocument.createElement("div");
    list.className = "ccxp-lite-link-collection";

    linkItems.forEach((linkItem) => {
      list.appendChild(
        createDetailLinkCard(targetDocument, navDocument, linkItem, strings, rerender),
      );
    });

    return list;
  }

  function createSectionHeading(targetDocument, text) {
    const heading = targetDocument.createElement("h2");
    heading.className = "ccxp-lite-section-heading";
    heading.textContent = text;
    return heading;
  }

  function createViewModeSwitch(targetDocument, state, strings, rerender) {
    const controls = targetDocument.createElement("div");
    controls.className = "ccxp-lite-view-switch";

    [
      { id: "grid", label: strings.sidebarGridView, icon: createGridIcon },
      { id: "list", label: strings.sidebarListView, icon: createListIcon },
    ].forEach((item) => {
      const button = targetDocument.createElement("button");
      button.type = "button";
      button.className = `ccxp-lite-view-button${state.viewMode === item.id ? " is-active" : ""}`;
      button.setAttribute("aria-label", item.label);
      button.setAttribute("title", item.label);
      button.setAttribute("aria-pressed", state.viewMode === item.id ? "true" : "false");
      button.appendChild(item.icon(targetDocument));
      button.addEventListener("click", () => {
        state.viewMode = item.id;
        rerender();
      });
      controls.appendChild(button);
    });

    return controls;
  }

  function createCategoryCard(targetDocument, category, viewMode, onOpen) {
    const button = targetDocument.createElement("button");
    button.type = "button";
    button.className = `ccxp-lite-category-card is-${viewMode}`;
    button.setAttribute("title", category.label);
    button.addEventListener("click", onOpen);

    const iconWrap = targetDocument.createElement("span");
    iconWrap.className = "ccxp-lite-category-card-icon";
    iconWrap.appendChild(createCategoryIcon(targetDocument, category.icon));
    button.appendChild(iconWrap);

    const body = targetDocument.createElement("span");
    body.className = "ccxp-lite-category-card-body";

    const title = targetDocument.createElement("span");
    title.className = "ccxp-lite-category-card-title";
    title.textContent = category.label;
    body.appendChild(title);

    const count = targetDocument.createElement("span");
    count.className = "ccxp-lite-category-card-count";
    count.textContent = String(countLinksInTree(category));
    body.appendChild(count);

    button.appendChild(body);
    button.appendChild(createForwardIcon(targetDocument));
    return button;
  }

  function createPinnedLinkCard(targetDocument, navDocument, linkItem, strings, rerender) {
    const card = targetDocument.createElement("div");
    card.className = "ccxp-lite-pinned-card";

    const button = targetDocument.createElement("button");
    button.type = "button";
    button.className = "ccxp-lite-link-card ccxp-lite-link-card-pinned";
    button.setAttribute("title", linkItem.label);
    button.appendChild(
      createRowLabel(targetDocument, linkItem.label, isExternalLinkTarget(linkItem.target)),
    );
    button.addEventListener("click", () =>
      openLeafDestination(targetDocument, navDocument, linkItem, rerender),
    );

    card.appendChild(button);
    card.appendChild(createFavoriteToggle(targetDocument, linkItem, strings, rerender));
    return card;
  }

  function createDetailLinkCard(targetDocument, navDocument, linkItem, strings, rerender) {
    const card = targetDocument.createElement("div");
    card.className = "ccxp-lite-detail-link-card";

    const button = targetDocument.createElement("button");
    button.type = "button";
    button.className = "ccxp-lite-link-card";
    button.setAttribute("title", linkItem.label);
    button.appendChild(
      createRowLabel(targetDocument, linkItem.label, isExternalLinkTarget(linkItem.target)),
    );
    button.addEventListener("click", () =>
      openLeafDestination(targetDocument, navDocument, linkItem, rerender),
    );

    card.appendChild(button);
    card.appendChild(createFavoriteToggle(targetDocument, linkItem, strings, rerender));
    return card;
  }

  function createEmptyState(targetDocument, title, body) {
    const empty = targetDocument.createElement("div");
    empty.className = "ccxp-lite-empty";

    const titleNode = targetDocument.createElement("div");
    titleNode.className = "ccxp-lite-empty-title";
    titleNode.textContent = title;
    empty.appendChild(titleNode);

    if (body) {
      const bodyNode = targetDocument.createElement("div");
      bodyNode.className = "ccxp-lite-empty-body";
      bodyNode.textContent = body;
      empty.appendChild(bodyNode);
    }

    return empty;
  }

  function createSkeletonStack(targetDocument, count, itemClassName) {
    const wrap = targetDocument.createElement("div");
    wrap.className = "ccxp-lite-skeleton-stack";

    Array.from({ length: count }).forEach(() => {
      const item = targetDocument.createElement("div");
      item.className = itemClassName;
      wrap.appendChild(item);
    });

    return wrap;
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

  function createFavoriteToggle(targetDocument, linkItem, strings, onFavoritesChange) {
    const favoriteButton = targetDocument.createElement("button");
    favoriteButton.type = "button";
    favoriteButton.className = "ccxp-lite-favorite-toggle";

    const isFavorite = isFavoriteLink(linkItem, getFavoriteIds());
    favoriteButton.setAttribute("aria-pressed", isFavorite ? "true" : "false");
    favoriteButton.setAttribute(
      "aria-label",
      isFavorite
        ? `${strings.sidebarRemoveFavorite}: ${linkItem.label}`
        : `${strings.sidebarAddFavorite}: ${linkItem.label}`,
    );
    favoriteButton.setAttribute(
      "title",
      isFavorite ? strings.sidebarRemoveFavorite : strings.sidebarAddFavorite,
    );
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

  function filterFavoriteLinks(linkItems, query) {
    if (!query) {
      return linkItems;
    }

    return linkItems.filter((linkItem) => isSearchMatch(linkItem.label, query));
  }

  function filterCategories(categories, query) {
    if (!query) {
      return categories;
    }

    return categories.map((category) => filterCategoryTree(category, query)).filter(Boolean);
  }

  function filterCategoryTree(category, query) {
    if (!category) {
      return null;
    }

    if (isSearchMatch(category.label, query)) {
      return category;
    }

    const directLinks = (category.directLinks || []).filter((linkItem) =>
      isSearchMatch(linkItem.label, query),
    );
    const sections = (category.sections || [])
      .map((section) => filterSectionTree(section, query))
      .filter(Boolean);

    if (directLinks.length === 0 && sections.length === 0) {
      return null;
    }

    return {
      ...category,
      directLinks,
      sections,
    };
  }

  function filterSectionTree(section, query) {
    if (!section) {
      return null;
    }

    if (isSearchMatch(section.label, query)) {
      return section;
    }

    const directLinks = (section.directLinks || []).filter((linkItem) =>
      isSearchMatch(linkItem.label, query),
    );
    const sections = (section.sections || [])
      .map((childSection) => filterSectionTree(childSection, query))
      .filter(Boolean);

    if (directLinks.length === 0 && sections.length === 0) {
      return null;
    }

    return {
      ...section,
      directLinks,
      sections,
    };
  }

  function isSearchMatch(text, query) {
    return normalizeSearchText(text).includes(normalizeSearchText(query));
  }

  function normalizeSearchText(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function countLinksInTree(item) {
    if (!item) {
      return 0;
    }

    return (
      (item.directLinks || []).length +
      (item.sections || []).reduce((total, section) => total + countLinksInTree(section), 0)
    );
  }

  function openLeafDestination(targetDocument, navDocument, linkItem, rerender) {
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

  function createDestinationView(
    targetDocument,
    navDocument,
    activeCategory,
    activeLeaf,
    strings,
    rerender,
  ) {
    const section = targetDocument.createElement("section");
    section.className = "ccxp-lite-pane ccxp-lite-pane-detail";

    const header = targetDocument.createElement("div");
    header.className = "ccxp-lite-pane-header ccxp-lite-pane-header-detail";

    const backButton = targetDocument.createElement("button");
    backButton.type = "button";
    backButton.className = "ccxp-lite-back-button";
    backButton.setAttribute("aria-label", strings.sidebarBack);
    backButton.setAttribute("title", strings.sidebarBack);
    backButton.appendChild(createBackIcon(targetDocument));
    backButton.addEventListener("click", () => {
      const state = getSidebarUiState(targetDocument);
      state.activeLeaf = null;
      rerender();
    });

    header.appendChild(backButton);
    header.appendChild(
      createSectionHeading(
        targetDocument,
        activeCategory ? activeCategory.label : activeLeaf.label,
      ),
    );
    section.appendChild(header);

    const frameWrap = targetDocument.createElement("div");
    frameWrap.className = "ccxp-lite-destination-wrap";

    const loading = targetDocument.createElement("div");
    loading.className = "ccxp-lite-destination-loading";
    loading.appendChild(createSkeletonStack(targetDocument, 1, "ccxp-lite-skeleton-progress"));
    const loadingLabel = targetDocument.createElement("div");
    loadingLabel.className = "ccxp-lite-destination-loading-label";
    loadingLabel.textContent = strings.sidebarDestinationLoading;
    loading.appendChild(loadingLabel);
    loading.appendChild(createSkeletonStack(targetDocument, 3, "ccxp-lite-skeleton-frame-line"));

    const error = targetDocument.createElement("div");
    error.className = "ccxp-lite-destination-error";
    error.hidden = true;
    error.appendChild(
      createEmptyState(
        targetDocument,
        strings.sidebarDestinationErrorTitle,
        strings.sidebarDestinationErrorBody,
      ),
    );

    const actions = targetDocument.createElement("div");
    actions.className = "ccxp-lite-destination-actions";

    const retryButton = targetDocument.createElement("button");
    retryButton.type = "button";
    retryButton.className = "ccxp-lite-destination-action";
    retryButton.textContent = strings.sidebarRetry;
    retryButton.addEventListener("click", () => {
      const state = getSidebarUiState(targetDocument);
      state.activeLeaf = {
        ...state.activeLeaf,
        nonce: Date.now(),
      };
      rerender();
    });

    const openButton = targetDocument.createElement("button");
    openButton.type = "button";
    openButton.className = "ccxp-lite-destination-action";
    openButton.textContent = strings.sidebarOpenInNewTab;
    openButton.addEventListener("click", () => openLeafInNewTab(activeLeaf, navDocument));

    actions.appendChild(retryButton);
    actions.appendChild(openButton);
    error.appendChild(actions);

    const frame = targetDocument.createElement("iframe");
    frame.className = "ccxp-lite-destination-frame";
    frame.setAttribute("frameborder", "0");
    frame.setAttribute("scrolling", "auto");
    frame.title = activeLeaf.label;
    frame.hidden = true;

    let hasSettled = false;
    const settleSuccess = () => {
      if (hasSettled) {
        return;
      }
      hasSettled = true;
      window.clearTimeout(timeoutId);
      simplifyEmbeddedFrame(frame);
      loading.hidden = true;
      error.hidden = true;
      frame.hidden = false;
    };

    const settleError = () => {
      if (hasSettled) {
        return;
      }
      hasSettled = true;
      loading.hidden = true;
      frame.hidden = true;
      error.hidden = false;
    };

    const timeoutId = window.setTimeout(settleError, DESTINATION_LOAD_TIMEOUT_MS);
    frame.addEventListener("load", settleSuccess, { once: true });
    frame.addEventListener("error", settleError, { once: true });
    activateLegacyLink(activeLeaf, navDocument, frame);

    frameWrap.appendChild(loading);
    frameWrap.appendChild(error);
    frameWrap.appendChild(frame);
    section.appendChild(frameWrap);
    return section;
  }

  function simplifyEmbeddedFrame(frame) {
    const frameDocument = frame.contentDocument;
    if (!frameDocument || !frameDocument.body || !frameDocument.head) {
      return;
    }

    ensureThemeDocument(frameDocument, "main");
    frameDocument.body.classList.add(TOKENS.mainClass);
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
    const resolvedUrl = new URL(activeLeaf.href, navDocument.location.href).toString();
    window.open(resolvedUrl, "_blank", "noopener");
  }

  function persistSidebarScroll(targetDocument, viewKey) {
    const content = targetDocument.querySelector(".ccxp-lite-sidebar-content");
    if (!content) {
      return;
    }

    const state = getSidebarUiState(targetDocument);
    state.scrollTopByView[viewKey] = content.scrollTop;
  }

  function restoreSidebarScroll(contentNode, scrollTop) {
    const resolvedScrollTop = Number.isFinite(scrollTop) ? scrollTop : 0;
    window.requestAnimationFrame(() => {
      contentNode.scrollTop = resolvedScrollTop;
    });
  }

  function readInitialFrameHref() {
    try {
      const scopeDocument = window.top ? window.top.document : document;
      const frame =
        scopeDocument.querySelector("frame[name='main']") ||
        scopeDocument.querySelector("frame[name='ccxp-lite-legacy-main']");
      if (!frame) {
        return "";
      }

      const src = frame.getAttribute("src") || "";
      return src ? new URL(src, scopeDocument.location.href).toString() : "";
    } catch (_error) {
      return "";
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

    if (normalizedTarget === "main" && destinationFrame) {
      destinationFrame.src = resolvedUrl;
      return;
    }

    window.location.href = resolvedUrl;
  }

  function isExternalLinkTarget(target) {
    return (target || "main").toLowerCase() === "_blank";
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

    [
      "M15 3h6v6",
      "M10 14 21 3",
      "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",
    ].forEach((pathData) => {
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
    path.setAttribute(
      "d",
      "M11.525 2.295a.53.53 0 0 1 .95 0l2.262 4.584a.53.53 0 0 0 .399.29l5.06.735a.53.53 0 0 1 .294.904l-3.66 3.567a.53.53 0 0 0-.152.469l.864 5.039a.53.53 0 0 1-.768.559l-4.525-2.379a.53.53 0 0 0-.493 0l-4.525 2.38a.53.53 0 0 1-.768-.56l.864-5.039a.53.53 0 0 0-.152-.469L3.51 8.808a.53.53 0 0 1 .294-.904l5.06-.735a.53.53 0 0 0 .4-.29z",
    );
    icon.appendChild(path);

    return icon;
  }

  function createBackIcon(targetDocument) {
    const icon = targetDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("class", "ccxp-lite-inline-icon");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "2.2");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    icon.setAttribute("aria-hidden", "true");

    ["M19 12H5", "m12 7-7 5 7 5"].forEach((pathData) => {
      const path = targetDocument.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathData);
      icon.appendChild(path);
    });

    return icon;
  }

  function createForwardIcon(targetDocument) {
    const icon = targetDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("class", "ccxp-lite-inline-icon ccxp-lite-inline-icon-muted");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "2");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    icon.setAttribute("aria-hidden", "true");

    const path = targetDocument.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "m9 6 6 6-6 6");
    icon.appendChild(path);

    return icon;
  }

  function createGridIcon(targetDocument) {
    const icon = targetDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("class", "ccxp-lite-inline-icon");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "2");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    icon.setAttribute("aria-hidden", "true");

    [
      { x: "3", y: "3", width: "7", height: "7", rx: "1.5" },
      { x: "14", y: "3", width: "7", height: "7", rx: "1.5" },
      { x: "3", y: "14", width: "7", height: "7", rx: "1.5" },
      { x: "14", y: "14", width: "7", height: "7", rx: "1.5" },
    ].forEach((attributes) => {
      const rect = targetDocument.createElementNS("http://www.w3.org/2000/svg", "rect");
      Object.entries(attributes).forEach(([name, value]) => rect.setAttribute(name, value));
      icon.appendChild(rect);
    });

    return icon;
  }

  function createListIcon(targetDocument) {
    const icon = targetDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("class", "ccxp-lite-inline-icon");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "2");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    icon.setAttribute("aria-hidden", "true");

    ["M8 6h13", "M8 12h13", "M8 18h13", "M3 6h.01", "M3 12h.01", "M3 18h.01"].forEach(
      (pathData) => {
        const path = targetDocument.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", pathData);
        icon.appendChild(path);
      },
    );

    return icon;
  }

  function createGitHubLink(targetDocument, strings) {
    const link = targetDocument.createElement("a");
    link.className = "ccxp-lite-github-link";
    link.href = "https://github.com/Hsiii/ccxpLite";
    link.target = "_blank";
    link.rel = "noreferrer noopener";
    link.appendChild(createFavoriteStarIcon(targetDocument, true));

    const label = targetDocument.createElement("span");
    label.textContent = strings.sidebarGitHubLink;
    link.appendChild(label);

    return link;
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
        { tag: "circle", attributes: { cx: "12", cy: "12", r: "10" } },
      ],
      "calendar-range": [
        "M8 2v4",
        "M16 2v4",
        "M3 10h18",
        "M7 14h5",
        "M16 14h1",
        "M16 18h1",
        "M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
      ],
      "notepad-text": [
        "M8 2v4",
        "M12 2v4",
        "M16 2v4",
        "M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z",
        "M8 10h6",
        "M8 14h8",
        "M8 18h5",
      ],
      "message-square-more": [
        "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
        "M8 10h.01",
        "M12 10h.01",
        "M16 10h.01",
      ],
      "refresh-cw": [
        "M21 2v6h-6",
        "M3 22v-6h6",
        "M20.49 9A9 9 0 0 0 5.64 5.64L3 8",
        "M3.51 15A9 9 0 0 0 18.36 18.36L21 16",
      ],
      "graduation-cap": ["m22 10-10-5L2 10l10 5z", "M6 12v5c3 2 9 2 12 0v-5", "M19 13v6"],
      "dollar-sign": ["M12 2v20", "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"],
      house: [
        "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",
        "M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
      ],
      "notebook-pen": [
        "M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4",
        "M2 6h4",
        "M2 10h4",
        "M2 14h4",
        "M2 18h4",
        "M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z",
      ],
      school: [
        "M14 21v-3a2 2 0 0 0-4 0v3",
        "M18 4.933V21",
        "m4 6 7.106-3.79a2 2 0 0 1 1.788 0L20 6",
        "m6 11-3.52 2.147a1 1 0 0 0-.48.854V19a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a1 1 0 0 0-.48-.853L18 11",
        "M6 4.933V21",
        "M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4",
      ],
      megaphone: ["M3 11v2", "M11 5 18 3v18l-7-2-5-4V9z", "M11 19v3", "M7 15v5"],
      star: [
        "M11.525 2.295a.53.53 0 0 1 .95 0l2.262 4.584a.53.53 0 0 0 .399.29l5.06.735a.53.53 0 0 1 .294.904l-3.66 3.567a.53.53 0 0 0-.152.469l.864 5.039a.53.53 0 0 1-.768.559l-4.525-2.379a.53.53 0 0 0-.493 0l-4.525 2.38a.53.53 0 0 1-.768-.56l.864-5.039a.53.53 0 0 0-.152-.469L3.51 8.808a.53.53 0 0 1 .294-.904l5.06-.735a.53.53 0 0 0 .4-.29z",
      ],
      folders: [
        "M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z",
        "M2 10h20",
      ],
    };

    return iconShapeMap[iconName] || iconShapeMap.folders;
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
          resolve(
            new Set(
              Array.isArray(storedValue)
                ? storedValue.map(normalizeFavoriteStorageValue).filter(Boolean)
                : [],
            ),
          );
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

      favoriteState.ids = new Set(
        Array.isArray(nextValue)
          ? nextValue.map(normalizeFavoriteStorageValue).filter(Boolean)
          : [],
      );
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

  function getScopedSessionStorage() {
    const scopeWindow = getFavoriteScopeWindow();
    if (!scopeWindow) {
      return null;
    }

    try {
      return scopeWindow.sessionStorage || null;
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
      const storageApi =
        typeof chrome !== "undefined" && chrome.storage ? chrome.storage.local : null;
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
        resolve(
          new Set(
            Array.isArray(storedValue)
              ? storedValue.map(normalizeFavoriteStorageValue).filter(Boolean)
              : [],
          ),
        );
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

    (item.sections || []).forEach((section) =>
      collectFavoriteLinks(section, favoriteIds, favoriteLinks),
    );
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
      clickSignature,
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
      clickSignature,
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
        clickLinkArgs: parseFavoriteClickSignature(parts[3]),
      });
    }

    if (parts.length !== 5 || parts[0] !== "v2") {
      return normalizeFavoriteText(value);
    }

    return createLinkId({
      pathSegments: parseFavoritePathSignature(parts[1]),
      label: parts[2],
      target: parts[3],
      clickLinkArgs: parseFavoriteClickSignature(parts[4]),
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
        url: "",
      };
    }

    return {
      name: normalizedSignature.slice(0, separatorIndex),
      url: normalizedSignature.slice(separatorIndex + 2),
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

      const sortedEntries = Array.from(url.searchParams.entries()).sort(
        ([leftKey, leftValue], [rightKey, rightValue]) => {
          if (leftKey === rightKey) {
            return leftValue.localeCompare(rightValue);
          }
          return leftKey.localeCompare(rightKey);
        },
      );

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
    const rootRegex = new RegExp(
      `^foldersTree\\s*=\\s*gFld\\s*\\(\\s*(${stringPattern})\\s*,\\s*(${stringPattern})\\s*\\)$`,
    );
    const folderRegex = new RegExp(
      `^(\\w+)\\s*=\\s*insFld\\s*\\(\\s*(\\w+)\\s*,\\s*gFld\\s*\\(\\s*(${stringPattern})\\s*,\\s*(${stringPattern})\\s*\\)\\s*\\)$`,
    );
    const docRegex = new RegExp(
      `^insDoc\\s*\\(\\s*(\\w+)\\s*,\\s*gLnk\\s*\\(\\s*([^,]+?)\\s*,\\s*(${stringPattern})\\s*,\\s*(${stringPattern})\\s*\\)\\s*\\)$`,
    );

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
          link: buildLegacyLinkString(targetToken.trim(), parseJsStringLiteral(hrefLiteral)),
        });
      }
    });

    return root.children.length > 0 ? root : null;
  }

  function parseJsStringLiteral(literal) {
    const quote = literal[0];
    const inner = literal.slice(1, -1);

    if (quote === '"') {
      return JSON.parse(literal);
    }

    return inner
      .replace(/\\\\/g, "\\")
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
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
    simplifySidebar,
  };
})(window);
