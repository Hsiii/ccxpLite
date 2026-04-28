(function registerCcxpLiteLandingTabs(globalScope: Window & typeof globalThis) {
  const namespace = (globalScope.CCXP_LITE ||= {}) as CcxpLiteNamespace;
  const { shared } = namespace;
  if (!shared) {
    return;
  }

  const { getLocalizedStrings } = shared;

  function createLandingSection(targetDocument: Document, className: string) {
    const section = targetDocument.createElement("section");
    section.className = `ccxp-lite-landing-section ${className}`;
    return section;
  }

  function wireLandingTabs(
    targetDocument: Document,
    tabNavigation: HTMLElement,
    tabContents: HTMLElement[],
    strings = getLocalizedStrings("zh"),
  ) {
    if (!tabNavigation || !Array.isArray(tabContents) || tabContents.length === 0) {
      return;
    }

    const tabButtons = Array.from(
      tabNavigation.querySelectorAll("button, a[href^='#'], [role='tab']"),
    );
    if (tabButtons.length === 0) {
      return;
    }

    const tabPanels = tabContents.map((panel, index) => {
      panel.id ||= `ccxp-lite-tabpanel-${index + 1}`;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("tabindex", "0");
      return panel;
    });

    const resolvePanelByLegacyTarget = (button: HTMLElement) => {
      const directControl = button.getAttribute("aria-controls");
      if (directControl) {
        return tabPanels.find((panel) => panel.id === directControl) || null;
      }

      const href = (button.getAttribute("href") || "").trim();
      if (href.startsWith("#")) {
        const hashId = href.slice(1);
        const fromHash = tabPanels.find((panel) => panel.id === hashId);
        if (fromHash) {
          return fromHash;
        }
      }

      const legacyTarget = extractLegacyTabTarget(button);
      if (!legacyTarget) {
        return null;
      }

      return tabPanels.find((panel) => panel.id === legacyTarget) || null;
    };

    const buttonPanelMap: Array<{ button: HTMLElement; panel: HTMLElement }> = tabButtons
      .map((button, index) => {
        const panel = resolvePanelByLegacyTarget(button) || tabPanels[index] || null;
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

    const uniquePanels = Array.from(new Set(buttonPanelMap.map((entry) => entry.panel)));

    buttonPanelMap.forEach((entry, index) => {
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
    });

    uniquePanels.forEach((panel) => {
      panel.hidden = true;
      panel.style.display = "none";
    });

    const getActiveIndex = () => {
      const byButtonClass = buttonPanelMap.findIndex(({ button }) =>
        button.classList.contains("active"),
      );
      if (byButtonClass >= 0) {
        return byButtonClass;
      }

      const byPanelVisibility = buttonPanelMap.findIndex(
        ({ panel }) => panel.style.display !== "none" && !panel.hidden,
      );
      if (byPanelVisibility >= 0) {
        return byPanelVisibility;
      }

      return 0;
    };

    const activateTabAt = (targetIndex: number, options: { focusButton?: boolean } = {}) => {
      const safeIndex = Math.max(0, Math.min(targetIndex, buttonPanelMap.length - 1));

      buttonPanelMap.forEach((entry, index) => {
        const isActive = index === safeIndex;
        entry.button.classList.toggle("active", isActive);
        entry.button.setAttribute("aria-selected", isActive ? "true" : "false");
        entry.button.setAttribute("tabindex", isActive ? "0" : "-1");
        entry.panel.hidden = !isActive;
        entry.panel.style.display = isActive ? "block" : "none";
      });

      if (options.focusButton) {
        buttonPanelMap[safeIndex].button.focus();
      }
    };

    buttonPanelMap.forEach((entry, index) => {
      const { button } = entry;

      button.addEventListener("click", (event) => {
        event.preventDefault();
        activateTabAt(index);
      });

      button.addEventListener("keydown", (event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          activateTabAt((index + 1) % buttonPanelMap.length, { focusButton: true });
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          activateTabAt((index - 1 + buttonPanelMap.length) % buttonPanelMap.length, {
            focusButton: true,
          });
        } else if (event.key === "Home") {
          event.preventDefault();
          activateTabAt(0, { focusButton: true });
        } else if (event.key === "End") {
          event.preventDefault();
          activateTabAt(buttonPanelMap.length - 1, { focusButton: true });
        }
      });
    });

    activateTabAt(getActiveIndex());
  }

  function structureLandingTabNavigation(
    targetDocument: Document,
    tabNavigation: HTMLElement,
    buttonPanelMap: Array<{ button: HTMLElement }>,
  ) {
    if (
      !targetDocument ||
      !tabNavigation ||
      !Array.isArray(buttonPanelMap) ||
      buttonPanelMap.length === 0
    ) {
      return;
    }

    const fragment = targetDocument.createDocumentFragment();

    buttonPanelMap.forEach((entry, index) => {
      const item = targetDocument.createElement("span");
      item.className = "ccxp-lite-tab-item";

      if (index > 0) {
        const divider = targetDocument.createElement("span");
        divider.className = "ccxp-lite-tab-divider";
        divider.setAttribute("aria-hidden", "true");
        item.appendChild(divider);
      }

      item.appendChild(entry.button);
      fragment.appendChild(item);
    });

    tabNavigation.replaceChildren(fragment);
  }

  function applyTabPanelSemanticClass(button: HTMLElement, panel: HTMLElement) {
    if (!button || !panel) {
      return;
    }

    const label = (button.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
    if (/(學生|校友|student|alumni)/i.test(label)) {
      panel.classList.add("ccxp-lite-student-alumni-panel");
    }
  }

  function extractLegacyTabTarget(button: HTMLElement) {
    const onclickValue = button.getAttribute("onclick") || "";
    const targetMatch = onclickValue.match(/['"]([^'"]+)['"]/);
    return targetMatch ? targetMatch[1] : "";
  }

  namespace.landingTabs = {
    createLandingSection,
    wireLandingTabs,
  };
})(globalThis);
