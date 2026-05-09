(function registerCcxpLiteSidebarUi(globalScope: typeof globalThis) {
  const runtimeScope = globalScope;
  const namespace = runtimeScope.CCXP_LITE;
  if (!namespace) {
    return;
  }
  const { shared, sidebarState, sidebarFavorites, sidebarData, sidebarRuntime } = namespace;
  if (!shared || !sidebarState || !sidebarFavorites || !sidebarData || !sidebarRuntime) {
    return;
  }
  const { TOKENS, STRINGS, ensureThemeDocument } = shared;
  const {
    getSidebarUiState,
    persistSidebarScroll,
    restoreSidebarScroll,
    setPersistedSidebarVariant,
  } = sidebarState;
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
  function renderSidebar(
    hostDocument: Document,
    navDocument: Document,
    modelInput: CcxpLiteSidebarModel | (() => CcxpLiteSidebarModel),
    strings: Readonly<Record<string, string>> = STRINGS,
  ) {
    const shell = hostDocument.querySelector<HTMLElement>(`.${TOKENS.sidebarClass}`);
    if (!shell) {
      return;
    }
    const content = shell.querySelector<HTMLElement>(".ccxp-lite-sidebar-content");
    const footer = shell.querySelector<HTMLElement>(".ccxp-lite-sidebar-footer");
    if (!content || !footer) {
      return;
    }
    const searchInput = shell.querySelector<HTMLInputElement>(".ccxp-lite-sidebar-search-input");
    const state = getSidebarUiState(hostDocument);
    if (searchInput && searchInput.dataset.ccxpLiteSearchBound !== "true") {
      searchInput.addEventListener("input", () => {
        state.searchQuery = searchInput.value;
        renderSidebar(hostDocument, navDocument, modelInput, strings);
      });
      searchInput.dataset.ccxpLiteSearchBound = "true";
    }
    if (searchInput && searchInput.value !== state.searchQuery) {
      searchInput.value = state.searchQuery;
    }
    const model = typeof modelInput === "function" ? modelInput() : modelInput;
    const filteredCategories = filterCategories(model.categories, state.searchQuery);
    const activeCategoryFromFiltered = filteredCategories.find(
      (category) => category.id === state.currentCategoryId,
    );
    const activeCategory =
      activeCategoryFromFiltered ??
      (state.searchQuery === ""
        ? model.categories.find((category) => category.id === state.currentCategoryId)
        : undefined);
    if (state.currentCategoryId !== "" && activeCategory === undefined) {
      state.currentCategoryId = "";
    }
    footer.textContent = "";
    content.innerHTML = "";
    shell.dataset.ccxpLiteSidebarVariant = state.sidebarVariant;
    mountSidebarVariantSwitch(
      hostDocument,
      state,
      strings,
      () => {
        renderSidebar(hostDocument, navDocument, modelInput, strings);
      },
      footer,
    );
    if (state.sidebarVariant === "classic") {
      content.append(
        createClassicSidebarView(hostDocument, navDocument, model, state, strings, () => {
          renderSidebar(hostDocument, navDocument, modelInput, strings);
        }),
      );
      restoreSidebarScroll(content, state.scrollTopByView.root);
      return;
    }
    if (state.activeLeaf) {
      const activeLeafCategory =
        activeCategory ?? findCategoryContainingLeaf(model.categories, state.activeLeaf);
      content.append(
        createDestinationView(
          hostDocument,
          navDocument,
          activeLeafCategory,
          state.activeLeaf,
          strings,
          () => {
            renderSidebar(hostDocument, navDocument, modelInput, strings);
          },
        ),
      );
      restoreSidebarScroll(content, state.scrollTopByView.destination);
      return;
    }
    if (state.currentCategoryId !== "" && activeCategory) {
      content.append(
        createCategoryDetailView(hostDocument, navDocument, activeCategory, state, strings, () => {
          renderSidebar(hostDocument, navDocument, modelInput, strings);
        }),
      );
      restoreSidebarScroll(content, state.scrollTopByView.category);
      return;
    }
    content.append(
      createDashboardView(
        hostDocument,
        navDocument,
        filterFavoriteLinks(
          model.favorites.blocks.flatMap((block) => block.links),
          state.searchQuery,
        ),
        filteredCategories,
        state,
        strings,
        () => {
          renderSidebar(hostDocument, navDocument, modelInput, strings);
        },
      ),
    );
    restoreSidebarScroll(content, state.scrollTopByView.root);
  }

  function findCategoryContainingLeaf(
    categories: readonly CcxpLiteSidebarCategoryNode[],
    activeLeaf: CcxpLiteSidebarLinkItem | undefined,
  ): CcxpLiteSidebarCategoryNode | undefined {
    if (!activeLeaf) {
      return undefined;
    }
    return categories.find((category) =>
      category.blocks.some((block) =>
        block.links.some((linkItem) => isSameLeaf(linkItem, activeLeaf)),
      ),
    );
  }

  function isSameLeaf(
    linkItem: CcxpLiteSidebarLinkItem,
    activeLeaf: CcxpLiteSidebarLinkItem | undefined,
  ): boolean {
    if (!activeLeaf) {
      return false;
    }
    return (
      linkItem.id === activeLeaf.id ||
      linkItem.legacyId === activeLeaf.legacyId ||
      (linkItem.href === activeLeaf.href &&
        linkItem.target === activeLeaf.target &&
        linkItem.label === activeLeaf.label)
    );
  }

  function createSidebarSearch(
    targetDocument: Document,
    strings: Readonly<Record<string, string>>,
  ): HTMLElement {
    const search = targetDocument.createElement("label");
    search.className = "ccxp-lite-sidebar-search";
    search.append(createSearchIcon(targetDocument));
    const input = targetDocument.createElement("input");
    input.className = "ccxp-lite-sidebar-search-input";
    input.type = "search";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.placeholder = strings.sidebarSearchPlaceholder;
    input.setAttribute("aria-label", strings.sidebarSearchPlaceholder);
    search.append(input);
    return search;
  }

  function createSidebarVariantSwitch(
    targetDocument: Document,
    state: CcxpLiteSidebarState,
    strings: Readonly<Record<string, string>>,
    rerender: () => void,
  ): HTMLElement {
    const button = targetDocument.createElement("button");
    button.type = "button";
    button.className = "ccxp-lite-sidebar-experiment-switch";
    button.dataset.ccxpLiteSidebarVariantMode = state.sidebarVariant;
    button.setAttribute(
      "aria-label",
      state.sidebarVariant === "classic"
        ? strings.sidebarSwitchToLayered
        : strings.sidebarSwitchToClassic,
    );
    button.setAttribute(
      "title",
      state.sidebarVariant === "classic"
        ? strings.sidebarSwitchToLayered
        : strings.sidebarSwitchToClassic,
    );
    const iconWrap = targetDocument.createElement("span");
    iconWrap.className = "ccxp-lite-sidebar-experiment-icon";
    Object.assign(iconWrap.style, {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "20px",
      height: "20px",
    });
    iconWrap.append(createLabIcon(targetDocument));
    const textWrap = targetDocument.createElement("span");
    textWrap.className = "ccxp-lite-sidebar-experiment-copy";
    textWrap.textContent = `${strings.sidebarExperimentCaption}\uFF1A${strings.sidebarVariantLayered}`;
    button.append(iconWrap);
    button.append(textWrap);
    button.addEventListener("click", () => {
      const nextState = state;
      nextState.sidebarVariant = setPersistedSidebarVariant(
        nextState.sidebarVariant === "classic" ? "layered" : "classic",
      );
      syncTopLevelFramesetLayout(nextState.sidebarVariant);
      nextState.activeLeaf = undefined;
      nextState.currentCategoryId = "";
      persistSidebarScroll(targetDocument, "root");
      rerender();
    });
    return button;
  }

  function createClassicSidebarView(
    targetDocument: Document,
    navDocument: Document,
    model: CcxpLiteSidebarModel,
    state: CcxpLiteSidebarState,
    strings: Readonly<Record<string, string>>,
    rerender: () => void,
  ) {
    const sidebarList = targetDocument.createElement("aside");
    sidebarList.className = "ccxp-lite-sidebar-list";
    const items = createClassicSidebarItems(model, state.searchQuery);
    const expandedItemIds = new Set<string>(state.classicExpandedItemIds);
    const searchQuery = normalizeClassicSearchText(state.searchQuery);
    const searchExpansionIds = new Set<string>();
    if (searchQuery !== "") {
      for (const item of items) {
        const expandedState = collectClassicExpandedState(item, searchQuery);
        for (const itemId of expandedState.expandedItemIds) {
          searchExpansionIds.add(itemId);
        }
      }
      for (const itemId of searchExpansionIds) {
        expandedItemIds.add(itemId);
      }
    }
    if (items.length === 0) {
      sidebarList.append(
        createEmptyState(
          targetDocument,
          strings.sidebarSearchEmptyTitle,
          strings.sidebarSearchEmptyBody,
        ),
      );
      return sidebarList;
    }
    for (const item of items) {
      sidebarList.append(
        createClassicSidebarNode(
          targetDocument,
          navDocument,
          item,
          expandedItemIds,
          0,
          strings,
          state,
          rerender,
        ),
      );
    }
    const nextState = state;
    nextState.classicExpandedItemIds = [...expandedItemIds];
    return sidebarList;
  }

  function createClassicSidebarItems(
    model: CcxpLiteSidebarModel,
    query: string,
  ): readonly CcxpLiteSidebarCategoryNode[] {
    const items: CcxpLiteSidebarCategoryNode[] = [model.favorites, ...model.categories];
    if (query === "") {
      return items;
    }
    return items
      .map((item) => filterClassicSidebarItem(item, query))
      .filter((item): item is CcxpLiteSidebarCategoryNode => item !== undefined);
  }

  function filterClassicSidebarItem(
    item: CcxpLiteSidebarCategoryNode,
    query: string,
  ): CcxpLiteSidebarCategoryNode | undefined {
    const normalizedQuery = normalizeClassicSearchText(query);
    const itemMatches = isClassicSearchMatch(item.label, normalizedQuery);
    const blocks = item.blocks
      .map((block) => filterClassicSidebarBlock(block, normalizedQuery))
      .filter((node): node is CcxpLiteSidebarBlock => node !== undefined);
    if (!itemMatches && blocks.length === 0) {
      return undefined;
    }
    return {
      ...item,
      blocks: itemMatches ? item.blocks : blocks,
    };
  }

  function filterClassicSidebarBlock(
    block: CcxpLiteSidebarBlock,
    normalizedQuery: string,
  ): CcxpLiteSidebarBlock | undefined {
    if (isClassicSearchMatch(block.label, normalizedQuery)) {
      return block;
    }
    const links = block.links.filter((linkItem) =>
      isClassicSearchMatch(linkItem.label, normalizedQuery),
    );
    if (links.length === 0) {
      return undefined;
    }
    return {
      ...block,
      links,
    };
  }

  function createClassicSidebarNode(
    targetDocument: Document,
    navDocument: Document,
    group: CcxpLiteSidebarCategoryNode | CcxpLiteSidebarBlock,
    expandedItemIds: ReadonlySet<string>,
    depth: number,
    strings: Readonly<Record<string, string>>,
    state: CcxpLiteSidebarState,
    rerender: () => void,
  ) {
    const isExpanded = expandedItemIds.has(group.id);
    const linkList = targetDocument.createElement("div");
    linkList.className = `ccxp-lite-sidebar-group${group.kind === "category" ? " ccxp-lite-category" : ""}`;
    const button = targetDocument.createElement("button");
    button.type = "button";
    button.className = "ccxp-lite-row-button ccxp-lite-expandable";
    button.setAttribute("aria-expanded", isExpanded ? "true" : "false");
    button.setAttribute("title", group.label);
    button.style.setProperty(
      "--ccxp-lite-row-depth",
      String(getClassicSidebarIndentLevel(group.kind, depth)),
    );
    if (group.kind === "category") {
      const leading = targetDocument.createElement("span");
      leading.className = "ccxp-lite-row-leading";
      leading.append(createCategoryIcon(targetDocument, group.icon ?? "folder"));
      button.append(leading);
    } else if (depth > 0) {
      button.append(createClassicRowLeadingSpacer(targetDocument));
    }
    button.append(createRowLabel(targetDocument, group.label, false));
    button.append(createClassicChevronIcon(targetDocument, isExpanded));
    button.addEventListener("click", () => {
      persistSidebarScroll(targetDocument, "root");
      const nextExpandedItemIds = new Set(expandedItemIds);
      if (nextExpandedItemIds.has(group.id)) {
        nextExpandedItemIds.delete(group.id);
      } else {
        nextExpandedItemIds.add(group.id);
      }
      const nextState = state;
      nextState.classicExpandedItemIds = [...nextExpandedItemIds];
      rerender();
    });
    linkList.append(button);
    if (!isExpanded) {
      return linkList;
    }
    const children = targetDocument.createElement("div");
    children.className = "ccxp-lite-link-list ccxp-lite-link-list-layer";
    children.style.setProperty("--ccxp-lite-tree-depth", String(depth + 1));
    if (group.kind === "category") {
      for (const block of group.blocks) {
        children.append(
          createClassicSidebarNode(
            targetDocument,
            navDocument,
            block,
            expandedItemIds,
            depth + 1,
            strings,
            state,
            rerender,
          ),
        );
      }
    } else {
      for (const linkItem of group.links) {
        children.append(
          createClassicLinkButton(
            targetDocument,
            navDocument,
            linkItem,
            depth + 1,
            strings,
            rerender,
          ),
        );
      }
    }
    if (children.childElementCount === 0) {
      if (group.kind === "category" && group.id === "category-favorites") {
        children.append(
          createEmptyState(
            targetDocument,
            strings.sidebarFavoritesEmptyTitle,
            strings.sidebarFavoritesEmptyBody,
          ),
        );
      } else {
        const emptyText =
          group.kind === "category"
            ? (group.emptyMessage ?? strings.emptyGroup)
            : strings.emptyGroup;
        children.append(createClassicEmptyRow(targetDocument, emptyText, depth + 1));
      }
    }
    linkList.append(children);
    return linkList;
  }

  function createClassicLinkButton(
    targetDocument: Document,
    navDocument: Document,
    linkItem: CcxpLiteSidebarLinkItem,
    depth: number,
    strings: Readonly<Record<string, string>>,
    rerender: () => void,
  ): HTMLElement {
    const button = targetDocument.createElement("button");
    button.type = "button";
    button.className = "ccxp-lite-row-button ccxp-lite-item";
    button.setAttribute("title", linkItem.label);
    button.style.setProperty(
      "--ccxp-lite-row-depth",
      String(getClassicSidebarIndentLevel("link", depth)),
    );
    if (depth > 0) {
      button.append(createClassicRowLeadingSpacer(targetDocument));
    }
    button.append(
      createRowLabel(targetDocument, linkItem.label, isExternalLinkTarget(linkItem, navDocument)),
    );
    button.append(createFavoriteToggle(targetDocument, linkItem, strings, rerender));
    button.addEventListener("click", () => {
      activateLegacyLink(linkItem, navDocument);
    });
    return button;
  }

  function normalizeClassicSearchText(text: string | undefined): string {
    return (text ?? "").toLowerCase().replaceAll(/\s+/g, " ").trim();
  }

  function isClassicSearchMatch(text: string, normalizedQuery: string) {
    return normalizeClassicSearchText(text).includes(normalizedQuery);
  }

  function collectClassicExpandedState(
    item: CcxpLiteSidebarCategoryNode | CcxpLiteSidebarBlock,
    normalizedQuery: string,
  ): {
    hasMatch: boolean;
    expandedItemIds: readonly string[];
  } {
    const itemMatches = isClassicSearchMatch(item.label, normalizedQuery);
    let hasMatch = itemMatches;
    const expandedItemIds: string[] = [];
    if (item.kind === "category") {
      for (const block of item.blocks) {
        const childState = collectClassicExpandedState(block, normalizedQuery);
        expandedItemIds.push(...childState.expandedItemIds);
        if (childState.hasMatch) {
          hasMatch = true;
        }
      }
      if (hasMatch && item.blocks.length > 0) {
        expandedItemIds.push(item.id);
      }
    } else {
      for (const linkItem of item.links) {
        if (isClassicSearchMatch(linkItem.label, normalizedQuery)) {
          hasMatch = true;
        }
      }
      if (hasMatch && item.links.length > 0) {
        expandedItemIds.push(item.id);
      }
    }
    return { hasMatch, expandedItemIds };
  }

  function getClassicSidebarIndentLevel(kind: string, depth: number): number {
    if (kind === "category") {
      return 0;
    }
    return Math.max(0, depth - 1);
  }

  function createClassicRowLeadingSpacer(targetDocument: Document): HTMLElement {
    const spacer = targetDocument.createElement("span");
    spacer.className = "ccxp-lite-row-leading";
    spacer.setAttribute("aria-hidden", "true");
    return spacer;
  }

  function createClassicEmptyRow(
    targetDocument: Document,
    text: string,
    depth: number,
  ): HTMLElement {
    const row = targetDocument.createElement("div");
    row.className = "ccxp-lite-row-button ccxp-lite-item ccxp-lite-empty-row";
    row.style.setProperty(
      "--ccxp-lite-row-depth",
      String(getClassicSidebarIndentLevel("link", depth)),
    );
    if (depth > 0) {
      row.append(createClassicRowLeadingSpacer(targetDocument));
    }
    row.append(createRowLabel(targetDocument, text, false));
    return row;
  }

  function createClassicChevronIcon(targetDocument: Document, isExpanded: boolean): SVGElement {
    const icon = createForwardIcon(targetDocument);
    icon.classList.add("ccxp-lite-chevron");
    if (isExpanded) {
      icon.classList.add("is-expanded");
    }
    return icon;
  }

  function createDashboardView(
    targetDocument: Document,
    navDocument: Document,
    favorites: readonly CcxpLiteSidebarLinkItem[],
    categories: readonly CcxpLiteSidebarCategoryNode[],
    state: CcxpLiteSidebarState,
    strings: Readonly<Record<string, string>>,
    rerender: () => void,
  ): HTMLElement {
    const layout = targetDocument.createElement("div");
    layout.className = "ccxp-lite-dashboard";
    const shell = targetDocument.createElement("section");
    shell.className = "ccxp-lite-dashboard-shell";
    shell.append(createPinnedSection(targetDocument, navDocument, favorites, strings, rerender));
    shell.append(createAllSection(targetDocument, categories, state, strings, rerender));
    layout.append(shell);
    return layout;
  }

  function createPinnedSection(
    targetDocument: Document,
    navDocument: Document,
    favorites: readonly CcxpLiteSidebarLinkItem[],
    strings: Readonly<Record<string, string>>,
    rerender: () => void,
  ): HTMLElement {
    const section = targetDocument.createElement("section");
    section.className = "ccxp-lite-pane ccxp-lite-dashboard-group ccxp-lite-pane-pinned";
    const header = targetDocument.createElement("div");
    header.className = "ccxp-lite-pane-header";
    header.append(createSectionHeading(targetDocument, strings.sidebarPinned));
    section.append(header);
    const body = targetDocument.createElement("div");
    body.className = "ccxp-lite-pane-body ccxp-lite-pinned-list";
    if (!favoriteState.hasLoaded) {
      body.append(createSkeletonStack(targetDocument, 3, "ccxp-lite-skeleton-card"));
    } else if (favorites.length === 0) {
      body.append(
        createEmptyState(
          targetDocument,
          strings.sidebarFavoritesEmptyTitle,
          strings.sidebarFavoritesEmptyBody,
        ),
      );
    } else {
      for (const linkItem of favorites) {
        body.append(createPinnedLinkCard(targetDocument, navDocument, linkItem, strings, rerender));
      }
    }
    section.append(body);
    return section;
  }

  function createAllSection(
    targetDocument: Document,
    categories: readonly CcxpLiteSidebarCategoryNode[],
    state: CcxpLiteSidebarState,
    strings: Readonly<Record<string, string>>,
    rerender: () => void,
  ): HTMLElement {
    const section = targetDocument.createElement("section");
    section.className = "ccxp-lite-pane ccxp-lite-dashboard-group ccxp-lite-pane-all";
    const header = targetDocument.createElement("div");
    header.className = "ccxp-lite-pane-header";
    header.append(createSectionHeading(targetDocument, strings.sidebarAll));
    section.append(header);
    const body = targetDocument.createElement("div");
    body.className = "ccxp-lite-pane-body ccxp-lite-category-browser";
    if (categories.length === 0) {
      body.append(
        createEmptyState(
          targetDocument,
          strings.sidebarSearchEmptyTitle,
          strings.sidebarSearchEmptyBody,
        ),
      );
    } else {
      for (const category of categories) {
        body.append(
          createCategoryCard(targetDocument, category, strings, () => {
            persistSidebarScroll(targetDocument, "root");
            const nextState = state;
            nextState.currentCategoryId = category.id;
            nextState.activeLeaf = undefined;
            rerender();
          }),
        );
      }
    }
    section.append(body);
    return section;
  }

  function createCategoryDetailView(
    targetDocument: Document,
    navDocument: Document,
    category: CcxpLiteSidebarCategoryNode,
    state: CcxpLiteSidebarState,
    strings: Readonly<Record<string, string>>,
    rerender: () => void,
  ): HTMLElement {
    const filteredCategory =
      state.searchQuery === "" ? category : filterCategoryTree(category, state.searchQuery);
    const section = targetDocument.createElement("section");
    section.className = "ccxp-lite-pane ccxp-lite-pane-detail";
    const header = targetDocument.createElement("div");
    header.className = "ccxp-lite-pane-header ccxp-lite-pane-header-detail";
    const backButton = targetDocument.createElement("button");
    backButton.type = "button";
    backButton.className = "ccxp-lite-back-button";
    backButton.setAttribute("aria-label", strings.sidebarBack);
    backButton.setAttribute("title", strings.sidebarBack);
    backButton.append(createBackIcon(targetDocument));
    backButton.addEventListener("click", () => {
      if (state.activeLeaf) {
        persistSidebarScroll(targetDocument, "destination");
        const nextState = state;
        nextState.activeLeaf = undefined;
      } else {
        persistSidebarScroll(targetDocument, "category");
        const nextState = state;
        nextState.currentCategoryId = "";
      }
      rerender();
    });
    header.append(backButton);
    header.append(createSectionHeading(targetDocument, category.label));
    section.append(header);
    const body = targetDocument.createElement("div");
    body.className = "ccxp-lite-category-detail";
    if (filteredCategory) {
      for (const block of filteredCategory.blocks) {
        body.append(createCategoryBlock(targetDocument, navDocument, block, strings, rerender));
      }
      if (body.childElementCount === 0) {
        body.append(
          createEmptyState(
            targetDocument,
            strings.sidebarSectionEmptyTitle,
            strings.sidebarSectionEmptyBody,
          ),
        );
      }
    } else {
      body.append(
        createEmptyState(
          targetDocument,
          strings.sidebarSearchEmptyTitle,
          strings.sidebarSearchEmptyBody,
        ),
      );
    }
    section.append(body);
    scheduleCategoryDetailWaterfall(targetDocument, body);
    return section;
  }

  function scheduleCategoryDetailWaterfall(targetDocument: Document, body: HTMLElement) {
    const view = targetDocument.defaultView;
    if (!view) {
      return;
    }
    const supportsNativeWaterfall =
      CSS.supports("display", "grid-lanes") || CSS.supports("grid-template-rows", "masonry");
    if (supportsNativeWaterfall) {
      return;
    }
    const detailItems = [...(body.children as HTMLCollectionOf<HTMLElement>)].filter(
      (child) => !child.classList.contains("ccxp-lite-empty"),
    );
    if (detailItems.length === 0) {
      return;
    }
    let frameId = 0;
    const scheduleLayout = () => {
      if (frameId > 0) {
        view.cancelAnimationFrame(frameId);
      }
      frameId = view.requestAnimationFrame(() => {
        frameId = 0;
        layoutCategoryDetailWaterfall(view, body, detailItems);
      });
    };
    scheduleLayout();
    view.requestAnimationFrame(scheduleLayout);
    if (typeof ResizeObserver !== "function") {
      view.addEventListener("resize", scheduleLayout, { once: true });
      return;
    }
    const sharedDom = runtimeScope.CCXP_LITE?.sharedDom;
    const observer = new ResizeObserver(() => {
      if (!body.isConnected || (sharedDom !== undefined && !sharedDom.ensureContextValid())) {
        observer.disconnect();
        return;
      }
      scheduleLayout();
    });
    observer.observe(body.parentElement ?? body);
    for (const item of detailItems) {
      observer.observe(item);
    }
    sharedDom?.addCleanupTask(() => {
      observer.disconnect();
    });
  }

  function layoutCategoryDetailWaterfall(
    view: Window,
    body: HTMLElement,
    detailItems: readonly HTMLElement[],
  ) {
    const isSingleColumn = view.matchMedia("(max-width: 900px)").matches;
    resetCategoryDetailWaterfall(body, detailItems);
    if (isSingleColumn || body.clientWidth <= 0) {
      return;
    }
    const columnCount = 3;
    const styles = view.getComputedStyle(body);
    const fallbackGap = Number.parseFloat(
      styles.getPropertyValue("--ccxp-lite-spacing-md") === ""
        ? "16"
        : styles.getPropertyValue("--ccxp-lite-spacing-md"),
    );
    const computedGap = styles.columnGap === "" ? styles.gap : styles.columnGap;
    const parsedGap = Number.parseFloat(computedGap);
    const gap = Number.isFinite(parsedGap) && parsedGap > 0 ? parsedGap : fallbackGap;
    const columnWidth = (body.clientWidth - gap * (columnCount - 1)) / columnCount;
    const columnHeights = Array.from({ length: columnCount }, () => 0);
    body.classList.add("is-waterfall-ready");
    for (const item of detailItems) {
      item.style.width = `${columnWidth}px`;
      const columnIndex = getShortestColumnIndex(columnHeights);
      const x = columnIndex * (columnWidth + gap);
      const y = columnHeights[columnIndex];
      item.style.transform = `translate(${x}px, ${y}px)`;
      columnHeights[columnIndex] += item.offsetHeight + gap;
    }
    const detailBody = body;
    detailBody.style.height = `${Math.max(...columnHeights) - gap}px`;
  }

  function resetCategoryDetailWaterfall(body: HTMLElement, detailItems: readonly HTMLElement[]) {
    const detailBody = body;
    detailBody.classList.remove("is-waterfall-ready");
    detailBody.style.height = "";
    for (const item of detailItems) {
      item.style.width = "";
      item.style.transform = "";
    }
  }

  function getShortestColumnIndex(columnHeights: readonly number[]): number {
    let shortestIndex = 0;
    for (const [index, height] of columnHeights.entries()) {
      if (height < columnHeights[shortestIndex]) {
        shortestIndex = index;
      }
    }
    return shortestIndex;
  }

  function createCategoryBlock(
    targetDocument: Document,
    navDocument: Document,
    blockItem: CcxpLiteSidebarBlock,
    strings: Readonly<Record<string, string>>,
    rerender: () => void,
  ): HTMLElement {
    const block = targetDocument.createElement("div");
    block.className = "ccxp-lite-category-block";
    if (blockItem.label !== "") {
      const title = targetDocument.createElement("h3");
      title.className = "ccxp-lite-category-block-title";
      title.textContent = blockItem.label;
      block.append(title);
    }
    if (blockItem.links.length > 0) {
      for (const linkItem of blockItem.links) {
        block.append(
          createDetailLinkCard(targetDocument, navDocument, linkItem, strings, rerender),
        );
      }
    }
    return block;
  }

  function createSectionHeading(targetDocument: Document, text: string): HTMLElement {
    const heading = targetDocument.createElement("h2");
    heading.className = "ccxp-lite-section-heading";
    heading.textContent = text;
    return heading;
  }

  function createCategoryCard(
    targetDocument: Document,
    category: CcxpLiteSidebarCategoryNode,
    strings: Readonly<Record<string, string>>,
    onOpen: () => void,
  ) {
    const button = targetDocument.createElement("button");
    button.type = "button";
    button.className = "ccxp-lite-category-card";
    button.setAttribute("title", category.label);
    button.addEventListener("click", onOpen);
    const media = targetDocument.createElement("span");
    media.className = "ccxp-lite-category-card-media";
    const iconWrap = targetDocument.createElement("span");
    iconWrap.className = "ccxp-lite-category-card-icon";
    iconWrap.append(createCategoryIcon(targetDocument, category.icon ?? "folder"));
    media.append(iconWrap);
    button.append(media);
    const body = targetDocument.createElement("span");
    body.className = "ccxp-lite-category-card-body";
    const title = targetDocument.createElement("span");
    title.className = "ccxp-lite-category-card-title";
    title.textContent = category.label;
    body.append(title);
    if (category.summary !== undefined && category.summary !== "") {
      const summary = targetDocument.createElement("span");
      summary.className = "ccxp-lite-category-card-summary";
      summary.textContent = category.summary;
      body.append(summary);
    }
    button.append(body);
    const footer = targetDocument.createElement("span");
    footer.className = "ccxp-lite-category-card-footer";
    const footerLabel = targetDocument.createElement("span");
    footerLabel.className = "ccxp-lite-category-card-action";
    footerLabel.textContent = strings.sidebarOpenCategory;
    footer.append(footerLabel);
    footer.append(createForwardIcon(targetDocument));
    button.append(footer);
    return button;
  }

  function createPinnedLinkCard(
    targetDocument: Document,
    navDocument: Document,
    linkItem: CcxpLiteSidebarLinkItem,
    strings: Readonly<Record<string, string>>,
    rerender: () => void,
  ) {
    const button = targetDocument.createElement("button");
    button.type = "button";
    button.className = "ccxp-lite-link-card ccxp-lite-pinned-card";
    button.setAttribute("title", linkItem.label);
    button.append(
      createRowLabel(targetDocument, linkItem.label, isExternalLinkTarget(linkItem, navDocument)),
    );
    button.append(createFavoriteToggle(targetDocument, linkItem, strings, rerender));
    button.addEventListener("click", () => {
      openLeafDestination(targetDocument, navDocument, linkItem, rerender);
    });
    return button;
  }

  function createDetailLinkCard(
    targetDocument: Document,
    navDocument: Document,
    linkItem: CcxpLiteSidebarLinkItem,
    strings: Readonly<Record<string, string>>,
    rerender: () => void,
  ) {
    const button = targetDocument.createElement("button");
    button.type = "button";
    button.className = "ccxp-lite-link-card ccxp-lite-detail-link-card";
    button.setAttribute("title", linkItem.label);
    button.append(
      createRowLabel(targetDocument, linkItem.label, isExternalLinkTarget(linkItem, navDocument)),
    );
    button.append(createFavoriteToggle(targetDocument, linkItem, strings, rerender));
    button.addEventListener("click", () => {
      openLeafDestination(targetDocument, navDocument, linkItem, rerender);
    });
    return button;
  }

  function createEmptyState(targetDocument: Document, title: string, body?: string): HTMLElement {
    const empty = targetDocument.createElement("div");
    empty.className = "ccxp-lite-empty";
    const titleNode = targetDocument.createElement("div");
    titleNode.className = "ccxp-lite-empty-title";
    titleNode.textContent = title;
    empty.append(titleNode);
    if (body !== undefined && body !== "") {
      const bodyNode = targetDocument.createElement("div");
      bodyNode.className = "ccxp-lite-empty-body";
      bodyNode.textContent = body;
      empty.append(bodyNode);
    }
    return empty;
  }

  function createSkeletonStack(
    targetDocument: Document,
    count: number,
    itemClassName: string,
  ): HTMLElement {
    const wrap = targetDocument.createElement("div");
    wrap.className = "ccxp-lite-skeleton-stack";
    for (const _ of Array.from({ length: count })) {
      const item = targetDocument.createElement("div");
      item.className = itemClassName;
      wrap.append(item);
    }
    return wrap;
  }

  function createRowLabel(
    targetDocument: Document,
    text: string,
    withExternalLinkIcon: boolean,
  ): HTMLElement {
    const labelWrap = targetDocument.createElement("span");
    labelWrap.className = "ccxp-lite-row-label-wrap";
    const label = targetDocument.createElement("span");
    label.className = "ccxp-lite-row-label";
    label.textContent = text;
    labelWrap.append(label);
    if (withExternalLinkIcon) {
      labelWrap.append(createExternalLinkIcon(targetDocument));
    }
    return labelWrap;
  }

  function createFavoriteToggle(
    targetDocument: Document,
    linkItem: CcxpLiteSidebarLinkItem,
    strings: Readonly<Record<string, string>>,
    onFavoritesChange: () => void,
  ): HTMLElement {
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
    favoriteButton.append(createFavoriteStarIcon(targetDocument, isFavorite));
    favoriteButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const applyFavoriteChange = () => {
        const favoriteIds = new Set(getFavoriteIds());
        const matchingIds = getMatchingFavoriteIds(linkItem, favoriteIds);
        if (matchingIds.length > 0) {
          for (const favoriteId of matchingIds) {
            favoriteIds.delete(favoriteId);
          }
        } else {
          favoriteIds.add(linkItem.id);
        }
        writeFavoriteIds(favoriteIds);
        if (typeof onFavoritesChange === "function") {
          onFavoritesChange();
        }
      };
      const favoriteIds = getFavoriteIds();
      const matchingIds = getMatchingFavoriteIds(linkItem, favoriteIds);
      if (matchingIds.length > 0) {
        showRemovePinnedDialog(targetDocument, linkItem.label, strings).then(
          (shouldRemove) => {
            if (!shouldRemove) {
              return;
            }
            applyFavoriteChange();
          },
          () => undefined,
        );
        return;
      }
      applyFavoriteChange();
    });
    return favoriteButton;
  }

  async function showRemovePinnedDialog(
    targetDocument: Document,
    itemName: string,
    strings: Readonly<Record<string, string>>,
  ): Promise<boolean> {
    return await new Promise((resolve) => {
      // In layered mode the nav frame is full-screen, so targetDocument works. In classic mode the
      // nav frame is narrow (324px); mount the dialog in the main frame instead so it centers over
      // the larger content area.
      let overlayDocument: Document = targetDocument;
      try {
        const mainFrame = getLegacyMainFrame();
        const mainDoc = mainFrame?.contentDocument;
        if (mainDoc?.body && mainDoc.body.clientWidth > 100) {
          overlayDocument = mainDoc;
        }
      } catch {
        // Fall back to nav frame document.
      }
      ensureThemeDocument(overlayDocument, "nav");
      const existingOverlay = overlayDocument.querySelector(
        "[data-ccxp-lite-remove-pinned-dialog]",
      );
      if (existingOverlay) {
        resolve(false);
        return;
      }
      const overlay = overlayDocument.createElement("div");
      overlay.dataset.ccxpLiteRemovePinnedDialog = "true";
      overlay.setAttribute("role", "presentation");
      Object.assign(overlay.style, {
        position: "fixed",
        inset: "0",
        zIndex: "2147483647",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        backgroundColor: "rgba(17, 24, 39, 0.36)",
      });
      const dialog = overlayDocument.createElement("div");
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");
      dialog.tabIndex = -1;
      Object.assign(dialog.style, {
        width: "min(100%, 540px)",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        padding: "36px",
        border: "1px solid var(--ccxp-lite-border)",
        borderRadius: "var(--ccxp-lite-radius-md)",
        backgroundColor: "var(--ccxp-lite-surface)",
        boxShadow: "0 20px 48px rgba(17, 24, 39, 0.2)",
      });
      const titleId = `ccxp-lite-remove-pinned-title-${Date.now()}`;
      const descriptionId = `ccxp-lite-remove-pinned-description-${Date.now()}`;
      dialog.setAttribute("aria-labelledby", titleId);
      dialog.setAttribute("aria-describedby", descriptionId);
      const title = overlayDocument.createElement("h3");
      title.id = titleId;
      title.textContent = `${strings.sidebarRemovePinnedDialogTitlePrefix}${itemName}${strings.sidebarRemovePinnedDialogTitleSuffix}`;
      Object.assign(title.style, {
        margin: "0",
        color: "var(--ccxp-lite-text)",
        font: "var(--ccxp-lite-type-body-strong)",
      });
      const description = overlayDocument.createElement("p");
      description.id = descriptionId;
      description.textContent = strings.sidebarRemovePinnedDialogDescription;
      Object.assign(description.style, {
        margin: "0",
        color: "var(--ccxp-lite-text-muted)",
        font: "var(--ccxp-lite-type-body)",
      });
      const actions = overlayDocument.createElement("div");
      Object.assign(actions.style, {
        display: "flex",
        justifyContent: "flex-end",
        gap: "12px",
        marginTop: "12px",
      });
      const keepButton = createDialogActionButton(
        overlayDocument,
        strings.sidebarRemovePinnedDialogCancel,
        "secondary",
      );
      const confirmButton = createDialogActionButton(
        overlayDocument,
        strings.sidebarRemovePinnedDialogConfirm,
        "danger",
      );
      let settled = false;
      // Track the previously focused element in the nav frame (targetDocument), not in the
      // top-level document where the overlay is mounted.
      const previousActiveElement = targetDocument.activeElement;
      const cleanup = (confirmed: boolean) => {
        if (settled) {
          return;
        }
        settled = true;
        overlay.remove();
        if (
          previousActiveElement instanceof HTMLElement &&
          targetDocument.contains(previousActiveElement)
        ) {
          previousActiveElement.focus();
        }
        resolve(confirmed);
      };
      keepButton.addEventListener("click", () => {
        cleanup(false);
      });
      confirmButton.addEventListener("click", () => {
        cleanup(true);
      });
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
          cleanup(false);
        }
      });
      dialog.addEventListener("click", (event) => {
        event.stopPropagation();
      });
      overlay.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          cleanup(false);
        }
      });
      actions.append(keepButton);
      actions.append(confirmButton);
      dialog.append(title);
      dialog.append(description);
      dialog.append(actions);
      overlay.append(dialog);
      getOverlayMountNode(overlayDocument).append(overlay);
      keepButton.focus();
    });
  }

  function createDialogActionButton(
    targetDocument: Document,
    label: string,
    variant: "secondary" | "danger",
  ): HTMLElement {
    const button = targetDocument.createElement("button");
    button.type = "button";
    button.textContent = label;
    const baseStyles = {
      minWidth: "112px",
      height: "40px",
      padding: "0 16px",
      borderRadius: "var(--ccxp-lite-radius-sm)",
      border: "1px solid var(--ccxp-lite-border)",
      font: "var(--ccxp-lite-type-utility)",
      cursor: "pointer",
      transition: "background-color 120ms ease, border-color 120ms ease, color 120ms ease",
      outline: "none",
    };
    if (variant === "danger") {
      Object.assign(button.style, baseStyles, {
        borderColor: "var(--ccxp-lite-type-danger-color)",
        backgroundColor: "var(--ccxp-lite-type-danger-color)",
        color: "var(--ccxp-lite-surface)",
      });
      button.addEventListener("mouseenter", () => {
        button.style.filter = "brightness(0.96)";
      });
      button.addEventListener("mouseleave", () => {
        button.style.filter = "";
      });
    } else {
      Object.assign(button.style, baseStyles, {
        backgroundColor: "var(--ccxp-lite-surface)",
        color: "var(--ccxp-lite-text)",
      });
      button.addEventListener("mouseenter", () => {
        button.style.backgroundColor = "var(--ccxp-lite-primary-hover-surface)";
        button.style.borderColor = "var(--ccxp-lite-primary-focus-border)";
      });
      button.addEventListener("mouseleave", () => {
        button.style.backgroundColor = "var(--ccxp-lite-surface)";
        button.style.borderColor = "var(--ccxp-lite-border)";
      });
    }
    button.addEventListener("focus", () => {
      if (!button.matches(":focus-visible")) {
        return;
      }
      button.style.outline = "2px solid var(--ccxp-lite-primary-focus-border)";
      button.style.outlineOffset = "2px";
    });
    button.addEventListener("blur", () => {
      button.style.outline = "none";
      button.style.outlineOffset = "0";
    });
    return button;
  }

  function createDestinationView(
    targetDocument: Document,
    navDocument: Document,
    activeCategory: CcxpLiteSidebarCategoryNode | undefined,
    activeLeaf: CcxpLiteSidebarLinkItem,
    strings: Readonly<Record<string, string>>,
    rerender: () => void,
  ): HTMLElement {
    const section = targetDocument.createElement("section");
    section.className = "ccxp-lite-pane ccxp-lite-pane-detail";
    const header = targetDocument.createElement("div");
    header.className = "ccxp-lite-pane-header ccxp-lite-pane-header-detail";
    const backButton = targetDocument.createElement("button");
    backButton.type = "button";
    backButton.className = "ccxp-lite-back-button";
    backButton.setAttribute("aria-label", strings.sidebarBack);
    backButton.setAttribute("title", strings.sidebarBack);
    backButton.append(createBackIcon(targetDocument));
    backButton.addEventListener("click", () => {
      const state = getSidebarUiState(targetDocument);
      state.activeLeaf = undefined;
      rerender();
    });
    header.append(backButton);
    header.append(createBreadcrumbHeading(targetDocument, activeCategory, activeLeaf));
    section.append(header);
    const frameWrap = targetDocument.createElement("div");
    frameWrap.className = "ccxp-lite-destination-wrap";
    const loading = targetDocument.createElement("div");
    loading.className = "ccxp-lite-destination-loading";
    loading.append(createSkeletonStack(targetDocument, 1, "ccxp-lite-skeleton-progress"));
    const loadingLabel = targetDocument.createElement("div");
    loadingLabel.className = "ccxp-lite-destination-loading-label";
    loadingLabel.textContent = strings.sidebarDestinationLoading;
    loading.append(loadingLabel);
    loading.append(createSkeletonStack(targetDocument, 3, "ccxp-lite-skeleton-frame-line"));
    const error = targetDocument.createElement("div");
    error.className = "ccxp-lite-destination-error";
    error.hidden = true;
    error.append(
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
      if (!state.activeLeaf) {
        return;
      }
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
    openButton.addEventListener("click", () => {
      openLeafInNewTab(activeLeaf, navDocument);
    });
    actions.append(retryButton);
    actions.append(openButton);
    error.append(actions);
    const frame = targetDocument.createElement("iframe");
    frame.className = "ccxp-lite-destination-frame";
    frame.setAttribute("frameborder", "0");
    frame.setAttribute("scrolling", "auto");
    frame.setAttribute("allowTransparency", "true");
    frame.title = activeLeaf.label;
    frame.hidden = true;
    const legacyMainFrame = getLegacyMainFrame();
    let hasSettled = false;
    const settleSuccess = () => {
      if (hasSettled) {
        return;
      }
      hasSettled = true;
      globalThis.clearTimeout(timeoutId);
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
        const legacyHref = legacyWindow ? legacyWindow.location.href : "";
        if (legacyHref !== "" && legacyHref !== "about:blank" && frame.src !== legacyHref) {
          frame.src = legacyHref;
          return;
        }
      } catch {
        // Ignore cross-frame location reads and rely on the destination frame event.
      }
      if (frame.contentDocument && frame.contentDocument.readyState === "complete") {
        simplifyEmbeddedFrame(frame);
        settleSuccess();
      }
    };
    const timeoutId = globalThis.setTimeout(settleError, DESTINATION_LOAD_TIMEOUT_MS, undefined);
    frame.addEventListener("load", () => {
      simplifyEmbeddedFrame(frame);
      settleSuccess();
    });
    frameWrap.append(loading);
    frameWrap.append(error);
    frameWrap.append(frame);
    if (legacyMainFrame) {
      legacyMainFrame.addEventListener("load", syncFromLegacyMainFrame, { once: true });
    }
    section.append(frameWrap);
    activateLegacyLink(activeLeaf, navDocument, frame);
    return section;
  }

  function createSearchIcon(targetDocument: Document): SVGElement {
    const icon = targetDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("class", "ccxp-lite-sidebar-search-icon");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "2");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    icon.setAttribute("aria-hidden", "true");
    for (const pathData of ["M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16", "m21 21-4.3-4.3"]) {
      const path = targetDocument.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathData);
      icon.append(path);
    }
    return icon;
  }

  function createBreadcrumbHeading(
    targetDocument: Document,
    activeCategory: CcxpLiteSidebarCategoryNode | undefined,
    activeLeaf: CcxpLiteSidebarLinkItem,
  ): HTMLElement {
    const heading = targetDocument.createElement("h2");
    heading.className = "ccxp-lite-breadcrumb-heading";
    if (activeCategory) {
      const category = targetDocument.createElement("span");
      category.className = "ccxp-lite-breadcrumb-parent";
      category.textContent = activeCategory.label;
      heading.append(category);
      heading.append(createBreadcrumbChevronIcon(targetDocument));
    }
    const leaf = targetDocument.createElement("span");
    leaf.className = "ccxp-lite-breadcrumb-current";
    leaf.textContent = activeLeaf.label;
    heading.append(leaf);
    return heading;
  }

  function createBreadcrumbChevronIcon(targetDocument: Document): SVGElement {
    const icon = targetDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("class", "ccxp-lite-breadcrumb-chevron");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "2");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    icon.setAttribute("aria-hidden", "true");
    const path = targetDocument.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "m9 18 6-6-6-6");
    icon.append(path);
    return icon;
  }

  function createExternalLinkIcon(targetDocument: Document): SVGElement {
    const icon = targetDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("class", "ccxp-lite-link-icon");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "2");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    icon.setAttribute("aria-hidden", "true");
    for (const pathData of [
      "M15 3h6v6",
      "M10 14 21 3",
      "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",
    ]) {
      const path = targetDocument.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathData);
      icon.append(path);
    }
    return icon;
  }

  function createFavoriteStarIcon(targetDocument: Document, isFavorite: boolean): SVGElement {
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
    icon.append(path);
    return icon;
  }

  function createLabIcon(targetDocument: Document): SVGElement {
    const icon = targetDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("class", "ccxp-lite-inline-icon");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("width", "18");
    icon.setAttribute("height", "18");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "2");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    icon.setAttribute("aria-hidden", "true");
    for (const pathData of [
      "M10 2v7.31",
      "M14 9.3V2",
      "M8.5 2h7",
      "M14 9.3 19.74 19a2 2 0 0 1-1.72 3H5.98a2 2 0 0 1-1.72-3L10 9.3",
      "M6 16h12",
    ]) {
      const path = targetDocument.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathData);
      icon.append(path);
    }
    return icon;
  }

  function syncTopLevelFramesetLayout(variant: "classic" | "layered") {
    try {
      const scopeDocument = window.top ? window.top.document : document;
      const innerFrameset = scopeDocument.querySelector("frameset[cols]");
      if (!innerFrameset) {
        return;
      }
      innerFrameset.setAttribute("cols", variant === "classic" ? "324,*" : "*,0");
    } catch {
      // Ignore cross-frame layout sync failures.
    }
  }

  function mountSidebarVariantSwitch(
    targetDocument: Document,
    state: CcxpLiteSidebarState,
    strings: Readonly<Record<string, string>>,
    rerender: () => void,
    _footer?: HTMLElement,
  ) {
    const variant = state.sidebarVariant;
    const mainFrame = getLegacyMainFrame();
    const mainDocument = mainFrame?.contentDocument;
    // In classic mode, we want the button to stay at the bottom-right of the screen, which
    // corresponds to the bottom-right of the main frame.
    const isClassic = variant === "classic";
    const mountDocument = isClassic && mainDocument ? mainDocument : targetDocument;
    const button = createSidebarVariantSwitch(mountDocument, state, strings, rerender);
    button.dataset.ccxpLiteSidebarLabSwitch = "true";
    removeExistingSidebarVariantSwitches([
      targetDocument,
      mainDocument ?? undefined,
      mountDocument,
    ]);
    Object.assign(button.style, {
      position: "fixed",
      right: "24px",
      bottom: "24px",
      zIndex: "2147483646",
    });
    getOverlayMountNode(mountDocument).append(button);
  }

  function removeExistingSidebarVariantSwitches(documents: ReadonlyArray<Document | undefined>) {
    for (const scopeDocument of documents) {
      if (!scopeDocument) {
        continue;
      }
      for (const node of scopeDocument.querySelectorAll("[data-ccxp-lite-sidebar-lab-switch]")) {
        node.remove();
      }
    }
  }

  function getOverlayMountNode(targetDocument: Document): HTMLElement {
    return targetDocument.body;
  }

  function createBackIcon(targetDocument: Document) {
    const icon = targetDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("class", "ccxp-lite-inline-icon");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "2.2");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    icon.setAttribute("aria-hidden", "true");
    for (const pathData of ["M19 12H5", "m12 7-7 5 7 5"]) {
      const path = targetDocument.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathData);
      icon.append(path);
    }
    return icon;
  }

  function createForwardIcon(targetDocument: Document) {
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
    icon.append(path);
    return icon;
  }

  function createCategoryIcon(targetDocument: Document, iconName: string): SVGElement {
    const icon = targetDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("class", "ccxp-lite-category-icon");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "2");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    icon.setAttribute("aria-hidden", "true");
    for (const shape of getCategoryIconShapes(iconName)) {
      const tagName = typeof shape === "string" ? "path" : shape.tag;
      const attributes = typeof shape === "string" ? { d: shape } : shape.attributes;
      const element = targetDocument.createElementNS("http://www.w3.org/2000/svg", tagName);
      for (const [name, value] of Object.entries(attributes)) {
        element.setAttribute(name, value);
      }
      icon.append(element);
    }
    return icon;
  }

  function getCategoryIconShapes(iconName: string): ReadonlyArray<
    | string
    | {
        tag: string;
        attributes: Record<string, string>;
      }
  > {
    const iconShapeMap: Record<
      string,
      Array<
        | string
        | {
            tag: string;
            attributes: Record<string, string>;
          }
      >
    > = {
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
    return iconShapeMap[iconName] ?? iconShapeMap.folders;
  }
  namespace.sidebarUi = {
    renderSidebar,
    createSidebarSearch,
    mountSidebarVariantSwitch,
    syncTopLevelFramesetLayout,
  };
})(globalThis);
