(function registerCcxpLiteSidebarData(globalScope: Window & typeof globalThis) {
  const runtimeScope = globalScope;
  const namespace = (runtimeScope.CCXP_LITE ||= {}) as CcxpLiteNamespace;
  const { shared, sidebarFavorites } = namespace;
  if (!shared || !sidebarFavorites) {
    return;
  }

  const { STRINGS, SIDEBAR_CATEGORIES } = shared;
  const {
    collectFavoriteLinks,
    dedupeLinkItems,
    getFavoriteIds,
    buildFavoritePathSegments,
    createLinkId,
    createLegacyLinkId,
  } = sidebarFavorites;

  function buildSidebarModel(
    root: CcxpLiteLegacySidebarFolderNode,
    navDocument: Document,
    strings: Readonly<Record<string, string>>,
  ): CcxpLiteSidebarModel {
    const normalizedItems = (root.children || [])
      .map((entry, index) => normalizeRootEntry(entry, index, navDocument))
      .filter((item): item is CcxpLiteSidebarTreeNode => item !== null);
    const favoriteIds = getFavoriteIds();
    return buildCategorizedSidebarItems(normalizedItems, favoriteIds, strings);
  }

  function buildCategorizedSidebarItems(
    items: readonly CcxpLiteSidebarTreeNode[],
    favoriteIds: ReadonlySet<string>,
    strings: Readonly<Record<string, string>> = STRINGS,
  ): CcxpLiteSidebarModel {
    const buckets = new Map<string, CcxpLiteSidebarTreeNode[]>(
      (SIDEBAR_CATEGORIES as Array<{ id: string }>).map((category) => [category.id, []]),
    );
    const favoriteLinks = items.flatMap((item) => collectFavoriteLinks(item, favoriteIds));

    for (const item of items) {
      const category = findCategoryForItem(item);
      if (category) {
        buckets.get(category.id)?.push(item);
      }
    }

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

        const directLinkItems = categoryItems
          .filter((item) => item.kind === "link")
          .map((item) => item.linkItem);
        const groupedSections = categoryItems.filter((item) => item.kind !== "link");
        const sections =
          directLinkItems.length === 0
            ? groupedSections
            : [
                {
                  id: `category-${category.id}-other`,
                  label: strings.sidebarCategoryOtherSection || "其他",
                  directLinks: directLinkItems,
                  sections: [],
                  kind: "group",
                },
                ...groupedSections,
              ];

        return {
          id: `category-${category.id}`,
          label: strings[category.labelKey] || category.fallbackLabel || category.id,
          icon: category.icon,
          summary: (category.summaryLabels || []).join(" · "),
          directLinks: [],
          sections,
          emptyMessage: strings.emptyGroup,
          kind: "category",
        };
      }).filter((item): item is CcxpLiteSidebarCategoryNode => item !== null),
    };
  }

  function findCategoryForItem(item: CcxpLiteSidebarTreeNode) {
    const candidateLabels = collectSidebarLabels(item);

    return (
      SIDEBAR_CATEGORIES.find((category) =>
        category.itemLabels.some((label: string) => {
          const normalizedCategoryLabel = normalizeSidebarLabel(label);
          return candidateLabels.some((candidateLabel) =>
            isSidebarLabelMatch(candidateLabel, normalizedCategoryLabel),
          );
        }),
      ) || null
    );
  }

  function normalizeSidebarLabel(label: string | null | undefined): string {
    return (label || "")
      .replaceAll(/[()（）]/g, " ")
      .replaceAll(/[&,]/g, " ")
      .replaceAll(/\s*\/\s*/g, " ")
      .replaceAll(/\s+/g, " ")
      .trim();
  }

  function collectSidebarLabels(item: CcxpLiteSidebarTreeNode): readonly string[] {
    if (!item) {
      return [];
    }

    const labels: string[] = [];
    const itemLabel = normalizeSidebarLabel(item.label);
    if (itemLabel) {
      labels.push(itemLabel);
    }

    if (item.kind === "link") {
      return labels;
    }

    for (const linkItem of item.directLinks || []) {
      const linkLabel = normalizeSidebarLabel(linkItem.label);
      if (linkLabel) {
        labels.push(linkLabel);
      }
    }

    for (const section of item.sections || []) {
      labels.push(...collectSidebarLabels(section));
    }

    return labels;
  }

  function isSidebarLabelMatch(candidateLabel: string, normalizedCategoryLabel: string) {
    if (!candidateLabel || !normalizedCategoryLabel) {
      return false;
    }

    return (
      normalizedCategoryLabel === candidateLabel ||
      candidateLabel.includes(normalizedCategoryLabel) ||
      normalizedCategoryLabel.includes(candidateLabel)
    );
  }

  function normalizeRootEntry(
    entryNode: CcxpLiteLegacySidebarNode,
    index: number,
    navDocument: Document,
  ): CcxpLiteSidebarTreeNode | null {
    if (!entryNode) {
      return null;
    }

    if ("children" in entryNode) {
      const folderNode = entryNode as CcxpLiteLegacySidebarFolderNode;
      if (folderNode.children) {
        return normalizeTopLevelGroup(folderNode, index, navDocument);
      }
    }

    const linkItem = normalizeLinkItem(entryNode as CcxpLiteLegacySidebarDocNode, navDocument, []);
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

  function normalizeTopLevelGroup(
    folderNode: CcxpLiteLegacySidebarFolderNode,
    index: number,
    navDocument: Document,
  ) {
    const directLinks: CcxpLiteSidebarLinkItem[] = [];
    const groupLabel = toPlainText(folderNode.desc, navDocument);
    const groupPathSegments = buildFavoritePathSegments([], groupLabel, `group-${index}`);
    for (const childNode of folderNode.children || []) {
      if (childNode && childNode.children) {
        directLinks.push(
          ...collectNestedLinksIntoGroup(
            childNode as CcxpLiteLegacySidebarFolderNode,
            navDocument,
            groupPathSegments,
          ),
        );
        continue;
      }

      const linkItem = normalizeLinkItem(
        childNode as CcxpLiteLegacySidebarDocNode,
        navDocument,
        groupPathSegments,
      );
      if (linkItem) {
        directLinks.push(linkItem);
      }
    }

    return {
      id: `group-${index}`,
      label: groupLabel,
      directLinks,
      sections: [],
      kind: "group",
    };
  }

  function collectNestedLinksIntoGroup(
    folderNode: CcxpLiteLegacySidebarFolderNode,
    navDocument: Document,
    parentPathSegments: readonly string[],
  ): readonly CcxpLiteSidebarLinkItem[] {
    const directLinks: CcxpLiteSidebarLinkItem[] = [];

    for (const childNode of folderNode.children || []) {
      if (childNode && childNode.children) {
        directLinks.push(
          ...collectNestedLinksIntoGroup(
            childNode as CcxpLiteLegacySidebarFolderNode,
            navDocument,
            parentPathSegments,
          ),
        );
        continue;
      }

      const linkItem = normalizeLinkItem(
        childNode as CcxpLiteLegacySidebarDocNode,
        navDocument,
        parentPathSegments,
      );
      if (linkItem) {
        directLinks.push(linkItem);
      }
    }

    return directLinks;
  }

  function normalizeLinkItem(
    itemNode: CcxpLiteLegacySidebarDocNode | null | undefined,
    navDocument: Document,
    parentPathSegments: readonly string[],
  ): CcxpLiteSidebarLinkItem | null {
    if (!itemNode || typeof itemNode.link !== "string") {
      return null;
    }

    const parsedLink = parseLegacyLink(itemNode.link);
    if (!parsedLink.href) {
      return null;
    }

    const rawHtml = itemNode.desc || "";
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

  function parseLegacyLink(rawLink: string): { href: string; target: string } {
    const hrefMatch = rawLink.match(/^'([^']+)'/);
    const targetMatch = rawLink.match(/target="?([^\s"]+)"?/i);

    return {
      href: hrefMatch ? hrefMatch[1] : "",
      target: targetMatch ? targetMatch[1] : "main",
    };
  }

  function parseClickLinkArgs(rawHtml: string): { name: string; url: string } | null {
    const match = rawHtml.match(/ClickLink\("([^"]+)","([^"]+)"\)/);
    if (!match) {
      return null;
    }

    return {
      name: match[1],
      url: match[2],
    };
  }

  function toPlainText(rawHtml: unknown, navDocument: Document) {
    if (!rawHtml) {
      return "";
    }

    const extractedVisibleText = extractLegacyVisibleText(rawHtml);
    if (extractedVisibleText) {
      return extractedVisibleText;
    }

    const scratch = navDocument.createElement("div");
    scratch.innerHTML = (typeof rawHtml === "string" ? rawHtml : "")
      .replaceAll(/onclick='[^']*'/gi, "")
      .replaceAll(String.raw`\"`, "&quot;")
      .replaceAll(String.raw`\'`, "&#39;")
      .replaceAll(/<br\s*\/?>/gi, " ");
    return (scratch.textContent || "").replaceAll(/\s+/g, " ").trim();
  }

  function extractLegacyVisibleText(rawHtml) {
    return [
      ...String(rawHtml)
        .replaceAll(/<br\s*\/?>/gi, "\n")
        .matchAll(/>([^<>]+)/g),
    ]
      .map((match) => (match[1] || "").replaceAll(/\s+/g, " ").trim())
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  function filterFavoriteLinks(
    linkItems: readonly CcxpLiteSidebarLinkItem[],
    query: string,
  ): readonly CcxpLiteSidebarLinkItem[] {
    if (!query) {
      return linkItems;
    }

    return linkItems.filter((linkItem) => isSearchMatch(linkItem.label, query));
  }

  function filterCategories(
    categories: readonly CcxpLiteSidebarCategoryNode[],
    query: string,
  ): readonly CcxpLiteSidebarCategoryNode[] {
    if (!query) {
      return categories;
    }

    return categories.map((category) => filterCategoryTree(category, query)).filter(Boolean);
  }

  function filterCategoryTree(category: CcxpLiteSidebarCategoryNode | null, query: string) {
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
      .filter((node): node is CcxpLiteSidebarSectionNode => node !== null);

    if (directLinks.length === 0 && sections.length === 0) {
      return null;
    }

    return {
      ...category,
      directLinks,
      sections,
    };
  }

  function filterSectionTree(
    section: CcxpLiteSidebarSectionNode | null,
    query: string,
  ): CcxpLiteSidebarSectionNode | null {
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
      .filter((node): node is CcxpLiteSidebarSectionNode => node !== null);

    if (directLinks.length === 0 && sections.length === 0) {
      return null;
    }

    return {
      ...section,
      directLinks,
      sections,
    };
  }

  function isSearchMatch(text: string | null | undefined, query: string) {
    return normalizeSearchText(text).includes(normalizeSearchText(query));
  }

  function normalizeSearchText(text: string | null | undefined) {
    return (text || "").toLowerCase().replaceAll(/\s+/g, " ").trim();
  }

  function countLinksInTree(item: CcxpLiteSidebarGroup | null): number {
    if (!item) {
      return 0;
    }

    return (
      (item.directLinks || []).length +
      (item.sections || []).reduce(
        (total: number, section: CcxpLiteSidebarGroup) => total + countLinksInTree(section),
        0,
      )
    );
  }

  function parseSidebarTree(navDocument: Document): CcxpLiteLegacySidebarFolderNode | null {
    const statements = [...navDocument.scripts]
      .map((script) => script.textContent || "")
      .join("\n")
      .split(";")
      .map((statement) => statement.trim())
      .filter(Boolean);

    const nodes = new Map<string, CcxpLiteLegacySidebarFolderNode>();
    const root: CcxpLiteLegacySidebarFolderNode = { desc: "", children: [] };
    nodes.set("foldersTree", root);

    const stringPattern = String.raw`"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'`;
    const rootRegex = new RegExp(
      String.raw`^foldersTree\s*=\s*gFld\s*\(\s*(${stringPattern})\s*,\s*(${stringPattern})\s*\)$`,
    );
    const folderRegex = new RegExp(
      String.raw`^(\w+)\s*=\s*insFld\s*\(\s*(\w+)\s*,\s*gFld\s*\(\s*(${stringPattern})\s*,\s*(${stringPattern})\s*\)\s*\)$`,
    );
    const docRegex = new RegExp(
      String.raw`^insDoc\s*\(\s*(\w+)\s*,\s*gLnk\s*\(\s*([^,]+?)\s*,\s*(${stringPattern})\s*,\s*(${stringPattern})\s*\)\s*\)$`,
    );

    for (const statement of statements) {
      const rootMatch = statement.match(rootRegex);
      if (rootMatch) {
        root.desc = parseJsStringLiteral(rootMatch[1]);
        continue;
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
        continue;
      }

      const docMatch = statement.match(docRegex);
      if (docMatch) {
        const [, parentName, targetToken, descLiteral, hrefLiteral] = docMatch;
        const parentNode = nodes.get(parentName);
        if (!parentNode) {
          continue;
        }

        parentNode.children.push({
          desc: parseJsStringLiteral(descLiteral),
          link: buildLegacyLinkString(targetToken.trim(), parseJsStringLiteral(hrefLiteral)),
        });
      }
    }

    return root.children.length > 0 ? root : null;
  }

  function parseJsStringLiteral(literal: string): string {
    const quote = literal[0];
    const inner = literal.slice(1, -1);

    if (quote === '"') {
      return JSON.parse(literal) as string;
    }

    return inner
      .replaceAll("\\\\", "\\")
      .replaceAll(String.raw`\'`, "'")
      .replaceAll(String.raw`\"`, '"')
      .replaceAll(String.raw`\n`, "\n")
      .replaceAll(String.raw`\r`, "\r")
      .replaceAll(String.raw`\t`, "\t");
  }

  function buildLegacyLinkString(targetToken, href) {
    return `'${href}' target="${targetToken === "1" ? "_blank" : "main"}"`;
  }

  namespace.sidebarData = {
    buildSidebarModel,
    parseSidebarTree,
    filterFavoriteLinks,
    filterCategories,
    filterCategoryTree,
    countLinksInTree,
  };
})(globalThis);
