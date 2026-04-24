// @ts-nocheck
(function registerCcxpLiteSidebarUi(globalScope) {
  const namespace = globalScope.CCXP_LITE || (globalScope.CCXP_LITE = {});
  const { shared, sidebarState, sidebarFavorites, sidebarData, sidebarRuntime } = namespace;
  if (!shared || !sidebarState || !sidebarFavorites || !sidebarData || !sidebarRuntime) {
    return;
  }

  const { TOKENS, STRINGS } = shared;
  const { getSidebarUiState, persistSidebarScroll, restoreSidebarScroll } = sidebarState;
  const {
    favoriteState,
    getFavoriteIds,
    getMatchingFavoriteIds,
    writeFavoriteIds,
    isFavoriteLink,
  } = sidebarFavorites;
  const { filterFavoriteLinks, filterCategories, filterCategoryTree } = sidebarData;
  const {
    DESTINATION_LOAD_TIMEOUT_MS,
    openLeafDestination,
    simplifyEmbeddedFrame,
    getLegacyMainFrame,
    openLeafInNewTab,
    activateLegacyLink,
    isExternalLinkTarget,
  } = sidebarRuntime;

  function renderSidebar(hostDocument, navDocument, modelInput, strings = STRINGS) {
    const shell = hostDocument.querySelector(`.${TOKENS.sidebarClass}`);
    if (!shell) {
      return;
    }

    const content = shell.querySelector(".ccxp-lite-sidebar-content");
    const footer = shell.querySelector(".ccxp-lite-sidebar-footer");
    if (!content || !footer) {
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

    footer.replaceChildren();
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

    const shell = targetDocument.createElement("section");
    shell.className = "ccxp-lite-dashboard-shell";

    shell.appendChild(
      createPinnedSection(targetDocument, navDocument, favorites, strings, rerender),
    );
    shell.appendChild(
      createAllSection(targetDocument, navDocument, categories, state, strings, rerender),
    );

    layout.appendChild(shell);

    return layout;
  }

  function createPinnedSection(targetDocument, navDocument, favorites, strings, rerender) {
    const section = targetDocument.createElement("section");
    section.className = "ccxp-lite-pane ccxp-lite-dashboard-group ccxp-lite-pane-pinned";

    const header = targetDocument.createElement("div");
    header.className = "ccxp-lite-pane-header";
    header.appendChild(createSectionHeading(targetDocument, strings.sidebarPinned));
    section.appendChild(header);

    const body = targetDocument.createElement("div");
    body.className = "ccxp-lite-pane-body ccxp-lite-pinned-list";

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
    section.className = "ccxp-lite-pane ccxp-lite-dashboard-group ccxp-lite-pane-all";

    const header = targetDocument.createElement("div");
    header.className = "ccxp-lite-pane-header";
    header.appendChild(createSectionHeading(targetDocument, strings.sidebarAll));
    header.appendChild(createViewModeSwitch(targetDocument, state, strings, rerender));
    section.appendChild(header);

    const body = targetDocument.createElement("div");
    body.className = `ccxp-lite-pane-body ccxp-lite-category-browser is-${state.viewMode}`;

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

    button.appendChild(body);
    button.appendChild(createForwardIcon(targetDocument));
    return button;
  }

  function createPinnedLinkCard(targetDocument, navDocument, linkItem, strings, rerender) {
    const card = targetDocument.createElement("div");
    card.className = "ccxp-lite-pinned-card";

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
    const legacyMainFrame = getLegacyMainFrame();

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

    const syncFromLegacyMainFrame = () => {
      if (hasSettled || !legacyMainFrame) {
        return;
      }

      try {
        const legacyWindow = legacyMainFrame.contentWindow;
        const legacyHref = legacyWindow && legacyWindow.location ? legacyWindow.location.href : "";
        if (legacyHref && legacyHref !== "about:blank" && frame.src !== legacyHref) {
          frame.src = legacyHref;
          return;
        }
      } catch (_error) {
        // Ignore cross-frame location reads and rely on the destination frame event.
      }

      if (frame.contentDocument && frame.contentDocument.readyState === "complete") {
        settleSuccess();
      }
    };

    const timeoutId = window.setTimeout(settleError, DESTINATION_LOAD_TIMEOUT_MS);
    frame.addEventListener("load", settleSuccess, { once: true });
    frame.addEventListener("error", settleError, { once: true });
    frameWrap.appendChild(loading);
    frameWrap.appendChild(error);
    frameWrap.appendChild(frame);
    if (legacyMainFrame) {
      legacyMainFrame.addEventListener("load", syncFromLegacyMainFrame, { once: true });
    }
    section.appendChild(frameWrap);
    activateLegacyLink(activeLeaf, navDocument, frame);
    return section;
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

  function createBrandCloseIcon(targetDocument) {
    const icon = targetDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("class", "ccxp-lite-sidebar-brand-partner-icon");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "2");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    icon.setAttribute("aria-hidden", "true");

    ["M18 6 6 18", "M6 6l12 12"].forEach((pathData) => {
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

  namespace.sidebarUi = {
    renderSidebar,
    createSidebarSearch,
    createBrandCloseIcon,
  };
})(window);
