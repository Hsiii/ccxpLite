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

    const infoList = targetDocument.createElement("ul");
    infoList.className = "ccxp-lite-account-guide-info-list";
    for (const itemText of copy.infoItems) {
      const item = targetDocument.createElement("li");
      item.textContent = itemText;
      infoList.append(item);
    }
    titleWrap.append(infoList);
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
    const wrap = targetDocument.createElement("span");
    wrap.className = "ccxp-lite-account-guide-info";

    const button = targetDocument.createElement("button");
    button.className = "ccxp-lite-account-guide-info-button";
    button.type = "button";
    button.setAttribute("aria-label", labelText);
    button.textContent = "i";
    wrap.append(button);

    const popup = targetDocument.createElement("span");
    popup.className = "ccxp-lite-account-guide-info-popup";
    popup.textContent = popupText;
    popup.hidden = true;
    wrap.append(popup);

    const showPopup = () => {
      popup.hidden = false;
    };
    const hidePopup = () => {
      popup.hidden = true;
    };

    wrap.addEventListener("mouseenter", showPopup);
    wrap.addEventListener("mouseleave", hidePopup);
    button.addEventListener("focus", showPopup);
    button.addEventListener("blur", hidePopup);

    return wrap;
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
        infoItems: [
          `First-time sign-in, account activation, and password reset: use "${strings.cannotLogin}".`,
          "The system periodically requires password changes. Avoid birthdays, ID numbers, and phone numbers.",
        ],
        accounts: [
          {
            label: "Student / alumni account",
            value: "student ID (e.g. 110061190, X1106099, 102061190)",
            popup:
              "Nanda campus entrants from year 105 or earlier use the Nanda portal password. Contact the Nanda computer center if it is forgotten.",
            popupLabel: "Student and alumni account details",
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
      infoItems: [
        `\u9996\u6B21\u767B\u5165\u3001\u5E33\u865F\u555F\u7528\u3001\u5FD8\u8A18\u5BC6\u78BC\uFF1A\u8ACB\u76F4\u63A5\u9EDE\u9078\u300C${strings.cannotLogin}\u300D\u3002`,
        "\u7CFB\u7D71\u6703\u5B9A\u671F\u8981\u6C42\u4FEE\u6539\u5BC6\u78BC\uFF0C\u8ACB\u907F\u514D\u4F7F\u7528\u751F\u65E5\u3001\u8EAB\u5206\u8B49\u5B57\u865F\u3001\u96FB\u8A71\u7B49\u6613\u731C\u8CC7\u8A0A\u3002",
      ],
      accounts: [
        {
          label: "\u5B78\u751F\uFF0F\u6821\u53CB\u5E33\u865F",
          value: "\u5B78\u865F\uFF08\u4F8B\uFF1A110061190\u3001X1106099\u3001102061190\uFF09",
          popup:
            "\u5357\u5927\u6821\u5340 105 \u5E74\u524D\u5165\u5B78\u8005\uFF1A\u5BC6\u78BC\u6CBF\u7528\u5357\u5927\u6821\u5340\u5165\u53E3\u7DB2\uFF1B\u82E5\u5FD8\u8A18\u5BC6\u78BC\uFF0C\u8ACB\u6D3D\u5357\u5927\u6821\u5340\u8A08\u4E2D\u3002",
          popupLabel: "\u5B78\u751F\u8207\u6821\u53CB\u5E33\u865F\u88DC\u5145\u8AAA\u660E",
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

  namespace.loginTabs = {
    createAccountGuide,
    createSection,
  };
})(globalThis);
