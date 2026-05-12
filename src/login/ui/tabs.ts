(function registerCcxpLiteLoginTabs(globalScope: typeof globalThis) {
  const runtimeScope = globalScope;
  const namespace = runtimeScope.CCXP_LITE ?? {};
  const { shared } = namespace;
  if (!shared) {
    return;
  }
  const { getLocalizedStrings } = shared;

  function createSection(targetDocument: Document, className: string) {
    const section = targetDocument.createElement("section");
    section.className = `ccxp-lite-landing-section ${className}`;
    return section;
  }

  function createAccountGuide(
    targetDocument: Document,
    strings: Readonly<Record<string, string>> = getLocalizedStrings("zh"),
    supportLinks?: HTMLElement,
  ) {
    const copy = getGuideCopy(strings, targetDocument);
    const shell = targetDocument.createElement("section");
    shell.className = "ccxp-lite-account-guide";

    const header = targetDocument.createElement("div");
    header.className = "ccxp-lite-account-guide-header";

    const titleWrap = targetDocument.createElement("div");
    titleWrap.className = "ccxp-lite-account-guide-title-wrap";

    const title = targetDocument.createElement("h3");
    title.className = "ccxp-lite-account-guide-title";
    title.textContent = copy.title;
    titleWrap.append(title);

    if (copy.infoItems.length > 0) {
      const infoList = targetDocument.createElement("ul");
      infoList.className = "ccxp-lite-account-guide-info-list";
      for (const itemText of copy.infoItems) {
        const item = targetDocument.createElement("li");
        item.textContent = itemText;
        infoList.append(item);
      }
      titleWrap.append(infoList);
    }
    header.append(titleWrap);
    shell.append(header);

    const accountList = targetDocument.createElement("ul");
    accountList.className = "ccxp-lite-account-guide-account-list";
    for (const spec of copy.accounts) {
      accountList.append(buildAccountItem(targetDocument, spec));
    }
    shell.append(accountList);

    if (supportLinks) {
      shell.append(supportLinks);
    }

    return shell;
  }

  function buildAccountItem(
    targetDocument: Document,
    spec: Readonly<{
      label: string;
      value: string;
      popup?: string;
      popupLabel?: string;
    }>,
  ) {
    const item = targetDocument.createElement("li");
    item.className = "ccxp-lite-account-guide-account-item";

    const line = targetDocument.createElement("div");
    line.className = "ccxp-lite-account-guide-account-line";

    const label = targetDocument.createElement("span");
    label.className = "ccxp-lite-account-guide-account-label";
    label.textContent = `${spec.label}:`;
    line.append(label);

    const value = targetDocument.createElement("span");
    value.className = "ccxp-lite-account-guide-account-value";
    value.textContent = spec.value;
    line.append(value);

    if (spec.popup !== undefined && spec.popup !== "") {
      line.append(buildInfoPopover(targetDocument, spec.popup, spec.popupLabel ?? spec.label));
    }

    item.append(line);
    return item;
  }

  function buildInfoPopover(targetDocument: Document, popupText: string, labelText: string) {
    const popupContent = targetDocument.createElement("span");
    popupContent.textContent = popupText;
    return buildInfoPopoverContent(targetDocument, popupContent, labelText);
  }

  function buildInfoPopoverContent(
    targetDocument: Document,
    popupContent: Node,
    labelText: string,
    popupClassName?: string,
  ) {
    const wrap = targetDocument.createElement("span");
    wrap.className = "ccxp-lite-account-guide-info";

    const button = targetDocument.createElement("button");
    button.className = "ccxp-lite-account-guide-info-button";
    button.type = "button";
    button.setAttribute("aria-label", labelText);
    button.setAttribute("aria-expanded", "false");
    button.append(createInfoIcon(targetDocument));
    wrap.append(button);

    const popup = targetDocument.createElement("span");
    popup.className = ["ccxp-lite-account-guide-info-popup", popupClassName]
      .filter((className) => className !== undefined && className !== "")
      .join(" ");
    const popupId = `ccxp-lite-info-popup-${Math.random().toString(36).slice(2, 10)}`;
    popup.id = popupId;
    popup.hidden = true;
    popup.append(popupContent);
    wrap.append(popup);
    button.setAttribute("aria-controls", popupId);

    let isPinnedOpen = false;
    let isPointerInside = false;
    let suppressHoverOpen = false;

    const syncPopupVisibility = () => {
      const isVisible = isPinnedOpen || (isPointerInside && !suppressHoverOpen);
      if (isVisible) {
        wrap.dataset.ccxpLitePopupOpen = "true";
      } else {
        delete wrap.dataset.ccxpLitePopupOpen;
      }
      popup.hidden = !isVisible;
      button.setAttribute("aria-expanded", isVisible ? "true" : "false");
    };
    const openPinnedPopup = () => {
      isPinnedOpen = true;
      suppressHoverOpen = false;
      syncPopupVisibility();
    };
    const closePopup = (options?: { suppressHoverOpen?: boolean }) => {
      isPinnedOpen = false;
      suppressHoverOpen = options?.suppressHoverOpen === true;
      syncPopupVisibility();
    };

    wrap.addEventListener("mouseenter", () => {
      isPointerInside = true;
      suppressHoverOpen = false;
      syncPopupVisibility();
    });
    wrap.addEventListener("mouseleave", () => {
      isPointerInside = false;
      suppressHoverOpen = false;
      syncPopupVisibility();
    });

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (isPinnedOpen) {
        closePopup({ suppressHoverOpen: true });
        return;
      }
      openPinnedPopup();
    });
    popup.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    targetDocument.addEventListener("click", (event) => {
      if (wrap.contains(event.target as Node | null)) {
        return;
      }
      closePopup();
    });
    button.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      closePopup({ suppressHoverOpen: true });
      button.blur();
    });
    popup.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      closePopup({ suppressHoverOpen: true });
      button.focus();
    });

    return wrap;
  }

  function createInfoIcon(targetDocument: Document) {
    const icon = targetDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "1.8");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    icon.setAttribute("aria-hidden", "true");

    const circle = targetDocument.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "12");
    circle.setAttribute("cy", "12");
    circle.setAttribute("r", "9");
    icon.append(circle);

    const stem = targetDocument.createElementNS("http://www.w3.org/2000/svg", "path");
    stem.setAttribute("d", "M12 10v5");
    icon.append(stem);

    const dot = targetDocument.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", "12");
    dot.setAttribute("cy", "7");
    dot.setAttribute("r", "0.75");
    dot.setAttribute("fill", "currentColor");
    dot.setAttribute("stroke", "none");
    icon.append(dot);

    return icon;
  }

  function createAccountFormatExamples(
    targetDocument: Document,
    strings: Readonly<Record<string, string>> = getLocalizedStrings("zh"),
  ) {
    const copy = getGuideCopy(strings, targetDocument);
    const list = targetDocument.createElement("ul");
    list.className = "ccxp-lite-account-format-list";
    for (const spec of copy.accounts) {
      const item = targetDocument.createElement("li");
      item.className = "ccxp-lite-account-format-item";

      const label = targetDocument.createElement("span");
      label.className = "ccxp-lite-account-format-label";
      label.textContent = `${spec.label}: `;
      item.append(label);

      const value = targetDocument.createElement("span");
      value.className = "ccxp-lite-account-format-value";
      value.textContent = spec.value;
      item.append(value);

      list.append(item);
    }
    return list;
  }

  function createAccountFormatPopover(
    targetDocument: Document,
    strings: Readonly<Record<string, string>> = getLocalizedStrings("zh"),
  ) {
    return buildInfoPopoverContent(
      targetDocument,
      createAccountFormatExamples(targetDocument, strings),
      strings.fieldAccount,
      "ccxp-lite-account-format-popup",
    );
  }

  function createPasswordHelpPopover(
    targetDocument: Document,
    strings: Readonly<Record<string, string>> = getLocalizedStrings("zh"),
    cannotLoginAnchor?: HTMLAnchorElement,
  ) {
    const copy = getPasswordHelpCopy(strings, targetDocument);
    const content = targetDocument.createElement("div");
    content.className = "ccxp-lite-password-help-popup";

    const recoveryLine = targetDocument.createElement("p");
    recoveryLine.className = "ccxp-lite-password-help-popup-line";
    recoveryLine.append(targetDocument.createTextNode(copy.recoveryPrefix));
    if (cannotLoginAnchor) {
      recoveryLine.append(createPasswordHelpLink(targetDocument, cannotLoginAnchor, strings));
    } else {
      const fallback = targetDocument.createElement("span");
      fallback.className = "ccxp-lite-password-help-popup-link";
      fallback.textContent = strings.cannotLogin;
      recoveryLine.append(fallback);
    }
    recoveryLine.append(targetDocument.createTextNode(copy.recoverySuffix));
    content.append(recoveryLine);

    const hygieneLine = targetDocument.createElement("p");
    hygieneLine.className = "ccxp-lite-password-help-popup-line";
    hygieneLine.textContent = copy.hygiene;
    content.append(hygieneLine);

    return buildInfoPopoverContent(
      targetDocument,
      content,
      copy.buttonLabel,
      "ccxp-lite-password-help-popup-shell",
    );
  }

  function getGuideCopy(
    strings: Readonly<Record<string, string>>,
    targetDocument: Document,
  ): Readonly<{
    title: string;
    infoItems: readonly string[];
    accounts: ReadonlyArray<{
      label: string;
      value: string;
      popup?: string;
      popupLabel?: string;
    }>;
  }> {
    const documentLanguage = targetDocument.documentElement.lang.toLowerCase();
    const isZh =
      documentLanguage.startsWith("zh") || strings.cannotLogin.includes("\u7121\u6CD5\u767B\u5165");

    if (!isZh) {
      return {
        title: "Login Info",
        infoItems: [],
        accounts: [
          {
            label: "Student / alumni account",
            value:
              "student ID (e.g. 110061190, X1106099, 102061190), Nanda campus entrants from year 105 or earlier use the Nanda portal password. Contact the Nanda computer center if it is forgotten.",
          },
          {
            label: "Faculty / staff account",
            value: "employee number (e.g. W09090)",
          },
          {
            label: "Vendor account",
            value: "company tax ID",
          },
          {
            label: "Individual payee account",
            value: "national ID number",
          },
          {
            label: "Public course taker account",
            value: "guest",
          },
          {
            label: "Mandarin Center student account",
            value: "student ID (e.g. C1100088)",
          },
          {
            label: "Delegated account",
            value: "delegator employee number-01 (e.g. A11111-01)",
          },
        ],
      };
    }

    return {
      title: "\u767B\u5165\u8CC7\u8A0A",
      infoItems: [],
      accounts: [
        {
          label: "\u5B78\u751F\uFF0F\u6821\u53CB\u5E33\u865F",
          value:
            "\u5B78\u865F\uFF08\u4F8B\uFF1A110061190\u3001X1106099\u3001102061190\uFF09\uFF0C\u5357\u5927\u6821\u5340 105 \u5E74\u524D\u5165\u5B78\u8005\uFF1A\u5BC6\u78BC\u6CBF\u7528\u5357\u5927\u6821\u5340\u5165\u53E3\u7DB2\uFF1B\u82E5\u5FD8\u8A18\u5BC6\u78BC\uFF0C\u8ACB\u6D3D\u5357\u5927\u6821\u5340\u8A08\u4E2D\u3002",
        },
        {
          label: "\u6559\u8077\u54E1\u5E33\u865F",
          value: "\u54E1\u5DE5\u7DE8\u865F\uFF08\u4F8B\uFF1AW09090\uFF09",
        },
        {
          label: "\u5EE0\u5546\u5E33\u865F",
          value: "\u7D71\u4E00\u7DE8\u865F",
        },
        {
          label: "\u500B\u4EBA\u53D7\u6B3E\u4EBA\u5E33\u865F",
          value: "\u8EAB\u5206\u8B49\u5B57\u865F",
        },
        {
          label: "\u793E\u6703\u4EBA\u58EB\u9078\u8AB2\u5E33\u865F",
          value: "guest",
        },
        {
          label: "\u83EF\u8A9E\u4E2D\u5FC3\u5B78\u54E1\u5E33\u865F",
          value: "\u5B78\u865F\uFF08\u4F8B\uFF1AC1100088\uFF09",
        },
        {
          label: "\u59D4\u8A17\u6388\u6B0A\u5E33\u865F",
          value: "\u59D4\u8A17\u4EBA\u54E1\u5DE5\u7DE8\u865F-01\uFF08\u4F8B\uFF1AA11111-01\uFF09",
        },
      ],
    };
  }

  function getPasswordHelpCopy(
    strings: Readonly<Record<string, string>>,
    targetDocument: Document,
  ): Readonly<{
    buttonLabel: string;
    recoveryPrefix: string;
    recoverySuffix: string;
    hygiene: string;
  }> {
    const documentLanguage = targetDocument.documentElement.lang.toLowerCase();
    const isZh =
      documentLanguage.startsWith("zh") || strings.cannotLogin.includes("\u7121\u6CD5\u767B\u5165");
    if (!isZh) {
      return {
        buttonLabel: "Password help",
        recoveryPrefix: "First-time sign-in, account activation, or password reset: use ",
        recoverySuffix: ".",
        hygiene:
          "The system periodically requires password changes. Avoid birthdays, ID numbers, and phone numbers.",
      };
    }
    return {
      buttonLabel: "\u5BC6\u78BC\u8AAA\u660E",
      recoveryPrefix:
        "\u9996\u6B21\u767B\u5165\u3001\u5E33\u865F\u555F\u7528\u6216\u5FD8\u8A18\u5BC6\u78BC\uFF1A\u8ACB\u4F7F\u7528",
      recoverySuffix: "\u3002",
      hygiene:
        "\u7CFB\u7D71\u6703\u5B9A\u671F\u8981\u6C42\u4FEE\u6539\u5BC6\u78BC\uFF0C\u8ACB\u907F\u514D\u4F7F\u7528\u751F\u65E5\u3001\u8EAB\u5206\u8B49\u5B57\u865F\u3001\u96FB\u8A71\u7B49\u6613\u731C\u8CC7\u8A0A\u3002",
    };
  }

  function createPasswordHelpLink(
    targetDocument: Document,
    sourceAnchor: HTMLAnchorElement,
    strings: Readonly<Record<string, string>>,
  ) {
    const link = targetDocument.createElement("a");
    link.className = "ccxp-lite-password-help-popup-link";
    link.href = sourceAnchor.href;
    link.target = sourceAnchor.target === "" ? "_blank" : sourceAnchor.target;
    link.rel = "noopener noreferrer";
    link.textContent = strings.cannotLogin;
    return link;
  }

  namespace.loginTabs = {
    createAccountFormatExamples,
    createAccountFormatPopover,
    createPasswordHelpPopover,
    createAccountGuide,
    createSection,
  };
})(globalThis);
