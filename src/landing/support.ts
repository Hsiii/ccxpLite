(function registerCcxpLiteLandingSupport(globalScope: typeof globalThis) {
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
      return dateRows.length >= 3;
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
      return;
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
      entries.push({
        date: rawDate,
        topicContent,
      });
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
    titleCell.textContent =
      titleText === "" ? strings.sidebarCategoryAnnouncementsAndVoting : titleText;
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
      const body = table.ownerDocument.createElement("div");
      body.className = "ccxp-lite-announcement-topic";
      while (entry.topicContent.firstChild) {
        body.append(entry.topicContent.firstChild);
      }
      const date = table.ownerDocument.createElement("div");
      date.className = "ccxp-lite-announcement-date";
      date.textContent = entry.date;
      entryRow.append(body);
      entryRow.append(date);
      item.append(entryRow);
      list.append(item);
    }
    contentCell.append(list);
    contentRow.append(contentCell);
    tbody.append(titleRow);
    tbody.append(contentRow);
    const announcementTable = table;
    announcementTable.dataset.ccxpLiteAnnouncementPrepared = "true";
  }

  function findUtilityLinksTable(targetDocument: Document): HTMLTableElement | undefined {
    const anchor = targetDocument.querySelector(
      "a[href*='ccc.site.nthu.edu.tw'], a[href*='aisccc.site.nthu.edu.tw'], a[href*='nthu-en.site.nthu.edu.tw']",
    );
    return anchor?.closest<HTMLTableElement>("table") ?? undefined;
  }

  function findServiceLink(targetDocument: Document): HTMLElement | undefined {
    const anchor = targetDocument.querySelector<HTMLAnchorElement>("a[href*='inquire_cpr.html']");
    return anchor?.closest<HTMLElement>("div") ?? anchor ?? undefined;
  }

  function findCannotLoginLink(targetDocument: Document, utilityLinksTable: Element | undefined) {
    const isCannotLoginAnchor = (anchor: HTMLAnchorElement | undefined) => {
      if (!anchor) {
        return false;
      }
      const href = (anchor.getAttribute("href") ?? "").toLowerCase();
      if (href.includes("inquire_cpr.html") || href.includes("forget.php")) {
        return true;
      }
      return isCannotLoginLabel(anchor.textContent);
    };
    if (!utilityLinksTable) {
      const fallbackAnchor = targetDocument.querySelector<HTMLAnchorElement>(
        "a[href*='forget.php'], a[href*='inquire_cpr.html']",
      );
      return fallbackAnchor && isCannotLoginAnchor(fallbackAnchor) ? fallbackAnchor : undefined;
    }
    const anchors = [...utilityLinksTable.querySelectorAll<HTMLAnchorElement>("a[href]")];
    const fromUtility = anchors.find((anchor) => isCannotLoginAnchor(anchor));
    if (fromUtility) {
      return fromUtility;
    }
    const fallbackAnchor = targetDocument.querySelector<HTMLAnchorElement>(
      "a[href*='forget.php'], a[href*='inquire_cpr.html']",
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
    return buildLandingSupportLink(targetDocument, sourceAnchor ?? undefined, strings.servicePhone);
  }

  function buildCannotLoginLink(
    targetDocument: Document,
    sourceAnchor: HTMLAnchorElement | undefined,
    strings: Readonly<Record<string, string>> = getLocalizedStrings("zh"),
  ) {
    if (!sourceAnchor) {
      return undefined;
    }
    const sourceLabel = sourceAnchor.textContent.trim();
    let labelText = strings.cannotLogin;
    if (!isCannotLoginLabel(sourceLabel) && sourceLabel !== "") {
      labelText = sourceLabel;
    }
    return buildLandingSupportLink(targetDocument, sourceAnchor, labelText);
  }

  function buildLandingSupportLink(
    targetDocument: Document,
    sourceAnchor: HTMLAnchorElement | undefined,
    labelText: string,
  ) {
    if (!sourceAnchor) {
      return undefined;
    }
    const anchor = targetDocument.createElement("a");
    anchor.className = "ccxp-lite-landing-service-link";
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

  function buildLandingSupportLinks(
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
    const wrap = targetDocument.createElement("div");
    wrap.className = "ccxp-lite-landing-support-links";
    if (servicePhoneLink) {
      wrap.append(servicePhoneLink);
    }
    if (cannotLoginLink) {
      wrap.append(cannotLoginLink);
    }
    return wrap;
  }

  function collapseLegacyServiceRow(serviceLinkNode: Element | undefined) {
    if (!serviceLinkNode) {
      return;
    }
    const sourceAnchor = serviceLinkNode.matches("a[href]")
      ? serviceLinkNode
      : serviceLinkNode.querySelector("a[href*='inquire_cpr.html'], a[href]");
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
    strings: Readonly<Record<string, string>> = getLocalizedStrings("zh"),
  ) {
    if (!utilityLinksTable) {
      return undefined;
    }
    const excludedHref = excludedAnchor ? (excludedAnchor.getAttribute("href") ?? "") : "";
    const anchors = [...utilityLinksTable.querySelectorAll<HTMLAnchorElement>("a[href]")]
      .filter((anchor) => anchor !== excludedAnchor)
      .filter((anchor) => {
        const href = anchor.getAttribute("href") ?? "";
        return (
          href !== "" && href !== excludedHref && !href.toLowerCase().includes("inquire_cpr.html")
        );
      })
      .filter((anchor) => anchor.textContent.trim() !== "")
      .slice(0, 3);
    if (anchors.length === 0) {
      return undefined;
    }
    const nav = targetDocument.createElement("nav");
    nav.className = "ccxp-lite-landing-utility";
    nav.setAttribute("aria-label", strings.externalLinksLabel);
    for (const [index, sourceAnchor] of anchors.entries()) {
      const anchor = targetDocument.createElement("a");
      anchor.href = sourceAnchor.href;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.className = "ccxp-lite-landing-utility-link";
      copyLegacyAnchorHandlers(sourceAnchor, anchor);
      anchor.textContent = sourceAnchor.textContent.trim();
      anchor.append(createLandingExternalLinkIcon(targetDocument));
      nav.append(anchor);
      if (index < anchors.length - 1) {
        const separator = targetDocument.createElement("span");
        separator.className = "ccxp-lite-landing-utility-separator";
        separator.textContent = "|";
        nav.append(separator);
      }
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
  namespace.landingSupport = {
    findLoginSourceCell,
    findAnnouncementTable,
    findUtilityLinksTable,
    findCannotLoginLink,
    findServiceLink,
    buildHeaderUtilityLinks,
    buildLandingSupportLinks,
    collapseLegacyServiceRow,
    collapseLegacyCannotLoginLink,
    collapseLegacyUtilityRow,
    collapseLegacyThreeColumnRows,
    findCalendarTable,
    prepareAnnouncementTable,
  };
})(globalThis);
