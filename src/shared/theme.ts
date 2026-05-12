(function registerCcxpLiteSharedTheme(globalScope: typeof globalThis) {
  const runtimeScope = globalScope;
  const namespace = runtimeScope.CCXP_LITE ?? {};
  const { sharedConstants } = namespace;
  if (!sharedConstants) {
    return;
  }
  const { TOKENS, ASSETS } = sharedConstants;
  function ensureThemeDocument(targetDocument: Document, scope: string) {
    const { documentElement } = targetDocument;
    documentElement.dataset.ccxpLiteScope = scope;
    const { sharedDom } = namespace;
    const head = sharedDom?.ensureDocumentHead(targetDocument);
    if (!head) {
      return false;
    }
    const isContextReady = (() => {
      try {
        return !sharedDom || sharedDom.ensureContextValid();
      } catch {
        return false;
      }
    })();
    if (!isContextReady) {
      return false;
    }
    if (!head.querySelector("[data-ccxp-lite-stylesheet='true']")) {
      const runtime = (() => {
        try {
          return sharedDom?.getRuntimeSafely() ?? undefined;
        } catch {
          return undefined;
        }
      })();
      if (!runtime) {
        return false;
      }
      const link = targetDocument.createElement("link");
      link.rel = "stylesheet";
      link.href = runtime.getURL(ASSETS.stylesheetPath);
      link.dataset.ccxpLiteStylesheet = "true";
      head.append(link);
    }
    applyCssVariables(targetDocument.documentElement, buildCssVariables());
    return true;
  }

  function buildCssVariables() {
    return {
      "--ccxp-lite-primary": TOKENS.colorPrimary,
      "--ccxp-lite-accent": TOKENS.colorAccent,
      "--ccxp-lite-brand": TOKENS.colorBrand,
      "--ccxp-lite-brand-logo-filter":
        "brightness(0) saturate(100%) invert(19%) sepia(49%) saturate(2697%) hue-rotate(278deg) brightness(89%) contrast(92%)",
      "--ccxp-lite-legacy-blue-text": TOKENS.colorLegacyBlueText,
      "--ccxp-lite-legacy-red-text": TOKENS.colorLegacyRedText,
      "--ccxp-lite-bg": TOKENS.colorBg,
      "--ccxp-lite-surface": TOKENS.colorSurface,
      "--ccxp-lite-sidebar-surface": TOKENS.colorSidebarSurface,
      "--ccxp-lite-surface-muted": TOKENS.colorSurfaceMuted,
      "--ccxp-lite-border": TOKENS.colorBorder,
      "--ccxp-lite-sidebar-divider-color": TOKENS.colorSidebarDivider,
      "--ccxp-lite-sidebar-search-surface": TOKENS.colorSidebarSearchSurface,
      "--ccxp-lite-sidebar-search-gradient-start": TOKENS.colorSidebarSearchGradientStart,
      "--ccxp-lite-sidebar-search-border": TOKENS.colorSidebarSearchBorder,
      "--ccxp-lite-primary-focus-border": TOKENS.colorPrimaryFocusBorder,
      "--ccxp-lite-primary-focus-ring": TOKENS.colorPrimaryFocusRing,
      "--ccxp-lite-primary-hover-surface": TOKENS.colorPrimaryHoverSurface,
      "--ccxp-lite-primary-hover-solid": TOKENS.colorPrimaryHoverSolid,
      "--ccxp-lite-primary-muted-surface": TOKENS.colorPrimaryMutedSurface,
      "--ccxp-lite-primary-glow": TOKENS.colorPrimaryGlow,
      "--ccxp-lite-lab-active-surface": TOKENS.colorLabActiveSurface,
      "--ccxp-lite-lab-active-border": TOKENS.colorLabActiveBorder,
      "--ccxp-lite-lab-active-text": TOKENS.colorLabActiveText,
      "--ccxp-lite-lab-inactive-surface": TOKENS.colorLabInactiveSurface,
      "--ccxp-lite-lab-inactive-border": TOKENS.colorLabInactiveBorder,
      "--ccxp-lite-lab-inactive-text": TOKENS.colorLabInactiveText,
      "--ccxp-lite-lab-switch-shadow": TOKENS.colorLabSwitchShadow,
      "--ccxp-lite-sidebar-search-placeholder": TOKENS.colorSidebarSearchPlaceholder,
      "--ccxp-lite-text": TOKENS.colorText,
      "--ccxp-lite-text-muted": TOKENS.colorTextMuted,
      "--ccxp-lite-transparent": TOKENS.colorTransparent,
      "--ccxp-lite-skeleton-surface-end-tint": TOKENS.colorSkeletonSurfaceEndTint,
      "--ccxp-lite-skeleton-highlight-start": TOKENS.colorSkeletonHighlightStart,
      "--ccxp-lite-skeleton-highlight-soft": TOKENS.colorSkeletonHighlightSoft,
      "--ccxp-lite-skeleton-highlight-strong": TOKENS.colorSkeletonHighlightStrong,
      "--ccxp-lite-skeleton-surface-start":
        "color-mix(in srgb, var(--ccxp-lite-surface) 60%, var(--ccxp-lite-accent))",
      "--ccxp-lite-skeleton-surface-end":
        "color-mix(in srgb, var(--ccxp-lite-surface) 86%, var(--ccxp-lite-skeleton-surface-end-tint))",
      "--ccxp-lite-tabs-active-surface":
        "color-mix(in srgb, var(--ccxp-lite-surface) 72%, var(--ccxp-lite-accent))",
      "--ccxp-lite-tabs-focus-outline":
        "color-mix(in srgb, var(--ccxp-lite-primary) 45%, var(--ccxp-lite-bg))",
      "--ccxp-lite-danger-flash-transparent":
        "color-mix(in srgb, var(--ccxp-lite-type-danger-color) 0%, var(--ccxp-lite-transparent))",
      "--ccxp-lite-danger-flash-outline":
        "color-mix(in srgb, var(--ccxp-lite-type-danger-color) 78%, var(--ccxp-lite-bg))",
      "--ccxp-lite-danger-flash-shadow":
        "color-mix(in srgb, var(--ccxp-lite-type-danger-color) 14%, var(--ccxp-lite-transparent))",
      "--ccxp-lite-spacing-xs": TOKENS.spacingXs,
      "--ccxp-lite-spacing-sm": TOKENS.spacingSm,
      "--ccxp-lite-spacing-md": TOKENS.spacingMd,
      "--ccxp-lite-spacing-lg": TOKENS.spacingLg,
      "--ccxp-lite-spacing-xl": TOKENS.spacingXl,
      "--ccxp-lite-spacing-2xs": TOKENS.spacing2xs,
      "--ccxp-lite-spacing-3xs": TOKENS.spacing3xs,
      "--ccxp-lite-spacing-inline-sm": TOKENS.spacingInlineSm,
      "--ccxp-lite-spacing-inset-sm": TOKENS.spacingInsetSm,
      "--ccxp-lite-spacing-inset-md": TOKENS.spacingInsetMd,
      "--ccxp-lite-spacing-inset-lg": TOKENS.spacingInsetLg,
      "--ccxp-lite-spacing-brand-inline": TOKENS.spacingBrandInline,
      "--ccxp-lite-spacing-sidebar-search-inset": TOKENS.spacingSidebarSearchInset,
      "--ccxp-lite-spacing-sidebar-experiment-inset-x": TOKENS.spacingSidebarExperimentInsetX,
      "--ccxp-lite-spacing-sidebar-experiment-inset-y": TOKENS.spacingSidebarExperimentInsetY,
      "--ccxp-lite-sidebar-row-padding-y": TOKENS.sidebarRowPaddingY,
      "--ccxp-lite-sidebar-row-padding-x": TOKENS.sidebarRowPaddingX,
      "--ccxp-lite-sidebar-row-gap": TOKENS.sidebarRowGap,
      "--ccxp-lite-sidebar-tree-indent-step": TOKENS.sidebarTreeIndentStep,
      "--ccxp-lite-radius-xs": TOKENS.radiusXs,
      "--ccxp-lite-radius-sm": TOKENS.radiusSm,
      "--ccxp-lite-radius-input": TOKENS.radiusInput,
      "--ccxp-lite-radius-md": TOKENS.radiusMd,
      "--ccxp-lite-radius-lg": TOKENS.radiusLg,
      "--ccxp-lite-radius-brand": TOKENS.radiusBrand,
      "--ccxp-lite-radius-full": TOKENS.radiusFull,
      "--ccxp-lite-font-sans": TOKENS.fontSans,
      "--ccxp-lite-font-brand": TOKENS.fontBrand,
      "--ccxp-lite-font-weight-regular": TOKENS.fontWeightRegular,
      "--ccxp-lite-font-weight-strong": TOKENS.fontWeightStrong,
      "--ccxp-lite-font-weight-heavy": TOKENS.fontWeightHeavy,
      "--ccxp-lite-font-variant-numeric-tabular": TOKENS.fontVariantNumericTabular,
      "--ccxp-lite-font-size-caption": TOKENS.fontSizeCaption,
      "--ccxp-lite-font-size-nav": TOKENS.fontSizeNav,
      "--ccxp-lite-font-size-utility": TOKENS.fontSizeUtility,
      "--ccxp-lite-font-size-body": TOKENS.fontSizeBody,
      "--ccxp-lite-font-size-sidebar-brand": TOKENS.fontSizeSidebarBrand,
      "--ccxp-lite-size-sidebar-brand-logo": TOKENS.sizeSidebarBrandLogo,
      "--ccxp-lite-size-sidebar-category-leading": TOKENS.sizeSidebarCategoryLeading,
      "--ccxp-lite-size-sidebar-control": TOKENS.sizeSidebarControl,
      "--ccxp-lite-size-sidebar-guide-line": TOKENS.sizeSidebarGuideLine,
      "--ccxp-lite-size-sidebar-search-spacer": TOKENS.sizeSidebarSearchSpacer,
      "--ccxp-lite-size-sidebar-search-width": TOKENS.sizeSidebarSearchWidth,
      "--ccxp-lite-spacing-sidebar-brand-word-gap": TOKENS.spacingSidebarBrandWordGap,
      "--ccxp-lite-size-sidebar-header-divider-width": TOKENS.sizeSidebarHeaderDividerWidth,
      "--ccxp-lite-size-sidebar-header-divider-height": TOKENS.sizeSidebarHeaderDividerHeight,
      "--ccxp-lite-size-sidebar-search-icon": TOKENS.sizeSidebarSearchIcon,
      "--ccxp-lite-size-sidebar-experiment-switch": TOKENS.sizeSidebarExperimentSwitch,
      "--ccxp-lite-size-sidebar-experiment-switch-expanded":
        TOKENS.sizeSidebarExperimentSwitchExpanded,
      "--ccxp-lite-size-landing-brand-logo": TOKENS.sizeLandingBrandLogo,
      "--ccxp-lite-size-landing-header-height": TOKENS.sizeLandingHeaderHeight,
      "--ccxp-lite-size-form-control-width": TOKENS.sizeFormControlWidth,
      "--ccxp-lite-size-login-control-height": TOKENS.sizeLoginControlHeight,
      "--ccxp-lite-size-password-toggle-offset": TOKENS.sizePasswordToggleOffset,
      "--ccxp-lite-size-icon-button-sm": TOKENS.sizeIconButtonSm,
      "--ccxp-lite-size-icon-button-md": TOKENS.sizeIconButtonMd,
      "--ccxp-lite-size-sidebar-section-icon": TOKENS.sizeSidebarSectionIcon,
      "--ccxp-lite-size-sidebar-category-card-icon": TOKENS.sizeSidebarCategoryCardIcon,
      "--ccxp-lite-size-control-min-width": TOKENS.sizeControlMinWidth,
      "--ccxp-lite-size-control-height-sm": TOKENS.sizeControlHeightSm,
      "--ccxp-lite-size-control-height-md": TOKENS.sizeControlHeightMd,
      "--ccxp-lite-size-sidebar-section-card-min-height": TOKENS.sizeSidebarSectionCardMinHeight,
      "--ccxp-lite-size-sidebar-category-card-min-height": TOKENS.sizeSidebarCategoryCardMinHeight,
      "--ccxp-lite-size-sidebar-destination-frame-offset": TOKENS.sizeSidebarDestinationFrameOffset,
      "--ccxp-lite-size-announcement-divider": TOKENS.sizeAnnouncementDivider,
      "--ccxp-lite-font-size-page-title": TOKENS.fontSizePageTitle,
      "--ccxp-lite-font-size-display": TOKENS.fontSizeDisplay,
      "--ccxp-lite-font-size-section-title": TOKENS.fontSizeSectionTitle,
      "--ccxp-lite-font-size-chip": TOKENS.fontSizeChip,
      "--ccxp-lite-sidebar-width": TOKENS.sidebarWidth,
      "--ccxp-lite-landing-max-width": TOKENS.landingMaxWidth,
      "--ccxp-lite-type-display":
        "var(--ccxp-lite-font-weight-heavy) var(--ccxp-lite-font-size-display)/1.1 var(--ccxp-lite-font-sans)",
      "--ccxp-lite-type-display-color": "var(--ccxp-lite-text)",
      "--ccxp-lite-type-page-title":
        "var(--ccxp-lite-font-weight-strong) var(--ccxp-lite-font-size-page-title)/1.2 var(--ccxp-lite-font-sans)",
      "--ccxp-lite-type-page-title-color": "var(--ccxp-lite-text)",
      "--ccxp-lite-type-primary-link": "var(--ccxp-lite-type-body-strong)",
      "--ccxp-lite-type-primary-link-color": "var(--ccxp-lite-primary)",
      "--ccxp-lite-type-info": "var(--ccxp-lite-type-body-strong)",
      "--ccxp-lite-type-info-color": "var(--ccxp-lite-legacy-blue-text)",
      "--ccxp-lite-type-danger": "var(--ccxp-lite-type-body-strong)",
      "--ccxp-lite-type-danger-color": "var(--ccxp-lite-legacy-red-text)",
      "--ccxp-lite-type-body-strong":
        "var(--ccxp-lite-font-weight-strong) var(--ccxp-lite-font-size-body)/1.55 var(--ccxp-lite-font-sans)",
      "--ccxp-lite-type-body-strong-color": "var(--ccxp-lite-text)",
      "--ccxp-lite-type-body":
        "var(--ccxp-lite-font-weight-regular) var(--ccxp-lite-font-size-body)/1.55 var(--ccxp-lite-font-sans)",
      "--ccxp-lite-type-body-color": "var(--ccxp-lite-text)",
      "--ccxp-lite-type-body-muted":
        "var(--ccxp-lite-font-weight-regular) var(--ccxp-lite-font-size-body)/1.55 var(--ccxp-lite-font-sans)",
      "--ccxp-lite-type-body-muted-color": "var(--ccxp-lite-text-muted)",
      "--ccxp-lite-type-utility":
        "var(--ccxp-lite-font-weight-strong) var(--ccxp-lite-font-size-utility)/1.4 var(--ccxp-lite-font-sans)",
      "--ccxp-lite-type-utility-color": "var(--ccxp-lite-primary)",
      "--ccxp-lite-type-nav": "var(--ccxp-lite-type-utility)",
      "--ccxp-lite-type-nav-color": "var(--ccxp-lite-primary)",
      "--ccxp-lite-type-caption": "var(--ccxp-lite-type-utility)",
      "--ccxp-lite-type-caption-color": "var(--ccxp-lite-text-muted)",
      "--ccxp-lite-type-section-label": "var(--ccxp-lite-type-utility)",
      "--ccxp-lite-type-section-label-color": "var(--ccxp-lite-primary)",
    };
  }

  function applyCssVariables(
    targetElement: HTMLElement,
    variables: Readonly<Record<string, string>>,
  ) {
    for (const [name, value] of Object.entries(variables)) {
      targetElement.style.setProperty(name, value);
    }
  }
  namespace.sharedTheme = {
    ensureThemeDocument,
  };
})(globalThis);
