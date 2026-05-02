(function registerCcxpLiteLandingTabs(globalScope: typeof globalThis) {
  const runtimeScope = globalScope;
  const namespace = runtimeScope.CCXP_LITE ?? {};
  const { shared } = namespace;
  if (!shared) {
    return;
  }

  const { getLocalizedStrings } = shared;

  function isArray<T>(value: unknown): value is T[] {
    return value !== null && typeof value === "object" && value.constructor === Array;
  }

  function createLandingSection(targetDocument: Document, className: string) {
    const section = targetDocument.createElement("section");
    section.className = `ccxp-lite-landing-section ${className}`;
    return section;
  }

  function wireLandingTabs(
    targetDocument: Document,
    tabNavigation: HTMLElement,
    tabContents: readonly HTMLElement[],
    strings: Readonly<Record<string, string>> = getLocalizedStrings("zh"),
  ) {
    if (!tabNavigation || !isArray(tabContents) || tabContents.length === 0) {
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
      if (directControl) {
        return tabPanels.find((candidatePanel) => candidatePanel.id === directControl) ?? null;
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
      if (!legacyTarget) {
        return null;
      }

      return tabPanels.find((candidatePanel) => candidatePanel.id === legacyTarget) ?? null;
    };

    const buttonPanelMap: Array<{ button: HTMLElement; panel: HTMLElement }> = tabButtons
      .map((button, index) => {
        const panel = resolvePanelByLegacyTarget(button) ?? tabPanels[index] ?? null;
        return { button, panel };
      })
      .filter((entry): entry is { button: HTMLElement; panel: HTMLElement } =>
        Boolean(entry.panel),
      );

    if (buttonPanelMap.length === 0) {
      return;
    }

    structureLandingTabNavigation(targetDocument, tabNavigation, buttonPanelMap);

    tabNavigation.setAttribute("role", "tablist");
    tabNavigation.setAttribute("aria-label", strings.portalSectionsLabel);

    const uniquePanels = [...new Set(buttonPanelMap.map((entry) => entry.panel))];

    for (const [index, entry] of buttonPanelMap.entries()) {
      const { button, panel } = entry;
      const tabId = button.id || `ccxp-lite-tab-${index + 1}`;
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

    const activateTabAt = (targetIndex: number, options: { focusButton?: boolean } = {}) => {
      const safeIndex = Math.max(0, Math.min(targetIndex, buttonPanelMap.length - 1));

      for (const [index, entry] of buttonPanelMap.entries()) {
        const isActive = index === safeIndex;
        entry.button.classList.toggle("active", isActive);
        entry.button.setAttribute("aria-selected", isActive ? "true" : "false");
        entry.button.setAttribute("tabindex", isActive ? "0" : "-1");
        entry.panel.hidden = !isActive;
        entry.panel.style.display = isActive ? "block" : "none";
      }

      if (options.focusButton) {
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

  function structureLandingTabNavigation(
    targetDocument: Document,
    tabNavigation: HTMLElement,
    buttonPanelMap: ReadonlyArray<{ button: HTMLElement }>,
  ) {
    if (
      !targetDocument ||
      !tabNavigation ||
      !isArray(buttonPanelMap) ||
      buttonPanelMap.length === 0
    ) {
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
    if (!button || !panel) {
      return;
    }

    const label = (button.textContent ?? "").replaceAll(/\s+/g, " ").trim().toLowerCase();
    if (/(\u5B78\u751F|\u6821\u53CB|student|alumni)/i.test(label)) {
      panel.classList.add("ccxp-lite-student-alumni-panel");
    }
  }

  function extractLegacyTabTarget(button: HTMLElement) {
    const onclickValue = button.getAttribute("onclick") ?? "";
    const targetMatch = onclickValue.match(/["']([^"']+)["']/);
    return targetMatch ? targetMatch[1] : "";
  }

  namespace.landingTabs = {
    createLandingSection,
    wireLandingTabs,
  };
})(globalThis);
