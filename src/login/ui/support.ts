(function registerCcxpLiteLoginSupport(globalScope: typeof globalThis) {
  const runtimeScope = globalScope;
  const namespace = runtimeScope.CCXP_LITE ?? {};
  const { shared } = namespace;
  if (!shared) {
    return;
  }
  const { getLocalizedStrings, removeNode, cleanLegacyAttributes } = shared;
  function findLoginSourceCell(
    targetDocument: Document,
    loginForm: Element | undefined,
  ): HTMLElement | undefined {
    if (loginForm) {
      return loginForm.closest<HTMLElement>("td, table, section, article") ?? undefined;
    }
    return (
      [...targetDocument.querySelectorAll<HTMLElement>("td, table, div, section, article")].find(
        (cell) => cell.querySelector("form") !== null,
      ) ?? undefined
    );
  }

  function findCalendarTable(targetNode: ParentNode): HTMLTableElement | undefined {
    const calendarFrame = targetNode.querySelector<HTMLIFrameElement>(
      "iframe[src*='calendar/cal.php']",
    );
    if (!calendarFrame) {
      return undefined;
    }
    return (
      [...targetNode.querySelectorAll<HTMLTableElement>("table")].find(
        (table) =>
          table.contains(calendarFrame) &&
          ["\u6708\u66C6", "Calendar"].some((text) => table.textContent.includes(text)),
      ) ?? undefined
    );
  }

  function findAnnouncementTable(targetDocument: Document) {
    const rightPanel = [...targetDocument.querySelectorAll<HTMLTableCellElement>("td")].find(
      (cell) => {
        const widthText = normalizeLegacyWidth(cell.getAttribute("width") ?? cell.style.width);
        if (widthText !== "35%" && widthText !== "35") {
          return false;
        }
        return Boolean(cell.querySelector(".board_item, .board_subject"));
      },
    );
    const panelTables = rightPanel
      ? [...rightPanel.querySelectorAll<HTMLTableElement>("table")]
      : [];
    const fallbackTables = [...targetDocument.querySelectorAll<HTMLTableElement>("table")];
    const isAnnouncementTable = (table: HTMLTableElement) => {
      const rows = [...table.rows];
      if (rows.length === 0) {
        return false;
      }
      const headingCell = rows
        .flatMap((row) => [...row.cells])
        .find((cell) => cell.classList.contains("board_item"));
      const headingText = normalizeAnnouncementHeading(headingCell && headingCell.textContent);
      if (!hasAnnouncementHeading(headingText)) {
        return false;
      }
      const boardHeaderRow = rows.find((row) => {
        const cells = [...row.cells];
        return cells.filter((cell) => cell.classList.contains("board_subject")).length >= 2;
      });
      if (!boardHeaderRow) {
        return false;
      }
      const dateRows = rows.filter((row) => {
        const cells = [...row.cells];
        if (cells.length < 2) {
          return false;
        }
        const firstCell = cells[0];
        const secondCell = cells[1];
        const firstClass = firstCell.classList;
        const secondClass = secondCell.classList;
        const isBoardPair =
          (firstClass.contains("board_0") && secondClass.contains("board_0")) ||
          (firstClass.contains("board_1") && secondClass.contains("board_1"));
        if (!isBoardPair) {
          return false;
        }
        const rawDate = firstCell.textContent.replaceAll(/\s+/g, "").trim();
        if (!/^\d{4}(?:\/\d{2}){2}$/.test(rawDate)) {
          return false;
        }
        const topicText = secondCell.textContent.replaceAll(/\s+/g, " ").trim();
        return topicText.length > 8;
      });
      return dateRows.length >= 2;
    };
    const preferred = panelTables.find((table) => {
      if (table.closest(".tabcontent")) {
        return false;
      }
      return isAnnouncementTable(table);
    });
    if (preferred) {
      return preferred;
    }
    return fallbackTables.find((table) => isAnnouncementTable(table)) ?? undefined;
  }

  function normalizeAnnouncementHeading(rawText: string | undefined) {
    return (rawText ?? "").replaceAll(/\s+/g, " ").trim().toLowerCase();
  }

  function hasAnnouncementHeading(headingText: string) {
    return [
      "\u7CFB\u7D71\u516C\u544A",
      "notice",
      "system news",
      "academic system news",
      "system notice",
      "system announcement",
      "announcement",
    ].some((pattern) => headingText.includes(pattern));
  }

  function prepareAnnouncementTable(
    table: HTMLTableElement | undefined,
    strings: Readonly<Record<string, string>> = getLocalizedStrings("zh"),
  ) {
    if (!table || table.dataset.ccxpLiteAnnouncementPrepared === "true") {
      return undefined;
    }
    table.classList.add("ccxp-lite-announcement-table");
    const rows = [...table.rows];
    for (const row of rows) {
      const cells = [...row.cells];
      if (cells.length === 0) {
        continue;
      }
      const hasOnlyDecorativeCells = cells.every((cell) => {
        const hasBgColor = (cell.getAttribute("bgcolor") ?? "").trim() !== "";
        const text = cell.textContent.replaceAll(/\s+/g, "").trim();
        return hasBgColor && text === "";
      });
      const hasOnlyEmptySpacerCells = cells.every((cell) => {
        const text = cell.textContent.replaceAll(/\s+/g, "").trim();
        if (text !== "") {
          return false;
        }
        return !cell.querySelector("img, iframe, table, form, input, button, a, ul, ol, p");
      });
      const hasLegacySpacerHeight =
        (row.getAttribute("height") ?? "").trim() !== "" ||
        cells.some((cell) => (cell.getAttribute("height") ?? "").trim() !== "");
      if (hasOnlyDecorativeCells) {
        removeNode(row);
        continue;
      }
      if (hasOnlyEmptySpacerCells && hasLegacySpacerHeight) {
        removeNode(row);
      }
    }
    const headerCell = rows
      .flatMap((row) => [...row.cells])
      .find((cell) => cell.classList.contains("board_item"));
    const titleText = (headerCell ? headerCell.textContent : "").replaceAll(/\s+/g, " ").trim();
    const headerRow = rows.find((row) => {
      const cells = [...row.cells];
      return cells.filter((cell) => cell.classList.contains("board_subject")).length >= 2;
    });
    if (headerRow) {
      removeNode(headerRow);
    }
    const entries: Array<{
      date: string;
      topicContent: HTMLElement;
      hasTokenizedHeader: boolean;
    }> = [];
    for (const row of rows) {
      const cells = [...row.cells];
      if (cells.length < 2) {
        continue;
      }
      const rawDate = cells[0].textContent.replaceAll(/\s+/g, "").trim();
      if (!/^\d{4}(?:\/\d{2}){2}$/.test(rawDate)) {
        continue;
      }
      const topicCell = cells[1];
      const topicContent = topicCell.cloneNode(true) as HTMLElement;
      if (typeof cleanLegacyAttributes === "function") {
        cleanLegacyAttributes(topicContent);
      }
      if (isPasswordHelpAnnouncement(topicContent, strings)) {
        continue;
      }
      entries.push({
        date: rawDate,
        topicContent,
        hasTokenizedHeader: tokenizeAnnouncementHeader(topicContent, rawDate),
      });
    }
    if (entries.length === 0) {
      const announcementTable = table;
      announcementTable.hidden = true;
      announcementTable.dataset.ccxpLiteAnnouncementPrepared = "true";
      return undefined;
    }
    const primaryActionAnchor = extractPrimaryAnnouncementAction(entries[0]?.topicContent);
    if (primaryActionAnchor) {
      entries.shift();
    }
    if (entries.length === 0) {
      const announcementTable = table;
      announcementTable.hidden = true;
      announcementTable.dataset.ccxpLiteAnnouncementPrepared = "true";
      return primaryActionAnchor;
    }
    const tbody = table.tBodies[0];
    if (table.tBodies.length === 0) {
      table.append(tbody);
    }
    tbody.textContent = "";
    const titleRow = table.ownerDocument.createElement("tr");
    titleRow.className = "ccxp-lite-announcement-title-row";
    const titleCell = table.ownerDocument.createElement("td");
    titleCell.className = "ccxp-lite-announcement-title";
    const titleHeading = table.ownerDocument.createElement("h3");
    titleHeading.className = "ccxp-lite-announcement-title-heading ccxp-lite-account-guide-title";
    const titleLabel = table.ownerDocument.createElement("span");
    titleLabel.className = "ccxp-lite-announcement-title-label";
    titleLabel.textContent =
      titleText === "" ? strings.sidebarCategoryAnnouncementsAndVoting : titleText;
    titleHeading.append(titleLabel, createAnnouncementMegaphoneIcon(table.ownerDocument));
    titleCell.append(titleHeading);
    titleRow.append(titleCell);
    const contentRow = table.ownerDocument.createElement("tr");
    contentRow.className = "ccxp-lite-announcement-scroll-row";
    const contentCell = table.ownerDocument.createElement("td");
    contentCell.className = "ccxp-lite-announcement-content-cell";
    const list = table.ownerDocument.createElement("div");
    list.className = "ccxp-lite-announcement-list";
    for (const entry of entries) {
      const item = table.ownerDocument.createElement("article");
      item.className = "ccxp-lite-announcement-row";
      const entryRow = table.ownerDocument.createElement("div");
      entryRow.className = "ccxp-lite-announcement-entry";
      if (entry.hasTokenizedHeader) {
        entryRow.classList.add("ccxp-lite-announcement-entry--merged-date");
      }
      const body = table.ownerDocument.createElement("div");
      body.className = "ccxp-lite-announcement-topic";
      while (entry.topicContent.firstChild) {
        body.append(entry.topicContent.firstChild);
      }
      removeEmptyAnnouncementDecorators(body);
      entryRow.append(body);
      if (!entry.hasTokenizedHeader) {
        const date = table.ownerDocument.createElement("div");
        date.className = "ccxp-lite-announcement-date";
        date.textContent = entry.date;
        entryRow.append(date);
      }
      item.append(entryRow);
      list.append(item);
    }
    contentCell.append(list);
    contentRow.append(contentCell);
    tbody.append(titleRow);
    tbody.append(contentRow);
    const announcementTable = table;
    announcementTable.dataset.ccxpLiteAnnouncementPrepared = "true";
    return primaryActionAnchor;
  }

  function extractPrimaryAnnouncementAction(topicContent: HTMLElement | undefined) {
    if (!topicContent) {
      return undefined;
    }
    const sourceAnchor = topicContent.querySelector<HTMLAnchorElement>("a[href]");
    if (!sourceAnchor) {
      return undefined;
    }
    return sourceAnchor.cloneNode(true) as HTMLAnchorElement;
  }

  function removeEmptyAnnouncementDecorators(topicContent: HTMLElement) {
    const decorativeSelector = "b, strong, font, span, i, em, u";
    let removedAny: boolean;
    do {
      removedAny = false;
      const decorativeNodes = [...topicContent.querySelectorAll<HTMLElement>(decorativeSelector)];
      for (const node of decorativeNodes) {
        const normalizedText = node.textContent.replaceAll("\u00A0", " ").trim();
        if (normalizedText !== "") {
          continue;
        }
        if (node.querySelector("a, button, input, select, textarea, img, svg, table, iframe")) {
          continue;
        }
        node.remove();
        removedAny = true;
      }
    } while (removedAny);
  }

  function isPasswordHelpAnnouncement(
    topicContent: HTMLElement,
    strings: Readonly<Record<string, string>>,
  ) {
    const text = topicContent.textContent.replaceAll(/\s+/g, "").toLowerCase();
    const rawCannotLoginText = Reflect.get(strings, "cannotLogin");
    const cannotLoginText =
      typeof rawCannotLoginText === "string"
        ? rawCannotLoginText.replaceAll(/\s+/g, "").toLowerCase()
        : "";
    const anchors = [...topicContent.querySelectorAll<HTMLAnchorElement>("a[href]")];
    const hasRecoveryLink = anchors.some((anchor) => {
      const href = (anchor.getAttribute("href") ?? "").toLowerCase();
      return href.includes("forget.php") || href.includes("forget_en.php");
    });
    if (hasRecoveryLink) {
      return true;
    }
    const mentionsCannotLogin =
      (cannotLoginText !== "" && text.includes(cannotLoginText)) ||
      text.includes("\u7121\u6CD5\u767B\u5165") ||
      text.includes("\u65E0\u6CD5\u767B\u5165") ||
      text.includes("cannotlogin") ||
      text.includes("cantlogin") ||
      text.includes("can'tlogin".replaceAll("'", ""));
    const mentionsPassword =
      text.includes("\u5BC6\u78BC") || text.includes("\u5BC6\u7801") || text.includes("password");
    const mentionsRecovery =
      text.includes("\u5FD8\u8A18") ||
      text.includes("\u91CD\u8A2D") ||
      text.includes("\u91CD\u7F6E") ||
      text.includes("\u555F\u7528") ||
      text.includes("\u542F\u7528") ||
      text.includes("reset") ||
      text.includes("forgot") ||
      text.includes("forget") ||
      text.includes("activation") ||
      text.includes("first-time");
    return mentionsPassword && (mentionsCannotLogin || mentionsRecovery);
  }

  function tokenizeAnnouncementHeader(topicContent: HTMLElement, date: string): boolean {
    const topicText = topicContent.textContent;
    const leadingTitleMatch = topicText.match(
      /^\s*\u3010([^\u3011]+)\u3011(?=\s|$|[.\uFF0E:\uFF1A])/u,
    );
    if (!leadingTitleMatch) {
      return false;
    }
    const label = leadingTitleMatch[1].trim();
    if (label === "") {
      return false;
    }
    const walker = topicContent.ownerDocument.createTreeWalker(topicContent, NodeFilter.SHOW_TEXT);
    let textNode = walker.nextNode();
    while (textNode) {
      const text = textNode.textContent ?? "";
      const match = text.match(/^(\s*)\u3010([^\u3011]+)\u3011([\s.\uFF0E:\uFF1A]*)/u);
      if (match) {
        const topicDocument = topicContent.ownerDocument;
        const header = topicDocument.createElement("span");
        header.className = "ccxp-lite-announcement-topic-header";
        header.textContent = `${date} ${label}`;
        textNode.textContent = `${match[1]}${text.slice(match[0].length)}`;
        const insertionTarget = findAnnouncementHeaderInsertionTarget(topicContent, textNode);
        if (insertionTarget) {
          const insertionAnchor = insertionTarget as ChildNode & {
            before: (...nodes: readonly Node[]) => void;
          };
          insertionAnchor.before(header);
          if (textNode.textContent.trim() !== "") {
            insertionAnchor.before(topicDocument.createTextNode(" "));
          }
        } else {
          topicContent.prepend(header);
          if (textNode.textContent.trim() !== "") {
            topicContent.insertBefore(topicDocument.createTextNode(" "), header.nextSibling);
          }
        }
        return true;
      }
      if (text.trim() !== "") {
        return false;
      }
      textNode = walker.nextNode();
    }
    return false;
  }

  function findAnnouncementHeaderInsertionTarget(
    topicContent: HTMLElement,
    textNode: Node,
  ): Node | undefined {
    let currentNode: Node = textNode;
    while (currentNode.parentNode && currentNode.parentNode !== topicContent) {
      currentNode = currentNode.parentNode;
    }
    return currentNode.parentNode === topicContent ? currentNode : undefined;
  }

  function findUtilityLinksTable(targetDocument: Document): HTMLTableElement | undefined {
    const anchor = targetDocument.querySelector(
      "a[href*='ccc.site.nthu.edu.tw'], a[href*='aisccc.site.nthu.edu.tw'], a[href*='nthu-en.site.nthu.edu.tw']",
    );
    return anchor?.closest<HTMLTableElement>("table") ?? undefined;
  }

  function findServiceLink(targetDocument: Document): HTMLElement | undefined {
    const anchor = targetDocument.querySelector<HTMLAnchorElement>(
      "a[href*='inquire_cpr.html'], a[href*='inquire_cpr_en.html']",
    );
    return anchor?.closest<HTMLElement>("div") ?? anchor ?? undefined;
  }

  function findCannotLoginLink(targetDocument: Document, utilityLinksTable: Element | undefined) {
    const isCannotLoginAnchor = (anchor: HTMLAnchorElement | undefined) => {
      if (!anchor) {
        return false;
      }
      const href = (anchor.getAttribute("href") ?? "").toLowerCase();
      if (href.includes("forget.php") || href.includes("forget_en.php")) {
        return true;
      }
      return isCannotLoginLabel(anchor.textContent);
    };
    if (!utilityLinksTable) {
      const fallbackAnchor = targetDocument.querySelector<HTMLAnchorElement>(
        "a[href*='forget.php'], a[href*='forget_en.php']",
      );
      return fallbackAnchor && isCannotLoginAnchor(fallbackAnchor) ? fallbackAnchor : undefined;
    }
    const anchors = [...utilityLinksTable.querySelectorAll<HTMLAnchorElement>("a[href]")];
    const fromUtility = anchors.find((anchor) => isCannotLoginAnchor(anchor));
    if (fromUtility) {
      return fromUtility;
    }
    const fallbackAnchor = targetDocument.querySelector<HTMLAnchorElement>(
      "a[href*='forget.php'], a[href*='forget_en.php']",
    );
    return fallbackAnchor && isCannotLoginAnchor(fallbackAnchor) ? fallbackAnchor : undefined;
  }

  function isCannotLoginLabel(label: string | undefined) {
    const normalized = (label ?? "").replaceAll(/\s+/g, "").toLowerCase();
    return (
      normalized.includes("\u7121\u6CD5\u767B\u5165") ||
      normalized.includes("\u65E0\u6CD5\u767B\u5165") ||
      normalized.includes("cannotlogin") ||
      normalized.includes("can'tlogin") ||
      normalized.includes("cantlogin")
    );
  }

  function buildServicePhoneLink(
    targetDocument: Document,
    serviceLinkNode: Element | undefined,
    strings: Readonly<Record<string, string>> = getLocalizedStrings("zh"),
  ) {
    if (!serviceLinkNode) {
      return undefined;
    }
    const sourceAnchor = serviceLinkNode.matches("a[href]")
      ? (serviceLinkNode as HTMLAnchorElement)
      : serviceLinkNode.querySelector<HTMLAnchorElement>("a[href]");
    const sourceLabel = normalizeSupportLabel(sourceAnchor?.textContent);
    return buildLandingSupportLink(
      targetDocument,
      sourceAnchor ?? undefined,
      sourceLabel === "" ? strings.servicePhone : sourceLabel,
    );
  }

  function buildCannotLoginLink(
    targetDocument: Document,
    sourceAnchor: HTMLAnchorElement | undefined,
    strings: Readonly<Record<string, string>> = getLocalizedStrings("zh"),
  ) {
    if (!sourceAnchor) {
      return undefined;
    }
    const sourceLabel = normalizeSupportLabel(sourceAnchor.textContent);
    let labelText = strings.cannotLogin;
    if (!isCannotLoginLabel(sourceLabel) && sourceLabel !== "") {
      labelText = sourceLabel;
    }
    return buildLandingSupportLink(targetDocument, sourceAnchor, labelText);
  }

  function buildLoginHelperLink(
    targetDocument: Document,
    sourceAnchor: HTMLAnchorElement | undefined,
    strings: Readonly<Record<string, string>> = getLocalizedStrings("zh"),
  ) {
    if (!sourceAnchor) {
      return undefined;
    }
    const anchor = targetDocument.createElement("a");
    anchor.className = "ccxp-lite-login-helper-link";
    anchor.href = sourceAnchor.href;
    anchor.target = sourceAnchor.target === "" ? "_blank" : sourceAnchor.target;
    anchor.rel = "noopener noreferrer";
    copyLegacyAnchorHandlers(sourceAnchor, anchor);
    const label = targetDocument.createElement("span");
    label.textContent = `${strings.loginRecoveryHelp}?`;
    anchor.append(label);
    anchor.append(createLandingExternalLinkIcon(targetDocument));
    return anchor;
  }

  function normalizeSupportLabel(label: string | undefined) {
    return (label ?? "")
      .replaceAll(/[<>\uFF1C\uFF1E]+/g, " ")
      .replaceAll(/\s+/g, " ")
      .trim();
  }

  function buildLandingSupportLink(
    targetDocument: Document,
    sourceAnchor: HTMLAnchorElement | undefined,
    labelText: string,
    variant: "primary" | "secondary" = "secondary",
  ) {
    if (!sourceAnchor) {
      return undefined;
    }
    const anchor = targetDocument.createElement("a");
    anchor.className =
      "ccxp-lite-landing-service-link ccxp-lite-action-control " +
      `ccxp-lite-action-control-${variant} ccxp-lite-landing-service-link-${variant}`;
    anchor.href = sourceAnchor.href;
    anchor.target = sourceAnchor.target === "" ? "_blank" : sourceAnchor.target;
    anchor.rel = "noopener noreferrer";
    copyLegacyAnchorHandlers(sourceAnchor, anchor);
    const label = targetDocument.createElement("span");
    label.textContent = labelText;
    anchor.append(label);
    anchor.append(createLandingExternalLinkIcon(targetDocument));
    return anchor;
  }

  function buildSupportLinks(
    targetDocument: Document,
    serviceLinkNode: Element | undefined,
    cannotLoginAnchor: HTMLAnchorElement | undefined,
    strings: Readonly<Record<string, string>> = getLocalizedStrings("zh"),
  ) {
    const servicePhoneLink = buildServicePhoneLink(targetDocument, serviceLinkNode, strings);
    const cannotLoginLink = buildCannotLoginLink(targetDocument, cannotLoginAnchor, strings);
    if (!servicePhoneLink && !cannotLoginLink) {
      return undefined;
    }
    if (servicePhoneLink) {
      servicePhoneLink.classList.remove("ccxp-lite-landing-service-link-secondary");
      servicePhoneLink.classList.add("ccxp-lite-landing-service-link-secondary");
    }
    if (cannotLoginLink) {
      cannotLoginLink.classList.remove("ccxp-lite-landing-service-link-secondary");
      cannotLoginLink.classList.add("ccxp-lite-landing-service-link-primary");
    }
    const wrap = targetDocument.createElement("div");
    wrap.className = "ccxp-lite-landing-support-links";
    if (cannotLoginLink) {
      wrap.append(cannotLoginLink);
    }
    if (servicePhoneLink) {
      wrap.append(servicePhoneLink);
    }
    return wrap;
  }

  function collapseLegacyServiceRow(serviceLinkNode: Element | undefined) {
    if (!serviceLinkNode) {
      return;
    }
    const sourceAnchor = serviceLinkNode.matches("a[href]")
      ? serviceLinkNode
      : serviceLinkNode.querySelector(
          "a[href*='inquire_cpr.html'], a[href*='inquire_cpr_en.html'], a[href]",
        );
    if (!sourceAnchor) {
      return;
    }
    const sourceRow = sourceAnchor.closest("tr");
    if (!sourceRow) {
      removeNode(sourceAnchor.closest("div") ?? sourceAnchor);
      return;
    }
    const previousRow = sourceRow.previousElementSibling;
    const nextRow = sourceRow.nextElementSibling;
    removeNode(sourceRow);
    if (isLikelySpacerRow(previousRow ?? undefined)) {
      removeNode(previousRow ?? undefined);
    }
    if (isLikelySpacerRow(nextRow ?? undefined)) {
      removeNode(nextRow ?? undefined);
    }
  }

  function collapseLegacyCannotLoginLink(cannotLoginAnchor: Element | undefined) {
    if (!cannotLoginAnchor) {
      return;
    }
    const sourceAnchor = cannotLoginAnchor.matches("a[href]")
      ? cannotLoginAnchor
      : cannotLoginAnchor.closest("a[href]");
    if (!sourceAnchor) {
      return;
    }
    removeAdjacentLegacyBreak(sourceAnchor, "previous");
    removeAdjacentLegacyBreak(sourceAnchor, "next");
    removeNode(sourceAnchor);
  }

  function removeAdjacentLegacyBreak(node: Node, direction: "previous" | "next") {
    const sibling = direction === "previous" ? node.previousSibling : node.nextSibling;
    if (!sibling) {
      return;
    }
    if (sibling.nodeType === Node.TEXT_NODE) {
      const normalizedText = (sibling.textContent ?? "").replaceAll("\u00A0", " ").trim();
      if (normalizedText === "") {
        removeNode(sibling);
      }
      return;
    }
    if (sibling.nodeType === Node.ELEMENT_NODE && (sibling as Element).tagName === "BR") {
      removeNode(sibling);
    }
  }

  function buildHeaderUtilityLinks(
    targetDocument: Document,
    utilityLinksTable: Element | undefined,
    excludedAnchor: HTMLAnchorElement | undefined,
    serviceLinkNode: Element | undefined,
    strings: Readonly<Record<string, string>> = getLocalizedStrings("zh"),
  ) {
    const excludedHref = excludedAnchor ? (excludedAnchor.getAttribute("href") ?? "") : "";
    const anchors = utilityLinksTable
      ? [...utilityLinksTable.querySelectorAll<HTMLAnchorElement>("a[href]")]
          .filter((anchor) => anchor !== excludedAnchor)
          .filter((anchor) => {
            const href = anchor.getAttribute("href") ?? "";
            return (
              href !== "" &&
              href !== excludedHref &&
              !href.toLowerCase().includes("inquire_cpr.html")
            );
          })
          .filter((anchor) => anchor.textContent.trim() !== "")
      : [];
    const serviceAnchorSource =
      serviceLinkNode && serviceLinkNode.matches("a[href]")
        ? (serviceLinkNode as HTMLAnchorElement)
        : serviceLinkNode?.querySelector<HTMLAnchorElement>("a[href]");
    if (
      serviceAnchorSource &&
      anchors.every((anchor) => anchor.href !== serviceAnchorSource.href)
    ) {
      anchors.push(serviceAnchorSource);
    }
    if (anchors.length === 0) {
      return undefined;
    }
    const nav = targetDocument.createElement("nav");
    nav.className = "ccxp-lite-landing-utility";
    nav.setAttribute("aria-label", strings.externalLinksLabel);
    for (const [_, sourceAnchor] of anchors.entries()) {
      const anchor = targetDocument.createElement("a");
      anchor.href = sourceAnchor.href;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.className = "ccxp-lite-landing-utility-link";
      copyLegacyAnchorHandlers(sourceAnchor, anchor);
      anchor.textContent = normalizeSupportLabel(sourceAnchor.textContent);
      anchor.append(createLandingExternalLinkIcon(targetDocument));
      nav.append(anchor);
    }
    return nav;
  }

  function copyLegacyAnchorHandlers(
    sourceAnchor: HTMLAnchorElement | undefined,
    targetAnchor: HTMLAnchorElement | undefined,
  ) {
    if (!sourceAnchor || !targetAnchor) {
      return;
    }
    for (const name of [
      "onclick",
      "onmousedown",
      "onmouseup",
      "onmouseover",
      "onmouseout",
      "onmouseenter",
      "onmouseleave",
      "onkeydown",
      "onkeyup",
    ]) {
      const value = sourceAnchor.getAttribute(name);
      if (value !== null && value !== "") {
        targetAnchor.setAttribute(name, value);
      }
    }
  }

  function createLandingExternalLinkIcon(targetDocument: Document) {
    const icon = targetDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("class", "ccxp-lite-landing-link-icon");
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

  function createAnnouncementMegaphoneIcon(targetDocument: Document) {
    const icon = targetDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("class", "ccxp-lite-announcement-title-icon");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "2");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    icon.setAttribute("aria-hidden", "true");
    for (const pathData of [
      "M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z",
      "M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14",
      "M8 6v8",
    ]) {
      const path = targetDocument.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathData);
      icon.append(path);
    }
    return icon;
  }

  function collapseLegacyUtilityRow(utilityLinksTable: Element | undefined) {
    if (!utilityLinksTable) {
      return;
    }
    const sourceCell = utilityLinksTable.closest("td");
    if (!sourceCell) {
      return;
    }
    const sourceRow = sourceCell.closest("tr");
    if (!sourceRow) {
      return;
    }
    removeNode(sourceCell);
    const rowCells = [...sourceRow.children].filter(
      (node): node is HTMLTableCellElement => node instanceof HTMLTableCellElement,
    );
    for (const cell of rowCells) {
      if (isLegacySpacerCell(cell)) {
        removeNode(cell);
      }
    }
    const remainingCells = [...sourceRow.children].filter(
      (node): node is HTMLTableCellElement => node instanceof HTMLTableCellElement,
    );
    if (remainingCells.length === 1) {
      remainingCells[0].setAttribute("width", "100%");
      remainingCells[0].style.width = "100%";
    }
  }

  function isLikelySpacerRow(row: Element | undefined) {
    if (!row || row.tagName !== "TR") {
      return false;
    }
    const cells = [...row.children].filter(
      (node): node is HTMLTableCellElement => node instanceof HTMLTableCellElement,
    );
    if (cells.length === 0) {
      return false;
    }
    const hasInteractiveContent = cells.some(
      (cell) => cell.querySelector("a, button, input, select, textarea, table, iframe") !== null,
    );
    if (hasInteractiveContent) {
      return false;
    }
    const text = cells
      .map((cell) => cell.textContent.replaceAll("\u00A0", " "))
      .join(" ")
      .replaceAll(/\s+/g, " ")
      .trim();
    if (text !== "") {
      return false;
    }
    const rowHeight = (row.getAttribute("height") ?? "").trim();
    const cellHasHeight = cells.some((cell) => (cell.getAttribute("height") ?? "").trim() !== "");
    return rowHeight !== "" || cellHasHeight;
  }

  function isLegacySpacerCell(cell: HTMLTableCellElement | undefined) {
    if (!cell) {
      return false;
    }
    const widthText = (cell.getAttribute("width") ?? "").trim().toLowerCase();
    const normalizedText = cell.textContent.replaceAll("\u00A0", " ").trim();
    if ((widthText === "3%" || widthText === "3") && normalizedText === "") {
      return true;
    }
    return (
      normalizedText === "" && cell.querySelector("table, iframe, form, input, button, a") === null
    );
  }

  function collapseLegacyThreeColumnRows(rootNode: ParentNode | undefined) {
    if (!rootNode) {
      return;
    }
    const rows = [...rootNode.querySelectorAll<HTMLTableRowElement>("tr")];
    for (const row of rows) {
      if (shouldSkipLegacyRowCollapse(row)) {
        continue;
      }
      const cells = [...row.children].filter(
        (node): node is HTMLTableCellElement => node instanceof HTMLTableCellElement,
      );
      if (cells.length < 2) {
        continue;
      }
      const leftCell = cells.find((cell) => isLegacyWideLeftCell(cell));
      const rightCell = cells.find((cell) => isLegacyRightPanelCell(cell));
      if (!leftCell || !rightCell) {
        continue;
      }
      if (!isLikelyEmptyCell(leftCell)) {
        continue;
      }
      const spacerCell = cells.find(
        (cell) =>
          isLegacySpacerCell(cell) ||
          normalizeLegacyWidth(cell.getAttribute("width") ?? cell.style.width) === "3%",
      );
      removeNode(leftCell);
      removeNode(spacerCell ?? undefined);
      rightCell.removeAttribute("width");
      rightCell.style.width = "100%";
      rightCell.style.minWidth = "0";
      rightCell.colSpan = Math.max(1, rightCell.colSpan);
      for (const cell of [...row.children].filter(
        (node): node is HTMLTableCellElement => node instanceof HTMLTableCellElement,
      )) {
        if (cell !== rightCell) {
          cell.removeAttribute("width");
        }
      }
    }
  }

  function isLegacyWideLeftCell(cell: HTMLTableCellElement | undefined) {
    if (!cell) {
      return false;
    }
    const widthText = normalizeLegacyWidth(cell.getAttribute("width") ?? cell.style.width);
    const styleText = (cell.getAttribute("style") ?? "").toLowerCase();
    return widthText === "60%" && styleText.includes("min-width") && styleText.includes("30em");
  }

  function isLegacyRightPanelCell(cell: HTMLTableCellElement | undefined) {
    if (!cell) {
      return false;
    }
    const widthText = normalizeLegacyWidth(cell.getAttribute("width") ?? cell.style.width);
    return widthText === "35%";
  }

  function isLikelyEmptyCell(cell: HTMLTableCellElement | undefined) {
    if (!cell) {
      return false;
    }
    const normalizedText = cell.textContent
      .replaceAll("\u00A0", " ")
      .replaceAll(/\s+/g, " ")
      .trim();
    if (normalizedText !== "") {
      return false;
    }
    return (
      cell.querySelector(
        "img, iframe, form, input, button, select, textarea, a, object, embed, video, audio, table, div, span, ul, ol, p",
      ) === null
    );
  }

  function shouldSkipLegacyRowCollapse(row: HTMLTableRowElement | undefined) {
    if (!row) {
      return true;
    }
    const table = row.closest("table");
    if (!table) {
      return false;
    }
    if (table.classList.contains("ccxp-lite-announcement-table")) {
      return true;
    }
    if (table.querySelector(".board_item, .board_subject, .board_0, .board_1")) {
      return true;
    }
    return false;
  }

  function normalizeLegacyWidth(rawValue: string | undefined) {
    return (rawValue ?? "").replaceAll(/\s+/g, "").toLowerCase();
  }
  namespace.loginSupport = {
    findLoginSourceCell,
    findAnnouncementTable,
    findUtilityLinksTable,
    findCannotLoginLink,
    findServiceLink,
    buildHeaderUtilityLinks,
    buildSupportLinks,
    buildLoginHelperLink,
    collapseLegacyServiceRow,
    collapseLegacyCannotLoginLink,
    collapseLegacyUtilityRow,
    collapseLegacyThreeColumnRows,
    findCalendarTable,
    prepareAnnouncementTable,
  };
})(globalThis);
