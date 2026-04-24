// @ts-nocheck
(function registerCcxpLiteSidebarData(globalScope) {
  const namespace = globalScope.CCXP_LITE || (globalScope.CCXP_LITE = {});
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
    const groupLabel = toPlainText(folderNode.desc, navDocument);
    const groupPathSegments = buildFavoritePathSegments([], groupLabel, `group-${index}`);

    (folderNode.children || []).forEach((childNode) => {
      if (childNode && childNode.children) {
        collectNestedLinksIntoGroup(childNode, navDocument, groupPathSegments, directLinks);
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
      sections: [],
      kind: "group",
    };
  }

  function collectNestedLinksIntoGroup(folderNode, navDocument, parentPathSegments, directLinks) {
    (folderNode.children || []).forEach((childNode) => {
      if (childNode && childNode.children) {
        collectNestedLinksIntoGroup(childNode, navDocument, parentPathSegments, directLinks);
        return;
      }

      const linkItem = normalizeLinkItem(childNode, navDocument, parentPathSegments);
      if (linkItem) {
        directLinks.push(linkItem);
      }
    });
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

  namespace.sidebarData = {
    buildSidebarModel,
    parseSidebarTree,
    filterFavoriteLinks,
    filterCategories,
    filterCategoryTree,
    countLinksInTree,
  };
})(window);
