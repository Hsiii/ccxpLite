function getTextContent(node: Element | null): string {
  return node?.textContent.replaceAll(/\s+/g, " ").trim() ?? "";
}

export function summarizeLoginSurface(root: ParentNode): {
  hasLandingShell: boolean;
  hasPasswordToggle: boolean;
  hasAccountGuide: boolean;
  hasAnnouncementTable: boolean;
  accountGuideItemCount: number;
  supportLinkCount: number;
  announcementRowCount: number;
  title: string;
  supportLinkLabels: string[];
} {
  const landingShell = root.querySelector(".ccxp-lite-landing-shell");
  const supportLinks = [...root.querySelectorAll(".ccxp-lite-landing-service-link")];
  const announcementRows = [...root.querySelectorAll(".ccxp-lite-announcement-row")];
  const accountGuideItems = [...root.querySelectorAll(".ccxp-lite-account-guide-account-item")];

  return {
    hasLandingShell: landingShell !== null,
    hasPasswordToggle: root.querySelector(".ccxp-lite-password-toggle") !== null,
    hasAccountGuide: root.querySelector(".ccxp-lite-account-guide") !== null,
    hasAnnouncementTable: root.querySelector(".ccxp-lite-announcement-table") !== null,
    accountGuideItemCount: accountGuideItems.length,
    supportLinkCount: supportLinks.length,
    announcementRowCount: announcementRows.length,
    title: getTextContent(root.querySelector(".ccxp-lite-account-guide-title")),
    supportLinkLabels: supportLinks.map((link) => getTextContent(link)),
  };
}

export function summarizeSidebarSurface(document: Document): {
  variant: string;
  hasVariantSwitch: boolean;
  hasDashboard: boolean;
  hasClassicList: boolean;
  searchValue: string;
  emptyTitle: string;
  pinnedLinkCount: number;
  rowItemCount: number;
  destinationState: "idle" | "loading" | "success" | "error";
} {
  const loading = document.querySelector<HTMLElement>(".ccxp-lite-destination-loading");
  const frame = document.querySelector<HTMLElement>(".ccxp-lite-destination-frame");
  const error = document.querySelector<HTMLElement>(".ccxp-lite-destination-error");

  let destinationState: "idle" | "loading" | "success" | "error" = "idle";
  if (loading && !loading.hidden) {
    destinationState = "loading";
  } else if (error && !error.hidden) {
    destinationState = "error";
  } else if (frame && !frame.hidden) {
    destinationState = "success";
  }

  return {
    variant: document.body.dataset.ccxpLiteSidebarVariant ?? "",
    hasVariantSwitch: document.querySelector("[data-ccxp-lite-sidebar-lab-switch]") !== null,
    hasDashboard: document.querySelector(".ccxp-lite-dashboard") !== null,
    hasClassicList: document.querySelector(".ccxp-lite-sidebar-list") !== null,
    searchValue:
      document.querySelector<HTMLInputElement>(".ccxp-lite-sidebar-search-input")?.value ?? "",
    emptyTitle: getTextContent(document.querySelector(".ccxp-lite-empty-title")),
    pinnedLinkCount: document.querySelectorAll(".ccxp-lite-pane-pinned .ccxp-lite-link-card")
      .length,
    rowItemCount: document.querySelectorAll(".ccxp-lite-row-button.ccxp-lite-item").length,
    destinationState,
  };
}
