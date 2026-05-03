(function registerCcxpLiteSidebarData(globalScope: typeof globalThis) {
  const runtimeScope = globalScope;
  const namespace = runtimeScope.CCXP_LITE ?? {};
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
    const normalizedItems = root.children
      .map((entry, index) => normalizeRootEntry(entry, index, navDocument))
      .filter((item): item is CcxpLiteSidebarTreeNode => item !== undefined);
    const favoriteIds = getFavoriteIds();
    return buildCategorizedSidebarItems(normalizedItems, favoriteIds, strings);
  }

  function buildCategorizedSidebarItems(
    items: readonly CcxpLiteSidebarTreeNode[],
    favoriteIds: ReadonlySet<string>,
    strings: Readonly<Record<string, string>> = STRINGS,
  ): CcxpLiteSidebarModel {
    const buckets = new Map<string, CcxpLiteSidebarTreeNode[]>(
      SIDEBAR_CATEGORIES.map((category) => [category.id, [] as CcxpLiteSidebarTreeNode[]]),
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
        label: strings.sidebarCategoryFavorites || "\u5E38\u7528\u529F\u80FD",
        icon: "star",
        directLinks: dedupeLinkItems(favoriteLinks),
        sections: [],
        emptyMessage: strings.sidebarFavoritesEmpty || "Press star at any function to save it here",
        kind: "category",
      },
      categories: SIDEBAR_CATEGORIES.map((category): CcxpLiteSidebarCategoryNode | undefined => {
        const categoryItems = buckets.get(category.id) ?? [];
        if (categoryItems.length === 0) {
          return undefined;
        }
        const directLinkItems = categoryItems
          .filter((item) => item.kind === "link")
          .map((item) => item.linkItem);
        const groupedSections = categoryItems.filter((item) => item.kind !== "link");
        const sections: readonly CcxpLiteSidebarGroup[] =
          directLinkItems.length === 0
            ? groupedSections
            : [
                {
                  id: `category-${category.id}-other`,
                  label: strings.sidebarCategoryOtherSection || "\u5176\u4ED6",
                  directLinks: directLinkItems,
                  sections: [],
                  kind: "group",
                } as CcxpLiteSidebarSectionNode,
                ...groupedSections,
              ];
        return {
          id: `category-${category.id}`,
          label: strings[category.labelKey] ?? category.fallbackLabel,
          icon: category.icon,
          summary: (category.summaryLabels ?? []).join(" \u00B7 "),
          directLinks: [],
          sections,
          emptyMessage: strings.emptyGroup,
          kind: "category",
        };
      }).filter((item): item is CcxpLiteSidebarCategoryNode => item !== undefined),
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
      ) ?? undefined
    );
  }

  function normalizeSidebarLabel(label: string | undefined): string {
    return (label ?? "")
      .replaceAll(/[()\uFF08\uFF09]/g, " ")
      .replaceAll(/[&,]/g, " ")
      .replaceAll(/\s*\/\s*/g, " ")
      .replaceAll(/\s+/g, " ")
      .trim();
  }

  function collectSidebarLabels(item: CcxpLiteSidebarTreeNode): readonly string[] {
    const labels: string[] = [];
    const itemLabel = normalizeSidebarLabel(item.label);
    if (itemLabel) {
      labels.push(itemLabel);
    }
    if (item.kind === "link") {
      return labels;
    }
    for (const linkItem of item.directLinks) {
      const linkLabel = normalizeSidebarLabel(linkItem.label);
      if (linkLabel) {
        labels.push(linkLabel);
      }
    }
    for (const section of item.sections) {
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
  ): CcxpLiteSidebarTreeNode | undefined {
    if ("children" in entryNode) {
      return normalizeTopLevelGroup(entryNode, index, navDocument);
    }
    const linkItem = normalizeLinkItem(entryNode, navDocument, []);
    if (!linkItem) {
      return undefined;
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
  ): CcxpLiteSidebarSectionNode {
    const directLinks: CcxpLiteSidebarLinkItem[] = [];
    const groupLabel = toPlainText(folderNode.desc, navDocument);
    const groupPathSegments = buildFavoritePathSegments([], groupLabel, `group-${index}`);
    for (const childNode of folderNode.children) {
      if ("children" in childNode) {
        directLinks.push(...collectNestedLinksIntoGroup(childNode, navDocument, groupPathSegments));
        continue;
      }
      const linkItem = normalizeLinkItem(childNode, navDocument, groupPathSegments);
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
    for (const childNode of folderNode.children) {
      if ("children" in childNode) {
        directLinks.push(
          ...collectNestedLinksIntoGroup(childNode, navDocument, parentPathSegments),
        );
        continue;
      }
      const linkItem = normalizeLinkItem(childNode, navDocument, parentPathSegments);
      if (linkItem) {
        directLinks.push(linkItem);
      }
    }
    return directLinks;
  }

  function normalizeLinkItem(
    itemNode: CcxpLiteLegacySidebarDocNode | undefined,
    navDocument: Document,
    parentPathSegments: readonly string[],
  ): CcxpLiteSidebarLinkItem | undefined {
    if (!itemNode || typeof itemNode.link !== "string") {
      return undefined;
    }
    const parsedLink = parseLegacyLink(itemNode.link);
    if (!parsedLink.href) {
      return undefined;
    }
    const rawHtml = itemNode.desc ?? "";
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

  function parseLegacyLink(rawLink: string): {
    href: string;
    target: string;
  } {
    const hrefMatch = rawLink.match(/^'([^']+)'/);
    const targetMatch = rawLink.match(/target="?([^\s"]+)"?/i);
    return {
      href: hrefMatch ? hrefMatch[1] : "",
      target: targetMatch ? targetMatch[1] : "main",
    };
  }

  function parseClickLinkArgs(rawHtml: string):
    | {
        name: string;
        url: string;
      }
    | undefined {
    const match = rawHtml.match(/ClickLink\("([^"]+)","([^"]+)"\)/);
    if (!match) {
      return undefined;
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
    return scratch.textContent.replaceAll(/\s+/g, " ").trim();
  }

  function extractLegacyVisibleText(rawHtml: unknown) {
    return [
      ...String(rawHtml)
        .replaceAll(/<br\s*\/?>/gi, "\n")
        .matchAll(/>([^<>]+)/g),
    ]
      .map((match) => match[1].replaceAll(/\s+/g, " ").trim())
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
    return categories
      .map((category) => filterCategoryTree(category, query))
      .filter((item): item is CcxpLiteSidebarCategoryNode => item !== undefined);
  }

  function filterCategoryTree(category: CcxpLiteSidebarCategoryNode | undefined, query: string) {
    if (!category) {
      return undefined;
    }
    if (isSearchMatch(category.label, query)) {
      return category;
    }
    const directLinks = category.directLinks.filter((linkItem) =>
      isSearchMatch(linkItem.label, query),
    );
    const sections = category.sections
      .map((section) => filterSectionTree(section, query))
      .filter((node): node is CcxpLiteSidebarGroup => node !== undefined);
    if (directLinks.length === 0 && sections.length === 0) {
      return undefined;
    }
    return {
      ...category,
      directLinks,
      sections,
    };
  }

  function filterSectionTree(
    section: CcxpLiteSidebarGroup | undefined,
    query: string,
  ): CcxpLiteSidebarGroup | undefined {
    if (!section) {
      return undefined;
    }
    if (isSearchMatch(section.label, query)) {
      return section;
    }
    const directLinks = section.directLinks.filter((linkItem) =>
      isSearchMatch(linkItem.label, query),
    );
    const sections = section.sections
      .map((childSection) => filterSectionTree(childSection, query))
      .filter((node): node is CcxpLiteSidebarGroup => node !== undefined);
    if (directLinks.length === 0 && sections.length === 0) {
      return undefined;
    }
    return {
      ...section,
      directLinks,
      sections,
    };
  }

  function isSearchMatch(text: string | undefined, query: string) {
    return normalizeSearchText(text).includes(normalizeSearchText(query));
  }

  function normalizeSearchText(text: string | undefined) {
    return (text ?? "").toLowerCase().replaceAll(/\s+/g, " ").trim();
  }

  function countLinksInTree(item: CcxpLiteSidebarTreeNode | undefined): number {
    if (!item) {
      return 0;
    }
    if (item.kind === "link") {
      return 1;
    }
    return (
      item.directLinks.length +
      item.sections.reduce(
        (total: number, section: CcxpLiteSidebarGroup) => total + countLinksInTree(section),
        0,
      )
    );
  }

  function parseSidebarTree(navDocument: Document): CcxpLiteLegacySidebarFolderNode | undefined {
    const statements = [...navDocument.scripts]
      .map((script) => script.textContent)
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
    return root.children.length > 0 ? root : undefined;
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

  function buildLegacyLinkString(targetToken: string, href: string) {
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
