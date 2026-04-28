(function registerCcxpLiteLandingSupport(globalScope: Window & typeof globalThis) {
  const namespace = (globalScope.CCXP_LITE ||= {}) as CcxpLiteNamespace;
  const { shared } = namespace;
  const { getLocalizedStrings, removeNode, cleanLegacyAttributes } = shared || {};

  function findLoginSourceCell(targetDocument: Document, loginForm: Element | null) {
    if (loginForm) {
      return loginForm.closest("td, table, section, article") || loginForm;
    }

    return Array.from(
      targetDocument.querySelectorAll<HTMLElement>("td, table, div, section, article"),
    ).find((cell) => cell.querySelector("form"));
  }

  function findCalendarTable(targetNode: ParentNode) {
    const calendarFrame = targetNode.querySelector("iframe[src*='calendar/cal.php']");
    if (!calendarFrame) {
      return null;
    }

    return Array.from(targetNode.querySelectorAll<HTMLTableElement>("table")).find(
      (table) =>
        table.contains(calendarFrame) &&
        ["月曆", "Calendar"].some((text) => table.textContent.includes(text)),
    );
  }

  function findAnnouncementTable(targetDocument: Document) {
    const rightPanel = Array.from(targetDocument.querySelectorAll<HTMLTableCellElement>("td")).find(
      (cell) => {
        const widthText = normalizeLegacyWidth(cell.getAttribute("width") || cell.style.width);
        if (widthText !== "35%" && widthText !== "35") {
          return false;
        }

        return Boolean(cell.querySelector(".board_item, .board_subject"));
      },
    );

    const panelTables = rightPanel
      ? Array.from(rightPanel.querySelectorAll<HTMLTableElement>("table"))
      : [];
    const fallbackTables = Array.from(targetDocument.querySelectorAll<HTMLTableElement>("table"));

    const isAnnouncementTable = (table: HTMLTableElement) => {
      const rows = Array.from(table.rows || []);
      if (rows.length === 0) {
        return false;
      }

      const headingCell = rows
        .flatMap((row) => Array.from(row.cells || []))
        .find((cell) => cell.classList.contains("board_item"));

      const headingText = normalizeAnnouncementHeading(headingCell && headingCell.textContent);
      const hasNoticeHeading =
        headingText.includes("系統公告") || headingText.includes("system notice");

      if (!hasNoticeHeading) {
        return false;
      }

      const boardHeaderRow = rows.find((row) => {
        const cells = Array.from(row.cells || []);
        return cells.filter((cell) => cell.classList.contains("board_subject")).length >= 2;
      });

      if (!boardHeaderRow) {
        return false;
      }

      const dateRows = rows.filter((row) => {
        const cells = Array.from(row.cells || []);
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

        const rawDate = (firstCell.textContent || "").replace(/\s+/g, "").trim();
        if (!/^\d{4}\/\d{2}\/\d{2}$/.test(rawDate)) {
          return false;
        }

        const topicText = (secondCell.textContent || "").replace(/\s+/g, " ").trim();
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

    return fallbackTables.find((table) => isAnnouncementTable(table)) || null;
  }

  function normalizeAnnouncementHeading(rawText) {
    return (rawText || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function prepareAnnouncementTable(
    table: HTMLTableElement | null,
    strings = getLocalizedStrings("zh"),
  ) {
    if (!table || table.dataset.ccxpLiteAnnouncementPrepared === "true") {
      return;
    }

    table.classList.add("ccxp-lite-announcement-table");

    const rows = Array.from(table.rows || []);
    rows.forEach((row) => {
      const cells = Array.from(row.cells || []);
      if (cells.length === 0) {
        return;
      }

      const hasOnlyDecorativeCells = cells.every((cell) => {
        const hasBgColor = (cell.getAttribute("bgcolor") || "").trim().length > 0;
        const text = (cell.textContent || "").replace(/\s+/g, "").trim();
        return hasBgColor && text.length === 0;
      });

      const hasOnlyEmptySpacerCells = cells.every((cell) => {
        const text = (cell.textContent || "").replace(/\s+/g, "").trim();
        if (text.length > 0) {
          return false;
        }

        return !cell.querySelector("img, iframe, table, form, input, button, a, ul, ol, p");
      });

      const hasLegacySpacerHeight =
        (row.getAttribute("height") || "").trim().length > 0 ||
        cells.some((cell) => (cell.getAttribute("height") || "").trim().length > 0);

      if (hasOnlyDecorativeCells) {
        removeNode(row);
        return;
      }

      if (hasOnlyEmptySpacerCells && hasLegacySpacerHeight) {
        removeNode(row);
      }
    });

    const headerCell = rows
      .flatMap((row) => Array.from(row.cells || []))
      .find((cell) => cell.classList.contains("board_item"));
    const titleText = (headerCell ? headerCell.textContent : "").replace(/\s+/g, " ").trim();

    const headerRow = rows.find((row) => {
      const cells = Array.from(row.cells || []);
      return cells.filter((cell) => cell.classList.contains("board_subject")).length >= 2;
    });
    if (headerRow) {
      removeNode(headerRow);
    }

    const entries: Array<{ date: string; topicContent: HTMLElement }> = [];
    rows.forEach((row) => {
      const cells = Array.from(row.cells || []);
      if (cells.length < 2) {
        return;
      }

      const rawDate = (cells[0].textContent || "").replace(/\s+/g, "").trim();
      if (!/^\d{4}\/\d{2}\/\d{2}$/.test(rawDate)) {
        return;
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
    });

    const tbody = table.tBodies[0] || table.appendChild(table.ownerDocument.createElement("tbody"));
    tbody.replaceChildren();

    const titleRow = table.ownerDocument.createElement("tr");
    titleRow.className = "ccxp-lite-announcement-title-row";
    const titleCell = table.ownerDocument.createElement("td");
    titleCell.className = "ccxp-lite-announcement-title";
    titleCell.textContent = titleText || strings.sidebarCategoryAnnouncementsAndVoting;
    titleRow.appendChild(titleCell);

    const contentRow = table.ownerDocument.createElement("tr");
    contentRow.className = "ccxp-lite-announcement-scroll-row";
    const contentCell = table.ownerDocument.createElement("td");
    contentCell.className = "ccxp-lite-announcement-content-cell";

    const list = table.ownerDocument.createElement("div");
    list.className = "ccxp-lite-announcement-list";

    entries.forEach((entry) => {
      const item = table.ownerDocument.createElement("article");
      item.className = "ccxp-lite-announcement-row";

      const entryRow = table.ownerDocument.createElement("div");
      entryRow.className = "ccxp-lite-announcement-entry";

      const body = table.ownerDocument.createElement("div");
      body.className = "ccxp-lite-announcement-topic";
      while (entry.topicContent.firstChild) {
        body.appendChild(entry.topicContent.firstChild);
      }

      const date = table.ownerDocument.createElement("div");
      date.className = "ccxp-lite-announcement-date";
      date.textContent = entry.date;

      entryRow.appendChild(body);
      entryRow.appendChild(date);
      item.appendChild(entryRow);
      list.appendChild(item);
    });

    contentCell.appendChild(list);
    contentRow.appendChild(contentCell);
    tbody.appendChild(titleRow);
    tbody.appendChild(contentRow);

    table.dataset.ccxpLiteAnnouncementPrepared = "true";
  }

  function findUtilityLinksTable(targetDocument: Document) {
    const anchor = targetDocument.querySelector(
      "a[href*='ccc.site.nthu.edu.tw'], a[href*='aisccc.site.nthu.edu.tw'], a[href*='nthu-en.site.nthu.edu.tw']",
    );
    return anchor ? anchor.closest("table") : null;
  }

  function findServiceLink(targetDocument: Document) {
    const anchor = targetDocument.querySelector("a[href*='inquire_cpr.html']");
    return anchor ? anchor.closest("div") || anchor : null;
  }

  function findCannotLoginLink(targetDocument: Document, utilityLinksTable: Element | null) {
    const isCannotLoginAnchor = (anchor: HTMLAnchorElement | null) => {
      if (!anchor) {
        return false;
      }

      const href = (anchor.getAttribute("href") || "").toLowerCase();
      if (href.includes("inquire_cpr.html") || href.includes("forget.php")) {
        return true;
      }

      return isCannotLoginLabel(anchor.textContent);
    };

    if (!utilityLinksTable) {
      const fallbackAnchor = targetDocument.querySelector<HTMLAnchorElement>(
        "a[href*='forget.php'], a[href*='inquire_cpr.html']",
      );
      return fallbackAnchor && isCannotLoginAnchor(fallbackAnchor) ? fallbackAnchor : null;
    }

    const anchors = Array.from(utilityLinksTable.querySelectorAll<HTMLAnchorElement>("a[href]"));
    const fromUtility = anchors.find((anchor) => isCannotLoginAnchor(anchor));
    if (fromUtility) {
      return fromUtility;
    }

    const fallbackAnchor = targetDocument.querySelector<HTMLAnchorElement>(
      "a[href*='forget.php'], a[href*='inquire_cpr.html']",
    );
    return fallbackAnchor && isCannotLoginAnchor(fallbackAnchor) ? fallbackAnchor : null;
  }

  function isCannotLoginLabel(label) {
    const normalized = (label || "").replace(/\s+/g, "").toLowerCase();

    return (
      normalized.includes("無法登入") ||
      normalized.includes("无法登入") ||
      normalized.includes("cannotlogin") ||
      normalized.includes("can'tlogin") ||
      normalized.includes("cantlogin")
    );
  }

  function buildServicePhoneLink(
    targetDocument: Document,
    serviceLinkNode: Element | null,
    strings = getLocalizedStrings("zh"),
  ) {
    if (!serviceLinkNode) {
      return null;
    }

    const sourceAnchor = serviceLinkNode.matches("a[href]")
      ? (serviceLinkNode as HTMLAnchorElement)
      : serviceLinkNode.querySelector<HTMLAnchorElement>("a[href]");

    return buildLandingSupportLink(targetDocument, sourceAnchor, strings.servicePhone);
  }

  function buildCannotLoginLink(
    targetDocument: Document,
    sourceAnchor: HTMLAnchorElement | null,
    strings = getLocalizedStrings("zh"),
  ) {
    if (!sourceAnchor) {
      return null;
    }

    const sourceLabel = (sourceAnchor.textContent || "").trim();
    const labelText = isCannotLoginLabel(sourceLabel)
      ? strings.cannotLogin
      : sourceLabel || strings.cannotLogin;
    return buildLandingSupportLink(targetDocument, sourceAnchor, labelText);
  }

  function buildLandingSupportLink(
    targetDocument: Document,
    sourceAnchor: HTMLAnchorElement | null,
    labelText: string,
  ) {
    if (!sourceAnchor) {
      return null;
    }

    const anchor = targetDocument.createElement("a");
    anchor.className = "ccxp-lite-landing-service-link";
    anchor.href = sourceAnchor.href;
    anchor.target = sourceAnchor.target || "_blank";
    anchor.rel = "noopener noreferrer";
    copyLegacyAnchorHandlers(sourceAnchor, anchor);

    const label = targetDocument.createElement("span");
    label.textContent = labelText;
    anchor.appendChild(label);
    anchor.appendChild(createLandingExternalLinkIcon(targetDocument));

    return anchor;
  }

  function buildLandingSupportLinks(
    targetDocument: Document,
    serviceLinkNode: Element | null,
    cannotLoginAnchor: HTMLAnchorElement | null,
    strings = getLocalizedStrings("zh"),
  ) {
    const servicePhoneLink = buildServicePhoneLink(targetDocument, serviceLinkNode, strings);
    const cannotLoginLink = buildCannotLoginLink(targetDocument, cannotLoginAnchor, strings);

    if (!servicePhoneLink && !cannotLoginLink) {
      return null;
    }

    const wrap = targetDocument.createElement("div");
    wrap.className = "ccxp-lite-landing-support-links";

    if (servicePhoneLink) {
      wrap.appendChild(servicePhoneLink);
    }

    if (cannotLoginLink) {
      wrap.appendChild(cannotLoginLink);
    }

    return wrap;
  }

  function collapseLegacyServiceRow(serviceLinkNode: Element | null) {
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
      removeNode(sourceAnchor.closest("div") || sourceAnchor);
      return;
    }

    const previousRow = sourceRow.previousElementSibling;
    const nextRow = sourceRow.nextElementSibling;

    removeNode(sourceRow);

    if (isLikelySpacerRow(previousRow)) {
      removeNode(previousRow);
    }

    if (isLikelySpacerRow(nextRow)) {
      removeNode(nextRow);
    }
  }

  function collapseLegacyCannotLoginLink(cannotLoginAnchor: Element | null) {
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
      const normalizedText = (sibling.textContent || "").replace(/\u00a0/g, " ").trim();
      if (normalizedText.length === 0) {
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
    utilityLinksTable: Element | null,
    excludedAnchor: HTMLAnchorElement | null,
    strings = getLocalizedStrings("zh"),
  ) {
    if (!utilityLinksTable) {
      return null;
    }

    const excludedHref = excludedAnchor ? excludedAnchor.getAttribute("href") || "" : "";

    const anchors = Array.from(utilityLinksTable.querySelectorAll<HTMLAnchorElement>("a[href]"))
      .filter((anchor) => anchor !== excludedAnchor)
      .filter((anchor) => {
        const href = anchor.getAttribute("href") || "";
        return href && href !== excludedHref && !href.toLowerCase().includes("inquire_cpr.html");
      })
      .filter((anchor) => anchor.textContent && anchor.textContent.trim().length > 0)
      .slice(0, 3);

    if (anchors.length === 0) {
      return null;
    }

    const nav = targetDocument.createElement("nav");
    nav.className = "ccxp-lite-landing-utility";
    nav.setAttribute("aria-label", strings.externalLinksLabel);

    anchors.forEach((sourceAnchor, index) => {
      const anchor = targetDocument.createElement("a");
      anchor.href = sourceAnchor.href;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.className = "ccxp-lite-landing-utility-link";
      copyLegacyAnchorHandlers(sourceAnchor, anchor);
      anchor.textContent = sourceAnchor.textContent.trim();
      anchor.appendChild(createLandingExternalLinkIcon(targetDocument));
      nav.appendChild(anchor);

      if (index < anchors.length - 1) {
        const separator = targetDocument.createElement("span");
        separator.className = "ccxp-lite-landing-utility-separator";
        separator.textContent = "|";
        nav.appendChild(separator);
      }
    });

    return nav;
  }

  function copyLegacyAnchorHandlers(
    sourceAnchor: HTMLAnchorElement | null,
    targetAnchor: HTMLAnchorElement | null,
  ) {
    if (!sourceAnchor || !targetAnchor) {
      return;
    }

    [
      "onclick",
      "onmousedown",
      "onmouseup",
      "onmouseover",
      "onmouseout",
      "onmouseenter",
      "onmouseleave",
      "onkeydown",
      "onkeyup",
    ].forEach((name) => {
      const value = sourceAnchor.getAttribute(name);
      if (value) {
        targetAnchor.setAttribute(name, value);
      }
    });
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

  function collapseLegacyUtilityRow(utilityLinksTable: Element | null) {
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

    const rowCells = Array.from(sourceRow.children).filter(
      (node): node is HTMLTableCellElement => node instanceof HTMLTableCellElement,
    );
    rowCells.forEach((cell) => {
      if (isLegacySpacerCell(cell)) {
        removeNode(cell);
      }
    });

    const remainingCells = Array.from(sourceRow.children).filter(
      (node): node is HTMLTableCellElement => node instanceof HTMLTableCellElement,
    );
    if (remainingCells.length === 1) {
      remainingCells[0].setAttribute("width", "100%");
      remainingCells[0].style.width = "100%";
    }
  }

  function isLikelySpacerRow(row: Element | null) {
    if (!row || row.tagName !== "TR") {
      return false;
    }

    const cells = Array.from(row.children).filter(
      (node): node is HTMLTableCellElement => node instanceof HTMLTableCellElement,
    );
    if (cells.length === 0) {
      return false;
    }

    const hasInteractiveContent = cells.some((cell) =>
      cell.querySelector("a, button, input, select, textarea, table, iframe"),
    );
    if (hasInteractiveContent) {
      return false;
    }

    const text = cells
      .map((cell) => (cell.textContent || "").replace(/\u00a0/g, " "))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (text.length > 0) {
      return false;
    }

    const rowHeight = (row.getAttribute("height") || "").trim();
    const cellHasHeight = cells.some(
      (cell) => (cell.getAttribute("height") || "").trim().length > 0,
    );

    return rowHeight.length > 0 || cellHasHeight;
  }

  function isLegacySpacerCell(cell: HTMLTableCellElement | null) {
    if (!cell) {
      return false;
    }

    const widthText = (cell.getAttribute("width") || "").trim().toLowerCase();
    const normalizedText = (cell.textContent || "").replace(/\u00a0/g, " ").trim();

    if ((widthText === "3%" || widthText === "3") && normalizedText.length === 0) {
      return true;
    }

    return (
      normalizedText.length === 0 &&
      cell.querySelector("table, iframe, form, input, button, a") === null
    );
  }

  function collapseLegacyThreeColumnRows(rootNode: ParentNode | null) {
    if (!rootNode) {
      return;
    }

    const rows = Array.from(rootNode.querySelectorAll<HTMLTableRowElement>("tr"));

    rows.forEach((row) => {
      if (shouldSkipLegacyRowCollapse(row)) {
        return;
      }

      const cells = Array.from(row.children).filter(
        (node): node is HTMLTableCellElement => node instanceof HTMLTableCellElement,
      );
      if (cells.length < 2) {
        return;
      }

      const leftCell = cells.find((cell) => isLegacyWideLeftCell(cell));
      const rightCell = cells.find((cell) => isLegacyRightPanelCell(cell));

      if (!leftCell || !rightCell) {
        return;
      }

      if (!isLikelyEmptyCell(leftCell)) {
        return;
      }

      const spacerCell = cells.find(
        (cell) =>
          isLegacySpacerCell(cell) ||
          normalizeLegacyWidth(cell.getAttribute("width") || cell.style.width) === "3%",
      );

      removeNode(leftCell);
      removeNode(spacerCell);

      rightCell.removeAttribute("width");
      rightCell.style.width = "100%";
      rightCell.style.minWidth = "0";
      rightCell.colSpan = Math.max(1, rightCell.colSpan || 1);

      Array.from(row.children)
        .filter((node): node is HTMLTableCellElement => node instanceof HTMLTableCellElement)
        .forEach((cell) => {
          if (cell !== rightCell) {
            cell.removeAttribute("width");
          }
        });
    });
  }

  function isLegacyWideLeftCell(cell: HTMLTableCellElement | null) {
    if (!cell) {
      return false;
    }

    const widthText = normalizeLegacyWidth(cell.getAttribute("width") || cell.style.width);
    const styleText = (cell.getAttribute("style") || "").toLowerCase();
    return widthText === "60%" && styleText.includes("min-width") && styleText.includes("30em");
  }

  function isLegacyRightPanelCell(cell: HTMLTableCellElement | null) {
    if (!cell) {
      return false;
    }

    const widthText = normalizeLegacyWidth(cell.getAttribute("width") || cell.style.width);
    return widthText === "35%";
  }

  function isLikelyEmptyCell(cell: HTMLTableCellElement | null) {
    if (!cell) {
      return false;
    }

    const normalizedText = (cell.textContent || "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (normalizedText.length > 0) {
      return false;
    }

    return (
      cell.querySelector(
        "img, iframe, form, input, button, select, textarea, a, object, embed, video, audio, table, div, span, ul, ol, p",
      ) === null
    );
  }

  function shouldSkipLegacyRowCollapse(row: HTMLTableRowElement | null) {
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

  function normalizeLegacyWidth(rawValue) {
    return (rawValue || "").replace(/\s+/g, "").toLowerCase();
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
