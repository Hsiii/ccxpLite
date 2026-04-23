(function registerCcxpLiteShared(globalScope) {
  const namespace = globalScope.CCXP_LITE || (globalScope.CCXP_LITE = {});

  const TOKENS = {
    colorPrimary: "rgb(121, 36, 133)",
    colorAccent: "#d5dbe1",
    colorBrand: "rgb(121, 36, 133)",
    colorLegacyBlueText: "#2e4978",
    colorLegacyRedText: "#b85c68",
    colorBg: "#ffffff",
    colorSurface: "#ffffff",
    colorSidebarSurface: "#f5f7f9",
    colorSurfaceMuted: "#f5f7f9",
    colorBorder: "rgba(31, 41, 51, 0.12)",
    colorSidebarDivider: "rgba(31, 41, 51, 0.16)",
    colorSidebarSearchSurface: "rgba(255, 255, 255, 0.9)",
    colorSidebarSearchGradientStart: "rgba(255, 255, 255, 0.98)",
    colorSidebarSearchBorder: "rgba(31, 41, 51, 0.1)",
    colorPrimaryFocusBorder: "rgba(121, 36, 133, 0.28)",
    colorPrimaryFocusRing: "rgba(121, 36, 133, 0.08)",
    colorPrimaryHoverSurface: "rgba(124, 45, 146, 0.06)",
    colorPrimaryMutedSurface: "rgba(124, 45, 146, 0.04)",
    colorPrimaryGlow: "rgba(121, 36, 133, 0.18)",
    colorSidebarSearchPlaceholder: "#6b7280",
    colorText: "#111827",
    colorTextMuted: "#52606d",
    colorTransparent: "transparent",
    colorSkeletonSurfaceEndTint: "#eef2f6",
    colorSkeletonHighlightStart: "rgba(255, 255, 255, 0)",
    colorSkeletonHighlightSoft: "rgba(255, 255, 255, 0.3)",
    colorSkeletonHighlightStrong: "rgba(255, 255, 255, 0.88)",
    spacingXs: "6px",
    spacingSm: "10px",
    spacingMd: "16px",
    spacingLg: "24px",
    spacingXl: "32px",
    spacing2xs: "4px",
    spacing3xs: "2px",
    spacingInlineSm: "8px",
    spacingInsetSm: "12px",
    spacingInsetMd: "14px",
    spacingInsetLg: "18px",
    spacingBrandInline: "12px",
    spacingSidebarSearchInset: "12px",
    sidebarRowPaddingY: "12px",
    sidebarRowPaddingX: "10px",
    sidebarRowGap: "6px",
    sidebarTreeIndentStep: "1em",
    radiusSm: "10px",
    radiusMd: "14px",
    radiusLg: "20px",
    radiusXs: "6px",
    radiusInput: "8px",
    radiusBrand: "12px",
    radiusFull: "999px",
    fontSans: '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif',
    fontBrand: '"Futura", "Futura PT", "Avenir Next", sans-serif',
    fontWeightRegular: "400",
    fontWeightStrong: "700",
    fontWeightHeavy: "800",
    fontVariantNumericTabular: "tabular-nums",
    fontSizeCaption: "14px",
    fontSizeNav: "14px",
    fontSizeUtility: "14px",
    fontSizeBody: "16px",
    fontSizeSidebarBrand: "20px",
    sizeSidebarBrandLogo: "30px",
    sizeSidebarCategoryLeading: "1.5em",
    sizeSidebarControl: "20px",
    sizeSidebarGuideLine: "2px",
    sizeSidebarSearchSpacer: "14px",
    spacingSidebarBrandWordGap: "0.5ch",
    sizeSidebarHeaderDividerWidth: "100%",
    sizeSidebarHeaderDividerHeight: "1px",
    sizeSidebarSearchIcon: "20px",
    sizeLandingBrandLogo: "32px",
    sizeLandingHeaderHeight: "64px",
    sizeFormControlWidth: "320px",
    sizePasswordToggleOffset: "44px",
    sizeIconButtonSm: "24px",
    sizeIconButtonMd: "36px",
    sizeControlMinWidth: "112px",
    sizeControlHeightSm: "38px",
    sizeControlHeightMd: "44px",
    sizeAnnouncementDivider: "18px",
    fontSizePageTitle: "26px",
    fontSizeDisplay: "30px",
    fontSizeSectionTitle: "18px",
    fontSizeChip: "13px",
    landingMaxWidth: "960px",
    sidebarWidth: "288px",
    sidebarClass: "ccxp-lite-sidebar-shell",
    mainClass: "ccxp-lite-main-skin",
    landingClass: "ccxp-lite-landing-shell",
  };

  const LOCALIZED_STRINGS = {
    en: {
      sidebarTitle: "NTHU AIS",
      landingTitle: "NTHU AIS Login",
      loginTitle: "Login",
      emptyGroup: "No items available in this section",
      servicePhone: "Service Phone",
      cannotLogin: "Can't log in?",
      externalLinksLabel: "External links",
      portalSectionsLabel: "Portal sections",
      sidebarSearchPlaceholder: "Search menu",
      sidebarSearchNoResults: "No matching items",
      sidebarCategoryFavorites: "Favorite",
      sidebarFavoritesEmpty: "Press star at any function to save it here",
      sidebarAddFavorite: "Add to favorites",
      sidebarRemoveFavorite: "Remove from favorites",
      announcementDate: "Date",
      announcementTopic: "Topic",
      playVerificationAudio: "Play verification audio",
      showPassword: "Show password",
      hidePassword: "Hide password",
      fieldAccount: "Account",
      fieldPassword: "Password",
      fieldVerificationCode: "Verification Code",
      fieldStudentId: "Student ID",
      fieldGeneric: "Field",
      sidebarCategoryProfile: "Personal Info",
      sidebarCategoryPlanningAndEnrollment: "Planning & Enrollment",
      sidebarCategoryCoursesAndGrades: "Courses & Grades",
      sidebarCategoryTeachingFeedback: "Teaching Feedback",
      sidebarCategoryStatusChanges: "Status Changes",
      sidebarCategoryGraduationAndDefense: "Graduation & Defense",
      sidebarCategoryPaymentsAndAid: "Payments & Aid",
      sidebarCategoryHousingAndLife: "Housing & Life",
      sidebarCategoryForms: "Forms",
      sidebarCategoryCampusSystems: "Campus Systems",
      sidebarCategoryAnnouncementsAndVoting: "Notices & Voting",
      sidebarPinned: "Pinned",
      sidebarPinnedAlt: "Pinned items",
      sidebarAll: "All",
      sidebarAllAlt: "All functions",
      sidebarBack: "Back",
      sidebarGridView: "Grid view",
      sidebarListView: "List view",
      sidebarResetHome: "Go to home",
      sidebarGitHubLink: "ccxpLite",
      sidebarFavoritesEmptyTitle: "No pinned items yet",
      sidebarFavoritesEmptyBody: "Star any function card to keep it here for quick access.",
      sidebarSearchEmptyTitle: "No matching items",
      sidebarSearchEmptyBody: "Try another keyword or go back to browse categories.",
      sidebarSectionEmptyTitle: "Nothing to show here",
      sidebarSectionEmptyBody: "This section currently has no available items.",
      sidebarDestinationLoading: "Loading page",
      sidebarDestinationErrorTitle: "Page failed to load",
      sidebarDestinationErrorBody: "Try reloading this page or open it in a new tab.",
      sidebarRetry: "Retry",
      sidebarOpenInNewTab: "Open in new tab",
    },
    zh: {
      sidebarTitle: "校務資訊系統",
      landingTitle: "校務資訊系統登入",
      loginTitle: "登入",
      emptyGroup: "此分類暫無可顯示項目",
      servicePhone: "服務電話",
      cannotLogin: "無法登入",
      externalLinksLabel: "外部連結",
      portalSectionsLabel: "入口分區",
      sidebarSearchPlaceholder: "搜尋功能",
      sidebarSearchNoResults: "找不到符合項目",
      sidebarCategoryFavorites: "常用功能",
      sidebarFavoritesEmpty: "按下任意功能旁的星號以儲存",
      sidebarAddFavorite: "加入常用功能",
      sidebarRemoveFavorite: "移除常用功能",
      announcementDate: "日期",
      announcementTopic: "新聞主題",
      playVerificationAudio: "播放驗證碼語音",
      showPassword: "顯示密碼",
      hidePassword: "隱藏密碼",
      fieldAccount: "帳號",
      fieldPassword: "密碼",
      fieldVerificationCode: "驗證碼",
      fieldStudentId: "學號",
      fieldGeneric: "欄位",
      sidebarCategoryProfile: "個人資料",
      sidebarCategoryPlanningAndEnrollment: "預排與選課",
      sidebarCategoryCoursesAndGrades: "課程成績",
      sidebarCategoryTeachingFeedback: "教學意見",
      sidebarCategoryStatusChanges: "學籍異動",
      sidebarCategoryGraduationAndDefense: "畢業與口試",
      sidebarCategoryPaymentsAndAid: "繳費與補助",
      sidebarCategoryHousingAndLife: "住宿與生活",
      sidebarCategoryForms: "表單系統",
      sidebarCategoryCampusSystems: "校園系統",
      sidebarCategoryAnnouncementsAndVoting: "公告與投票",
      sidebarPinned: "已釘選",
      sidebarPinnedAlt: "已釘選功能",
      sidebarAll: "所有功能",
      sidebarAllAlt: "所有功能",
      sidebarBack: "返回",
      sidebarGridView: "格狀檢視",
      sidebarListView: "列表檢視",
      sidebarResetHome: "回到首頁",
      sidebarGitHubLink: "ccxpLite",
      sidebarFavoritesEmptyTitle: "尚未釘選功能",
      sidebarFavoritesEmptyBody: "在任一功能卡按下星號，即可將它固定在這裡。",
      sidebarSearchEmptyTitle: "找不到符合項目",
      sidebarSearchEmptyBody: "試試其他關鍵字，或返回上一層瀏覽分類。",
      sidebarSectionEmptyTitle: "目前沒有可顯示內容",
      sidebarSectionEmptyBody: "這個區塊目前沒有可用項目。",
      sidebarDestinationLoading: "頁面載入中",
      sidebarDestinationErrorTitle: "頁面載入失敗",
      sidebarDestinationErrorBody: "可以重新嘗試載入，或改用新分頁開啟。",
      sidebarRetry: "重試",
      sidebarOpenInNewTab: "新分頁開啟",
    },
  };

  const STRINGS = LOCALIZED_STRINGS.zh;

  const SIDEBAR_CATEGORIES = [
    {
      id: "profile",
      labelKey: "sidebarCategoryProfile",
      fallbackLabel: "個人資料",
      icon: "circle-user-round",
      itemLabels: ["帳號相關維護", "個人資料維護", "導師聯繫資料", "原住民資料系統"],
    },
    {
      id: "planning-and-enrollment",
      labelKey: "sidebarCategoryPlanningAndEnrollment",
      fallbackLabel: "預排與選課",
      icon: "calendar-range",
      itemLabels: [
        "預排系統 Tentative schedule",
        "選課 Select courses",
        "校際/跨系統選修",
        "暑修 Summer courses",
      ],
    },
    {
      id: "courses-and-grades",
      labelKey: "sidebarCategoryCoursesAndGrades",
      fallbackLabel: "課程成績",
      icon: "notepad-text",
      itemLabels: ["課程、成績 Courses, transcript", "學分&抵免學分"],
    },
    {
      id: "teaching-feedback",
      labelKey: "sidebarCategoryTeachingFeedback",
      fallbackLabel: "教學意見",
      icon: "message-square-more",
      itemLabels: ["教學意見 Comments about courses", "傑出教學教師票選", "教學助理評量問卷"],
    },
    {
      id: "status-changes",
      labelKey: "sidebarCategoryStatusChanges",
      fallbackLabel: "學籍異動",
      icon: "refresh-cw",
      itemLabels: ["申請復學", "保留生申請入學", "轉系所申請", "兵役業務"],
    },
    {
      id: "graduation-and-defense",
      labelKey: "sidebarCategoryGraduationAndDefense",
      fallbackLabel: "畢業與口試",
      icon: "graduation-cap",
      itemLabels: ["畢業審查", "研究生學位考試", "畢業生離校系統", "數位學位證書", "袍服借用申請"],
    },
    {
      id: "payments-and-aid",
      labelKey: "sidebarCategoryPaymentsAndAid",
      fallbackLabel: "繳費與補助",
      icon: "dollar-sign",
      itemLabels: [
        "繳費單相關作業(出納組)",
        "退費查詢",
        "所得相關查詢",
        "出納傳票付款查詢",
        "就學貸款",
        "弱勢助學作業",
        "學雜費減免作業",
        "國外差旅費",
      ],
    },
    {
      id: "housing-and-life",
      labelKey: "sidebarCategoryHousingAndLife",
      fallbackLabel: "住宿與生活",
      icon: "house",
      itemLabels: ["外宿資料", "學生宿舍相關", "健康照護系統", "職涯諮詢與評測"],
    },
    {
      id: "forms",
      labelKey: "sidebarCategoryForms",
      fallbackLabel: "表單系統",
      icon: "notebook-pen",
      itemLabels: [
        "學生請假系統",
        "電子表單系統",
        "計畫差勤及臨時工時登錄系統",
        "出國申請與報告繳交系統",
        "校外實習登錄平台",
      ],
    },
    {
      id: "campus-systems",
      labelKey: "sidebarCategoryCampusSystems",
      fallbackLabel: "校園系統",
      icon: "school",
      itemLabels: ["學習平台", "計通中心相關服務", "研發處資訊系統", "校內其他系統", "明燈平台"],
    },
    {
      id: "announcements-and-voting",
      labelKey: "sidebarCategoryAnnouncementsAndVoting",
      fallbackLabel: "公告與投票",
      icon: "megaphone",
      itemLabels: [
        "會議紀錄",
        "校內業務公告",
        "線上投票系統",
        "線上投票系統(特殊投票)",
        "校園通報網",
      ],
    },
  ];

  const ASSETS = {
    brandLogoPath: "assets/nthu.jpg",
    sidebarBrandLogoPath: "assets/nthu.png",
    stylesheetPath: "content.css",
  };

  function ensureThemeDocument(targetDocument, scope) {
    if (!targetDocument || !targetDocument.head || !targetDocument.documentElement) {
      return false;
    }

    targetDocument.documentElement.dataset.ccxpLiteScope = scope;

    if (!targetDocument.head.querySelector("[data-ccxp-lite-stylesheet='true']")) {
      const link = targetDocument.createElement("link");
      link.rel = "stylesheet";
      link.href = chrome.runtime.getURL(ASSETS.stylesheetPath);
      link.dataset.ccxpLiteStylesheet = "true";
      targetDocument.head.appendChild(link);
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
      "--ccxp-lite-primary-muted-surface": TOKENS.colorPrimaryMutedSurface,
      "--ccxp-lite-primary-glow": TOKENS.colorPrimaryGlow,
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
      "--ccxp-lite-size-control-min-width": TOKENS.sizeControlMinWidth,
      "--ccxp-lite-size-control-height-sm": TOKENS.sizeControlHeightSm,
      "--ccxp-lite-size-control-height-md": TOKENS.sizeControlHeightMd,
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

  function applyCssVariables(targetElement, variables) {
    Object.entries(variables).forEach(([name, value]) => {
      targetElement.style.setProperty(name, value);
    });
  }

  function normalizeLocale(locale) {
    const normalized = String(locale || "").toLowerCase();

    if (normalized.startsWith("en")) {
      return "en";
    }

    if (normalized.startsWith("zh") || normalized.startsWith("ch")) {
      return "zh";
    }

    return "zh";
  }

  function resolveLocaleFromDocument(targetDocument) {
    if (!targetDocument || !targetDocument.documentElement) {
      return "zh";
    }

    return normalizeLocale(targetDocument.documentElement.lang);
  }

  function getLocalizedStrings(locale) {
    return LOCALIZED_STRINGS[normalizeLocale(locale)] || LOCALIZED_STRINGS.zh;
  }

  function createBrandImage(targetDocument, className, assetPath = ASSETS.brandLogoPath) {
    const image = targetDocument.createElement("img");
    image.className = className;
    image.alt = getLocalizedStrings(resolveLocaleFromDocument(targetDocument)).sidebarTitle;
    image.src = chrome.runtime.getURL(assetPath);
    return image;
  }

  function createBrandCopy(targetDocument, containerClassName, titleClassName, title) {
    const copy = targetDocument.createElement("div");
    copy.className = containerClassName;

    const titleNode = targetDocument.createElement("div");
    titleNode.className = titleClassName;

    if (titleClassName === "ccxp-lite-sidebar-brand-title" && title.includes(" ")) {
      title.split(" ").forEach((word) => {
        const wordNode = targetDocument.createElement("span");
        wordNode.textContent = word;
        titleNode.appendChild(wordNode);
      });
    } else {
      titleNode.textContent = title;
    }

    copy.appendChild(titleNode);
    return copy;
  }

  function moveChildNodes(sourceNode, targetNode) {
    while (sourceNode.firstChild) {
      targetNode.appendChild(sourceNode.firstChild);
    }
  }

  function removeNode(node) {
    if (node && node.parentNode) {
      node.parentNode.removeChild(node);
    }
  }

  function isDocumentComplete(targetDocument) {
    return targetDocument.readyState === "complete";
  }

  namespace.shared = {
    TOKENS,
    STRINGS,
    LOCALIZED_STRINGS,
    SIDEBAR_CATEGORIES,
    ASSETS,
    ensureThemeDocument,
    getLocalizedStrings,
    normalizeLocale,
    resolveLocaleFromDocument,
    createBrandImage,
    createBrandCopy,
    moveChildNodes,
    removeNode,
    isDocumentComplete,
  };
})(window);
