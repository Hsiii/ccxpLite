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
    const unmatchedItems: CcxpLiteSidebarTreeNode[] = [];
    const favoriteLinks = items.flatMap((item) => collectFavoriteLinks(item, favoriteIds));
    for (const item of items) {
      const category = findCategoryForItem(item);
      if (category) {
        buckets.get(category.id)?.push(item);
        continue;
      }
      unmatchedItems.push(item);
    }
    const categories: CcxpLiteSidebarCategoryNode[] = SIDEBAR_CATEGORIES.map(
      (category): CcxpLiteSidebarCategoryNode | undefined => {
        const categoryItems = buckets.get(category.id) ?? [];
        if (categoryItems.length === 0) {
          return undefined;
        }
        return buildSidebarCategoryNode(category, categoryItems, strings);
      },
    ).filter((item): item is CcxpLiteSidebarCategoryNode => item !== undefined);
    if (unmatchedItems.length > 0) {
      categories.push(buildSidebarCategoryNode(UNCATEGORIZED_CATEGORY, unmatchedItems, strings));
    }
    return {
      favorites: {
        id: "category-favorites",
        label:
          strings.sidebarCategoryFavorites === ""
            ? "\u5E38\u7528\u529F\u80FD"
            : strings.sidebarCategoryFavorites,
        icon: "star",
        directLinks: dedupeLinkItems(favoriteLinks),
        sections: [],
        emptyMessage:
          strings.sidebarFavoritesEmpty === ""
            ? "Press star at any function to save it here"
            : strings.sidebarFavoritesEmpty,
        kind: "category",
      },
      categories,
    };
  }

  function buildSidebarCategoryNode(
    category: CcxpLiteSidebarCategoryDefinition,
    categoryItems: readonly CcxpLiteSidebarTreeNode[],
    strings: Readonly<Record<string, string>>,
  ): CcxpLiteSidebarCategoryNode {
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
              label: deriveSyntheticSectionLabel(category, directLinkItems, strings),
              directLinks: directLinkItems,
              sections: [],
              kind: "group",
            } as CcxpLiteSidebarSectionNode,
            ...groupedSections,
          ];
    return {
      id: `category-${category.id}`,
      label:
        strings[category.labelKey] === ""
          ? (category.fallbackLabel ?? "")
          : strings[category.labelKey],
      icon: category.icon,
      summary: (category.summaryLabels ?? []).join(" \u00B7 "),
      directLinks: [],
      sections,
      emptyMessage: strings.emptyGroup,
      kind: "category",
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
    if (itemLabel !== "") {
      labels.push(itemLabel);
    }
    if (item.kind === "link") {
      return labels;
    }
    for (const linkItem of item.directLinks) {
      const linkLabel = normalizeSidebarLabel(linkItem.label);
      if (linkLabel !== "") {
        labels.push(linkLabel);
      }
    }
    for (const section of item.sections) {
      labels.push(...collectSidebarLabels(section));
    }
    return labels;
  }

  function isSidebarLabelMatch(candidateLabel: string, normalizedCategoryLabel: string) {
    if (candidateLabel === "" || normalizedCategoryLabel === "") {
      return false;
    }
    return (
      normalizedCategoryLabel === candidateLabel ||
      candidateLabel.includes(normalizedCategoryLabel) ||
      normalizedCategoryLabel.includes(candidateLabel)
    );
  }

  function deriveSyntheticSectionLabel(
    category: CcxpLiteSidebarCategoryDefinition,
    linkItems: readonly CcxpLiteSidebarLinkItem[],
    strings: Readonly<Record<string, string>>,
  ) {
    const labels = linkItems
      .map((linkItem) => linkItem.label.trim())
      .filter((label) => label !== "");
    if (labels.length === 0) {
      return strings.sidebarCategoryOtherSection === ""
        ? "\u5176\u4ED6"
        : strings.sidebarCategoryOtherSection;
    }
    if (labels.length === 1) {
      return summarizeSingleLabel(labels[0], strings);
    }
    const locale = detectLabelLocale(labels);
    const topKeywords = [
      ...new Set(scoreSyntheticSectionKeywords(labels, category.id, locale)),
    ].slice(0, 2);
    if (topKeywords.length === 0) {
      return strings.sidebarCategoryOtherSection === ""
        ? "\u5176\u4ED6"
        : strings.sidebarCategoryOtherSection;
    }
    return topKeywords.join(locale === "en" ? " & " : "\u8207");
  }

  function summarizeSingleLabel(label: string, strings: Readonly<Record<string, string>>) {
    const normalizedLabel = normalizeSidebarLabel(label);
    if (normalizedLabel === "") {
      return strings.sidebarCategoryOtherSection === ""
        ? "\u5176\u4ED6"
        : strings.sidebarCategoryOtherSection;
    }
    const locale = detectLabelLocale([normalizedLabel]);
    const parts = normalizedLabel
      .split(/\s+/)
      .map((part) => part.trim())
      .filter((part) => part !== "");
    if (locale === "en") {
      return parts.slice(0, 3).join(" ");
    }
    return parts[0] ?? normalizedLabel;
  }

  function detectLabelLocale(labels: readonly string[]): CcxpLiteLocale {
    return labels.some((label) => /[A-Za-z]/.test(label) && !/[\u4E00-\u9FFF]/.test(label))
      ? "en"
      : "zh";
  }

  function scoreSyntheticSectionKeywords(
    labels: readonly string[],
    categoryId: string,
    locale: CcxpLiteLocale,
  ): readonly string[] {
    const keywordCatalog = locale === "en" ? EN_SECTION_KEYWORDS : ZH_SECTION_KEYWORDS;
    const categoryBoosts: Readonly<Record<string, readonly string[]>> =
      locale === "en" ? EN_CATEGORY_KEYWORDS : ZH_CATEGORY_KEYWORDS;
    const categoryPriority = categoryBoosts[categoryId] ?? [];
    const scores = new Map<string, number>();
    for (const label of labels) {
      const normalizedLabel = normalizeSidebarLabel(label).toLowerCase();
      for (const keyword of keywordCatalog) {
        if (keyword.patterns.some((pattern) => normalizedLabel.includes(pattern))) {
          scores.set(keyword.label, (scores.get(keyword.label) ?? 0) + keyword.weight);
        }
      }
    }
    for (const keyword of categoryBoosts[categoryId] ?? []) {
      if (scores.has(keyword)) {
        scores.set(keyword, (scores.get(keyword) ?? 0) + 1);
      }
    }
    return [...scores.entries()]
      .toSorted((left, right) => {
        if (right[1] !== left[1]) {
          return right[1] - left[1];
        }
        const leftPriority = categoryPriority.indexOf(left[0]);
        const rightPriority = categoryPriority.indexOf(right[0]);
        if (leftPriority !== rightPriority) {
          if (leftPriority === -1) {
            return 1;
          }
          if (rightPriority === -1) {
            return -1;
          }
          return leftPriority - rightPriority;
        }
        return left[0].localeCompare(right[0], locale === "en" ? "en" : "zh-Hant");
      })
      .map(([label]) => label);
  }

  const ZH_SECTION_KEYWORDS = [
    { label: "\u5E33\u865F", patterns: ["\u5E33\u865F"], weight: 3 },
    { label: "\u500B\u8CC7", patterns: ["\u500B\u4EBA\u8CC7\u6599", "\u500B\u8CC7"], weight: 3 },
    { label: "\u5C0E\u5E2B", patterns: ["\u5C0E\u5E2B"], weight: 3 },
    { label: "\u5B78\u5206", patterns: ["\u5B78\u5206", "\u62B5\u514D"], weight: 3 },
    { label: "\u6210\u7E3E", patterns: ["\u6210\u7E3E", "\u6210\u7E3E\u55AE"], weight: 3 },
    { label: "\u8AB2\u7A0B", patterns: ["\u8AB2\u7A0B"], weight: 2 },
    { label: "\u9078\u8AB2", patterns: ["\u9078\u8AB2"], weight: 3 },
    { label: "\u9810\u6392", patterns: ["\u9810\u6392"], weight: 3 },
    { label: "\u8DE8\u7CFB", patterns: ["\u8DE8\u7CFB", "\u6821\u969B"], weight: 2 },
    { label: "\u66F8\u9762", patterns: ["\u66F8\u9762"], weight: 2 },
    { label: "\u8A55\u91CF", patterns: ["\u8A55\u91CF", "\u554F\u5377"], weight: 3 },
    { label: "\u7968\u9078", patterns: ["\u7968\u9078", "\u6295\u7968"], weight: 3 },
    { label: "\u5FA9\u5B78", patterns: ["\u5FA9\u5B78"], weight: 3 },
    { label: "\u8F49\u7CFB", patterns: ["\u8F49\u7CFB", "\u8F49\u6240"], weight: 3 },
    { label: "\u5175\u5F79", patterns: ["\u5175\u5F79"], weight: 3 },
    { label: "\u7562\u696D", patterns: ["\u7562\u696D"], weight: 3 },
    { label: "\u53E3\u8A66", patterns: ["\u53E3\u8A66", "\u5B78\u4F4D\u8003\u8A66"], weight: 3 },
    { label: "\u5B78\u4F4D", patterns: ["\u5B78\u4F4D"], weight: 3 },
    { label: "\u96E2\u6821", patterns: ["\u96E2\u6821"], weight: 3 },
    { label: "\u7E73\u8CBB", patterns: ["\u7E73\u8CBB"], weight: 3 },
    { label: "\u9000\u8CBB", patterns: ["\u9000\u8CBB"], weight: 3 },
    { label: "\u50B3\u7968", patterns: ["\u50B3\u7968"], weight: 3 },
    { label: "\u6240\u5F97", patterns: ["\u6240\u5F97"], weight: 3 },
    { label: "\u8CB8\u6B3E", patterns: ["\u8CB8\u6B3E"], weight: 3 },
    { label: "\u6E1B\u514D", patterns: ["\u6E1B\u514D"], weight: 3 },
    { label: "\u52A9\u5B78", patterns: ["\u52A9\u5B78"], weight: 3 },
    { label: "\u5BBF\u820D", patterns: ["\u5BBF\u820D", "\u4F4F\u5BBF"], weight: 3 },
    { label: "\u5076\u5BBF", patterns: ["\u5916\u5BBF"], weight: 3 },
    { label: "\u5065\u5EB7", patterns: ["\u5065\u5EB7", "\u7167\u8B77"], weight: 3 },
    { label: "\u8077\u6DAF", patterns: ["\u8077\u6DAF"], weight: 3 },
    { label: "\u8ACB\u5047", patterns: ["\u8ACB\u5047"], weight: 3 },
    { label: "\u8868\u55AE", patterns: ["\u8868\u55AE"], weight: 3 },
    { label: "\u51FA\u570B", patterns: ["\u51FA\u570B"], weight: 3 },
    { label: "\u5BE6\u7FD2", patterns: ["\u5BE6\u7FD2"], weight: 3 },
    { label: "\u5B78\u7FD2", patterns: ["\u5B78\u7FD2\u5E73\u53F0"], weight: 3 },
    { label: "\u8A08\u901A", patterns: ["\u8A08\u901A"], weight: 3 },
    { label: "\u7814\u767C", patterns: ["\u7814\u767C"], weight: 3 },
    { label: "\u6821\u5167\u7CFB\u7D71", patterns: ["\u6821\u5167", "\u7CFB\u7D71"], weight: 2 },
    { label: "\u516C\u544A", patterns: ["\u516C\u544A", "\u901A\u5831"], weight: 3 },
    { label: "\u6703\u8B70", patterns: ["\u6703\u8B70"], weight: 3 },
  ] as const;

  const EN_SECTION_KEYWORDS = [
    { label: "Account", patterns: ["account"], weight: 3 },
    { label: "Profile", patterns: ["profile", "personal"], weight: 3 },
    { label: "Advisor", patterns: ["advisor"], weight: 3 },
    { label: "Credits", patterns: ["credit"], weight: 3 },
    { label: "Grades", patterns: ["grade", "transcript"], weight: 3 },
    { label: "Courses", patterns: ["course"], weight: 2 },
    { label: "Enrollment", patterns: ["enroll", "select course"], weight: 3 },
    { label: "Schedule", patterns: ["schedule"], weight: 3 },
    { label: "Feedback", patterns: ["feedback", "comment"], weight: 3 },
    { label: "Survey", patterns: ["survey", "questionnaire"], weight: 3 },
    { label: "Voting", patterns: ["vote", "voting"], weight: 3 },
    { label: "Graduation", patterns: ["graduat"], weight: 3 },
    { label: "Defense", patterns: ["defense"], weight: 3 },
    { label: "Tuition", patterns: ["tuition", "payment"], weight: 3 },
    { label: "Refund", patterns: ["refund"], weight: 3 },
    { label: "Aid", patterns: ["aid", "grant"], weight: 3 },
    { label: "Loan", patterns: ["loan"], weight: 3 },
    { label: "Housing", patterns: ["housing", "dorm"], weight: 3 },
    { label: "Health", patterns: ["health", "care"], weight: 3 },
    { label: "Career", patterns: ["career"], weight: 3 },
    { label: "Forms", patterns: ["form"], weight: 3 },
    { label: "Leave", patterns: ["leave"], weight: 3 },
    { label: "Travel", patterns: ["travel"], weight: 3 },
    { label: "Internship", patterns: ["internship"], weight: 3 },
    { label: "Systems", patterns: ["system", "platform"], weight: 2 },
    { label: "Notices", patterns: ["notice", "announcement"], weight: 3 },
    { label: "Meetings", patterns: ["meeting"], weight: 3 },
  ] as const;

  const ZH_CATEGORY_KEYWORDS = {
    profile: ["\u5E33\u865F", "\u500B\u8CC7", "\u5C0E\u5E2B"],
    "planning-and-enrollment": ["\u9078\u8AB2", "\u9810\u6392", "\u8DE8\u7CFB"],
    "courses-and-grades": ["\u6210\u7E3E", "\u5B78\u5206", "\u8AB2\u7A0B"],
    "teaching-feedback": ["\u8A55\u91CF", "\u7968\u9078"],
    "status-changes": ["\u5FA9\u5B78", "\u8F49\u7CFB", "\u5175\u5F79"],
    "graduation-and-defense": ["\u7562\u696D", "\u53E3\u8A66", "\u5B78\u4F4D"],
    "payments-and-aid": ["\u7E73\u8CBB", "\u9000\u8CBB", "\u50B3\u7968"],
    "financial-aid": ["\u52A9\u5B78", "\u6E1B\u514D", "\u8CB8\u6B3E"],
    "housing-and-life": ["\u5BBF\u820D", "\u5065\u5EB7", "\u8077\u6DAF"],
    forms: ["\u8868\u55AE", "\u8ACB\u5047", "\u51FA\u570B"],
    "campus-systems": ["\u5B78\u7FD2", "\u8A08\u901A", "\u6821\u5167\u7CFB\u7D71"],
    "announcements-and-voting": ["\u516C\u544A", "\u7968\u9078", "\u6703\u8B70"],
  } as const satisfies Readonly<Record<string, readonly string[]>>;

  const EN_CATEGORY_KEYWORDS = {
    profile: ["Account", "Profile", "Advisor"],
    "planning-and-enrollment": ["Enrollment", "Schedule", "Courses"],
    "courses-and-grades": ["Grades", "Credits", "Courses"],
    "teaching-feedback": ["Feedback", "Survey", "Voting"],
    "status-changes": ["Enrollment"],
    "graduation-and-defense": ["Graduation", "Defense"],
    "payments-and-aid": ["Tuition", "Refund", "Aid"],
    "financial-aid": ["Aid", "Loan"],
    "housing-and-life": ["Housing", "Health", "Career"],
    forms: ["Forms", "Leave", "Travel"],
    "campus-systems": ["Systems", "Courses"],
    "announcements-and-voting": ["Notices", "Voting", "Meetings"],
  } as const satisfies Readonly<Record<string, readonly string[]>>;

  const UNCATEGORIZED_CATEGORY = {
    id: "uncategorized",
    labelKey: "sidebarCategoryUncategorized",
    fallbackLabel: "\u65B0\u589E\u8207\u672A\u5206\u985E",
    icon: "folder",
    summaryLabels: [],
    itemLabels: [],
  } as const satisfies CcxpLiteSidebarCategoryDefinition;

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
    if (parsedLink.href === "") {
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
    if (rawHtml === null || rawHtml === undefined || rawHtml === "") {
      return "";
    }
    const extractedVisibleText = extractLegacyVisibleText(rawHtml);
    if (extractedVisibleText !== "") {
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
    if (query === "") {
      return linkItems;
    }
    return linkItems.filter((linkItem) => isSearchMatch(linkItem.label, query));
  }

  function filterCategories(
    categories: readonly CcxpLiteSidebarCategoryNode[],
    query: string,
  ): readonly CcxpLiteSidebarCategoryNode[] {
    if (query === "") {
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
