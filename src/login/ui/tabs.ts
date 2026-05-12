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

  function normalizeLandingTabs(
    targetDocument: Document,
    tabNavigation: HTMLElement,
    tabContents: readonly HTMLElement[],
    strings: Readonly<Record<string, string>> = getLocalizedStrings("zh"),
  ) {
    if (tabContents.length === 0) {
      return;
    }
    const tabButtons = [
      ...tabNavigation.querySelectorAll<HTMLElement>("button, a[href^='#'], [role='tab']"),
    ];
    if (tabButtons.length === 0) {
      return;
    }

    const tabSpecs = getLoginTabSpecs(strings, targetDocument);
    for (const [index, spec] of tabSpecs.entries()) {
      if (index >= tabButtons.length || index >= tabContents.length) {
        continue;
      }
      const button = tabButtons[index];
      const panel = tabContents[index];
      panel.id = `ccxp-lite-tabpanel-${index + 1}`;
      button.textContent = spec.label;
      button.removeAttribute("onclick");
      button.removeAttribute("href");
      button.setAttribute("aria-controls", panel.id);
      panel.replaceChildren(buildTabPanelContent(targetDocument, spec.heading, spec.items));
      panel.classList.toggle("ccxp-lite-student-alumni-panel", spec.panelKey === "student-alumni");
    }
  }

  function wireTabs(
    targetDocument: Document,
    tabNavigation: HTMLElement,
    tabContents: readonly HTMLElement[],
    strings: Readonly<Record<string, string>> = getLocalizedStrings("zh"),
  ) {
    if (tabContents.length === 0) {
      return;
    }
    const tabButtons = [
      ...tabNavigation.querySelectorAll<HTMLElement>("button, a[href^='#'], [role='tab']"),
    ];
    if (tabButtons.length === 0) {
      return;
    }
    const tabPanels = tabContents.map((panel, index) => {
      const tabPanel = panel;
      tabPanel.id ||= `ccxp-lite-tabpanel-${index + 1}`;
      tabPanel.setAttribute("role", "tabpanel");
      tabPanel.setAttribute("tabindex", "0");
      return tabPanel;
    });
    const resolvePanelByLegacyTarget = (button: HTMLElement) => {
      const directControl = button.getAttribute("aria-controls");
      if (directControl !== null && directControl !== "") {
        return tabPanels.find((candidatePanel) => candidatePanel.id === directControl) ?? undefined;
      }
      const href = (button.getAttribute("href") ?? "").trim();
      if (href.startsWith("#")) {
        const hashId = href.slice(1);
        const fromHash = tabPanels.find((candidatePanel) => candidatePanel.id === hashId);
        if (fromHash) {
          return fromHash;
        }
      }
      const legacyTarget = extractLegacyTabTarget(button);
      if (legacyTarget === "") {
        return undefined;
      }
      return tabPanels.find((candidatePanel) => candidatePanel.id === legacyTarget) ?? undefined;
    };
    const buttonPanelMap: Array<{
      button: HTMLElement;
      panel: HTMLElement;
    }> = tabButtons.map((button, index) => {
      const panel = resolvePanelByLegacyTarget(button) ?? tabPanels[index];
      return { button, panel };
    });
    if (buttonPanelMap.length === 0) {
      return;
    }
    structureLoginTabNavigation(targetDocument, tabNavigation, buttonPanelMap);
    tabNavigation.setAttribute("role", "tablist");
    tabNavigation.setAttribute("aria-label", strings.portalSectionsLabel);
    const uniquePanels = [...new Set(buttonPanelMap.map((entry) => entry.panel))];
    for (const [index, entry] of buttonPanelMap.entries()) {
      const { button, panel } = entry;
      const tabId = button.id === "" ? `ccxp-lite-tab-${index + 1}` : button.id;
      button.id = tabId;
      applyTabPanelSemanticClass(button, panel);
      button.setAttribute("role", "tab");
      button.setAttribute("aria-controls", panel.id);
      button.setAttribute("aria-selected", "false");
      button.setAttribute("tabindex", "-1");
      if (button instanceof HTMLButtonElement) {
        button.type = "button";
      }
      panel.setAttribute("aria-labelledby", tabId);
      panel.hidden = true;
      panel.style.display = "none";
    }
    for (const panel of uniquePanels) {
      panel.hidden = true;
      panel.style.display = "none";
    }
    const getActiveIndex = () => {
      const byButtonClass = buttonPanelMap.findIndex(({ button }) =>
        button.classList.contains("active"),
      );
      if (byButtonClass !== -1) {
        return byButtonClass;
      }
      const byPanelVisibility = buttonPanelMap.findIndex(
        ({ panel }) => panel.style.display !== "none" && !panel.hidden,
      );
      if (byPanelVisibility !== -1) {
        return byPanelVisibility;
      }
      return 0;
    };
    const activateTabAt = (
      targetIndex: number,
      options: {
        focusButton?: boolean;
      } = {},
    ) => {
      const safeIndex = Math.max(0, Math.min(targetIndex, buttonPanelMap.length - 1));
      for (const [index, entry] of buttonPanelMap.entries()) {
        const isActive = index === safeIndex;
        entry.button.classList.toggle("active", isActive);
        entry.button.setAttribute("aria-selected", isActive ? "true" : "false");
        entry.button.setAttribute("tabindex", isActive ? "0" : "-1");
        entry.panel.hidden = !isActive;
        entry.panel.style.display = isActive ? "block" : "none";
      }
      if (options.focusButton === true) {
        buttonPanelMap[safeIndex].button.focus();
      }
    };
    for (const [index, entry] of buttonPanelMap.entries()) {
      const { button } = entry;
      button.addEventListener("click", (event) => {
        event.preventDefault();
        activateTabAt(index);
      });
      button.addEventListener("keydown", (event) => {
        switch (event.key) {
          case "ArrowRight": {
            event.preventDefault();
            activateTabAt((index + 1) % buttonPanelMap.length, { focusButton: true });
            break;
          }

          case "ArrowLeft": {
            event.preventDefault();
            activateTabAt((index - 1 + buttonPanelMap.length) % buttonPanelMap.length, {
              focusButton: true,
            });
            break;
          }

          case "Home": {
            event.preventDefault();
            activateTabAt(0, { focusButton: true });
            break;
          }

          case "End": {
            event.preventDefault();
            activateTabAt(buttonPanelMap.length - 1, { focusButton: true });
            break;
          }
          // No default
        }
      });
    }
    activateTabAt(getActiveIndex());
  }

  function structureLoginTabNavigation(
    targetDocument: Document,
    tabNavigation: HTMLElement,
    buttonPanelMap: ReadonlyArray<{
      button: HTMLElement;
    }>,
  ) {
    if (buttonPanelMap.length === 0) {
      return;
    }
    const fragment = targetDocument.createDocumentFragment();
    for (const [index, entry] of buttonPanelMap.entries()) {
      const item = targetDocument.createElement("span");
      item.className = "ccxp-lite-tab-item";
      if (index > 0) {
        const divider = targetDocument.createElement("span");
        divider.className = "ccxp-lite-tab-divider";
        divider.setAttribute("aria-hidden", "true");
        item.append(divider);
      }
      item.append(entry.button);
      fragment.append(item);
    }
    tabNavigation.replaceChildren(fragment);
  }

  function applyTabPanelSemanticClass(button: HTMLElement, panel: HTMLElement) {
    const label = button.textContent.replaceAll(/\s+/g, " ").trim().toLowerCase();
    if (/(\u5B78\u751F|\u6821\u53CB|student|alumni)/i.test(label)) {
      panel.classList.add("ccxp-lite-student-alumni-panel");
    }
  }

  function buildTabPanelContent(
    targetDocument: Document,
    headingText: string,
    items: readonly string[],
  ) {
    const fragment = targetDocument.createDocumentFragment();
    const heading = targetDocument.createElement("h3");
    heading.textContent = headingText;
    fragment.append(heading);

    const list = targetDocument.createElement("ul");
    for (const itemText of items) {
      const item = targetDocument.createElement("li");
      item.textContent = itemText;
      list.append(item);
    }
    fragment.append(list);

    return fragment;
  }

  function getLoginTabSpecs(
    strings: Readonly<Record<string, string>>,
    targetDocument: Document,
  ): ReadonlyArray<{
    label: string;
    heading: string;
    items: readonly string[];
    panelKey: string;
  }> {
    const documentLanguage = targetDocument.documentElement.lang.toLowerCase();
    const isZh =
      documentLanguage.startsWith("zh") || strings.cannotLogin.includes("\u7121\u6CD5\u767B\u5165");

    if (!isZh) {
      return [
        {
          label: "Account Help",
          heading: "Account Help",
          items: [
            `First-time sign-in, account activation, and password reset all start from "${strings.cannotLogin}".`,
            'Except for "guest", the account codes below are examples only. Replace them with your own account.',
          ],
          panelKey: "account-help",
        },
        {
          label: "Students / Alumni",
          heading: "Students / Alumni",
          items: [
            "Account: student ID (examples: 110061190, X1106099, 102061190)",
            "Use your own student ID in place of the example above.",
            "Nanda campus entrants from year 105 or earlier use the Nanda portal password; contact the Nanda computer center if it is forgotten.",
          ],
          panelKey: "student-alumni",
        },
        {
          label: "Faculty / Staff",
          heading: "Faculty / Staff",
          items: [
            "Account: employee number (example: W09090)",
            "Use your own employee number in place of the example above.",
          ],
          panelKey: "staff",
        },
        {
          label: "Payees / Vendors",
          heading: "Payees / Vendors",
          items: ["Vendor account: company tax ID", "Individual payee account: national ID number"],
          panelKey: "payee-vendor",
        },
        {
          label: "Other",
          heading: "Other",
          items: [
            "Public course takers: guest",
            "Mandarin Center students: student ID (example: C1100088)",
            "Delegated account: delegator employee number-01 (example: A11111-01)",
            'Replace the sample codes above with your assigned account. "guest" is the only fixed value.',
          ],
          panelKey: "other",
        },
        {
          label: "Reminders",
          heading: "Reminders",
          items: [
            "The system periodically requires password changes.",
            "Avoid easy-to-guess information such as birthdays, ID numbers, and phone numbers.",
          ],
          panelKey: "security",
        },
      ];
    }

    return [
      {
        label: "\u5E33\u865F\u554F\u984C",
        heading: "\u5E33\u865F\u554F\u984C",
        items: [
          `\u9996\u6B21\u767B\u5165\u3001\u5E33\u865F\u555F\u7528\u3001\u5FD8\u8A18\u5BC6\u78BC\uFF0C\u8ACB\u76F4\u63A5\u9EDE\u9078\u300C${strings.cannotLogin}\u300D\u3002`,
          '\u9664\u4E86 "guest" \u4E4B\u5916\uFF0C\u4E0B\u65B9\u4EE3\u78BC\u90FD\u662F\u683C\u5F0F\u7BC4\u4F8B\uFF0C\u8ACB\u6539\u586B\u81EA\u5DF1\u7684\u5E33\u865F\u3002',
        ],
        panelKey: "account-help",
      },
      {
        label: "\u5B78\u751F\uFF0F\u6821\u53CB",
        heading: "\u5B78\u751F\uFF0F\u6821\u53CB",
        items: [
          "\u5E33\u865F\uFF1A\u5B78\u865F\uFF08\u4F8B\uFF1A110061190\u3001X1106099\u3001102061190\uFF09",
          "\u8ACB\u4EE5\u81EA\u5DF1\u7684\u5B78\u865F\u53D6\u4EE3\u4E0A\u8FF0\u7BC4\u4F8B\u3002",
          "\u5357\u5927\u6821\u5340 105 \u5E74\u524D\u5165\u5B78\u8005\uFF1A\u5BC6\u78BC\u6CBF\u7528\u5357\u5927\u6821\u5340\u5165\u53E3\u7DB2\uFF1B\u82E5\u5FD8\u8A18\u5BC6\u78BC\uFF0C\u8ACB\u6D3D\u5357\u5927\u6821\u5340\u8A08\u4E2D\u3002",
        ],
        panelKey: "student-alumni",
      },
      {
        label: "\u6559\u8077\u54E1",
        heading: "\u6559\u8077\u54E1",
        items: [
          "\u5E33\u865F\uFF1A\u54E1\u5DE5\u7DE8\u865F\uFF08\u4F8B\uFF1AW09090\uFF09",
          "\u8ACB\u4EE5\u81EA\u5DF1\u7684\u54E1\u5DE5\u7DE8\u865F\u53D6\u4EE3\u4E0A\u8FF0\u7BC4\u4F8B\u3002",
        ],
        panelKey: "staff",
      },
      {
        label: "\u53D7\u6B3E\u4EBA\uFF0F\u5EE0\u5546",
        heading: "\u53D7\u6B3E\u4EBA\uFF0F\u5EE0\u5546",
        items: [
          "\u5EE0\u5546\u5E33\u865F\uFF1A\u7D71\u4E00\u7DE8\u865F",
          "\u500B\u4EBA\u53D7\u6B3E\u4EBA\u5E33\u865F\uFF1A\u8EAB\u5206\u8B49\u5B57\u865F",
        ],
        panelKey: "payee-vendor",
      },
      {
        label: "\u5176\u4ED6",
        heading: "\u5176\u4ED6",
        items: [
          "\u793E\u6703\u4EBA\u58EB\u9078\u8AB2\uFF1Aguest",
          "\u83EF\u8A9E\u4E2D\u5FC3\u5B78\u54E1\uFF1A\u5B78\u865F\uFF08\u4F8B\uFF1AC1100088\uFF09",
          "\u59D4\u8A17\u6388\u6B0A\u5E33\u865F\uFF1A\u59D4\u8A17\u4EBA\u54E1\u5DE5\u7DE8\u865F-01\uFF08\u4F8B\uFF1AA11111-01\uFF09",
          '\u9664\u4E86 "guest" \u4E4B\u5916\uFF0C\u8ACB\u4EE5\u81EA\u5DF1\u7684\u6307\u6D3E\u5E33\u865F\u53D6\u4EE3\u4E0A\u8FF0\u7BC4\u4F8B\u3002',
        ],
        panelKey: "other",
      },
      {
        label: "\u63D0\u9192\u4E8B\u9805",
        heading: "\u63D0\u9192\u4E8B\u9805",
        items: [
          "\u7CFB\u7D71\u6703\u5B9A\u671F\u8981\u6C42\u4FEE\u6539\u5BC6\u78BC\u3002",
          "\u8ACB\u907F\u514D\u4F7F\u7528\u751F\u65E5\u3001\u8EAB\u5206\u8B49\u5B57\u865F\u3001\u96FB\u8A71\u7B49\u6613\u731C\u8CC7\u8A0A\u3002",
        ],
        panelKey: "security",
      },
    ];
  }

  function extractLegacyTabTarget(button: HTMLElement) {
    const onclickValue = button.getAttribute("onclick") ?? "";
    const targetMatch = onclickValue.match(/["']([^"']+)["']/);
    return targetMatch ? targetMatch[1] : "";
  }
  namespace.loginTabs = {
    createSection,
    normalizeLandingTabs,
    wireTabs,
  };
})(globalThis);
