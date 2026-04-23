(function registerCcxpLiteSharedTheme(globalScope) {
  const namespace = globalScope.CCXP_LITE || (globalScope.CCXP_LITE = {});
  const { sharedConstants } = namespace;

  if (!sharedConstants) {
    return;
  }

  const { TOKENS } = sharedConstants;

  function ensureThemeDocument(targetDocument, scope) {
    if (!targetDocument || !targetDocument.documentElement) {
      return;
    }

    const root = targetDocument.documentElement;
    root.dataset.ccxpLiteThemeScope = scope;

    if (root.dataset.ccxpLiteThemeApplied === "true") {
      return;
    }

    applyCssVariables(root, buildCssVariables());
    root.dataset.ccxpLiteThemeApplied = "true";
  }

  function buildCssVariables() {
    return {
      "--ccxp-lite-color-primary": TOKENS.colorPrimary,
      "--ccxp-lite-color-accent": TOKENS.colorAccent,
      "--ccxp-lite-color-brand": TOKENS.colorBrand,
      "--ccxp-lite-color-legacy-blue-text": TOKENS.colorLegacyBlueText,
      "--ccxp-lite-color-legacy-red-text": TOKENS.colorLegacyRedText,
      "--ccxp-lite-color-bg": TOKENS.colorBg,
      "--ccxp-lite-color-surface": TOKENS.colorSurface,
      "--ccxp-lite-color-sidebar-surface": TOKENS.colorSidebarSurface,
      "--ccxp-lite-color-surface-muted": TOKENS.colorSurfaceMuted,
      "--ccxp-lite-color-border": TOKENS.colorBorder,
      "--ccxp-lite-color-sidebar-divider": TOKENS.colorSidebarDivider,
      "--ccxp-lite-color-sidebar-search-surface": TOKENS.colorSidebarSearchSurface,
      "--ccxp-lite-color-sidebar-search-gradient-start": TOKENS.colorSidebarSearchGradientStart,
      "--ccxp-lite-color-sidebar-search-border": TOKENS.colorSidebarSearchBorder,
      "--ccxp-lite-color-primary-focus-border": TOKENS.colorPrimaryFocusBorder,
      "--ccxp-lite-color-primary-focus-ring": TOKENS.colorPrimaryFocusRing,
      "--ccxp-lite-color-primary-hover-surface": TOKENS.colorPrimaryHoverSurface,
      "--ccxp-lite-color-primary-muted-surface": TOKENS.colorPrimaryMutedSurface,
      "--ccxp-lite-color-primary-glow": TOKENS.colorPrimaryGlow,
      "--ccxp-lite-color-sidebar-search-placeholder": TOKENS.colorSidebarSearchPlaceholder,
      "--ccxp-lite-color-text": TOKENS.colorText,
      "--ccxp-lite-color-text-muted": TOKENS.colorTextMuted,
      "--ccxp-lite-color-transparent": TOKENS.colorTransparent,
      "--ccxp-lite-color-skeleton-surface-end-tint": TOKENS.colorSkeletonSurfaceEndTint,
      "--ccxp-lite-color-skeleton-highlight-start": TOKENS.colorSkeletonHighlightStart,
      "--ccxp-lite-color-skeleton-highlight-soft": TOKENS.colorSkeletonHighlightSoft,
      "--ccxp-lite-color-skeleton-highlight-strong": TOKENS.colorSkeletonHighlightStrong,
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
      "--ccxp-lite-sidebar-row-padding-y": TOKENS.sidebarRowPaddingY,
      "--ccxp-lite-sidebar-row-padding-x": TOKENS.sidebarRowPaddingX,
      "--ccxp-lite-sidebar-row-gap": TOKENS.sidebarRowGap,
      "--ccxp-lite-sidebar-tree-indent-step": TOKENS.sidebarTreeIndentStep,
      "--ccxp-lite-radius-sm": TOKENS.radiusSm,
      "--ccxp-lite-radius-md": TOKENS.radiusMd,
      "--ccxp-lite-radius-lg": TOKENS.radiusLg,
      "--ccxp-lite-radius-xs": TOKENS.radiusXs,
      "--ccxp-lite-radius-input": TOKENS.radiusInput,
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
      "--ccxp-lite-size-landing-brand-logo": TOKENS.sizeLandingBrandLogo,
      "--ccxp-lite-size-landing-header-height": TOKENS.sizeLandingHeaderHeight,
      "--ccxp-lite-size-form-control-width": TOKENS.sizeFormControlWidth,
      "--ccxp-lite-size-password-toggle-offset": TOKENS.sizePasswordToggleOffset,
      "--ccxp-lite-size-icon-button-sm": TOKENS.sizeIconButtonSm,
      "--ccxp-lite-size-icon-button-md": TOKENS.sizeIconButtonMd,
      "--ccxp-lite-size-sidebar-section-icon": TOKENS.sizeSidebarSectionIcon,
      "--ccxp-lite-size-control-min-width": TOKENS.sizeControlMinWidth,
      "--ccxp-lite-size-control-height-sm": TOKENS.sizeControlHeightSm,
      "--ccxp-lite-size-control-height-md": TOKENS.sizeControlHeightMd,
      "--ccxp-lite-size-sidebar-section-card-min-height": TOKENS.sizeSidebarSectionCardMinHeight,
      "--ccxp-lite-size-sidebar-destination-frame-offset": TOKENS.sizeSidebarDestinationFrameOffset,
      "--ccxp-lite-size-announcement-divider": TOKENS.sizeAnnouncementDivider,
      "--ccxp-lite-font-size-page-title": TOKENS.fontSizePageTitle,
      "--ccxp-lite-font-size-display": TOKENS.fontSizeDisplay,
      "--ccxp-lite-font-size-section-title": TOKENS.fontSizeSectionTitle,
      "--ccxp-lite-font-size-chip": TOKENS.fontSizeChip,
      "--ccxp-lite-landing-max-width": TOKENS.landingMaxWidth,
      "--ccxp-lite-sidebar-width": TOKENS.sidebarWidth,
    };
  }

  function applyCssVariables(targetElement, variables) {
    Object.entries(variables).forEach(([property, value]) => {
      targetElement.style.setProperty(property, value);
    });
  }

  namespace.sharedTheme = {
    ensureThemeDocument,
  };
})(window);
