export function createSidebarShellHtml(): string {
  return `
    <!doctype html>
    <html lang="zh">
      <head></head>
      <body>
        <div class="ccxp-lite-sidebar-shell">
          <label class="ccxp-lite-sidebar-search">
            <input class="ccxp-lite-sidebar-search-input" type="search" />
          </label>
          <main class="ccxp-lite-sidebar-content"></main>
          <footer class="ccxp-lite-sidebar-footer"></footer>
        </div>
      </body>
    </html>
  `;
}

export function createSidebarModel(): CcxpLiteSidebarModel {
  const gradesLink = {
    id: "grades",
    legacyId: "legacy-grades",
    label: "Semester Grades",
    href: "/grades",
    target: "main",
  };
  const scheduleLink = {
    id: "schedule",
    legacyId: "legacy-schedule",
    label: "Course Schedule",
    href: "/schedule",
    target: "main",
  };
  const externalLink = {
    id: "external",
    legacyId: "legacy-external",
    label: "External Inquiry",
    href: "/ccxp/INQUIRE/PE/1/14D/report",
    target: "main",
  };

  return {
    favorites: {
      id: "category-favorites",
      label: "Favorite",
      icon: "star",
      blocks: [{ id: "favorites-block", label: "", links: [gradesLink], kind: "block" }],
      emptyMessage: "No favorites yet",
      kind: "category",
    },
    categories: [
      {
        id: "category-courses",
        label: "Courses & Grades",
        icon: "notepad-text",
        summary: "Grades \u00B7 Schedule",
        blocks: [
          {
            id: "section-academic",
            label: "Academic",
            links: [gradesLink, scheduleLink],
            kind: "block",
          },
        ],
        emptyMessage: "No items available in this section",
        kind: "category",
      },
      {
        id: "category-campus",
        label: "Campus Systems",
        icon: "school",
        summary: "External",
        blocks: [{ id: "campus-block", label: "External", links: [externalLink], kind: "block" }],
        emptyMessage: "No items available in this section",
        kind: "category",
      },
    ],
  };
}
