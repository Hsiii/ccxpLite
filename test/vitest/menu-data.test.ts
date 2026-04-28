import { describe, expect, test } from "vitest";

import { createTestWindow, loadModules, menuModulePaths } from "./helpers/module-loader.js";

function createSidebarTreeDocument() {
  return `
    <!doctype html>
    <html>
      <body>
        <script>
          foldersTree = gFld("root", "");
          aux0 = insFld(foldersTree, gFld("課程、成績 Courses, transcript", ""));
          insDoc(aux0, gLnk(0, "學期成績", "/grades?sid=1&keep=yes"));
          aux1 = insFld(foldersTree, gFld("校內其他系統", ""));
          insDoc(aux1, gLnk(1, "外部系統", "/ccxp/INQUIRE/PE/1/14D/report"));
        </script>
      </body>
    </html>
  `;
}

describe("sidebar data", () => {
  test("parses the legacy tree script and categorizes links", () => {
    const { window } = createTestWindow(createSidebarTreeDocument());
    loadModules(window, menuModulePaths);

    const root = window.CCXP_LITE.sidebarData.parseSidebarTree(window.document);
    const model = window.CCXP_LITE.sidebarData.buildSidebarModel(root, window.document);

    expect(root.children).toHaveLength(2);
    expect(model.categories.map((category: { label: string }) => category.label)).toContain(
      "課程成績",
    );
    expect(model.categories.map((category: { label: string }) => category.label)).toContain(
      "校園系統",
    );
    expect(model.categories[0].sections[0].directLinks[0].label).toBe("學期成績");
  });

  test("filters favorites and categories by normalized search text", () => {
    const { window } = createTestWindow();
    loadModules(window, menuModulePaths);

    const category = {
      id: "category-courses",
      label: "Courses & Grades",
      kind: "category",
      directLinks: [],
      sections: [
        {
          id: "section-academic",
          label: "Academic",
          kind: "group",
          directLinks: [{ id: "grades", label: "Semester Grades" }],
          sections: [],
        },
      ],
    };

    expect(
      window.CCXP_LITE.sidebarData.filterFavoriteLinks(
        [
          { id: "grades", label: "Semester Grades" },
          { id: "calendar", label: "Calendar" },
        ],
        "  semester   grades ",
      ),
    ).toHaveLength(1);

    expect(window.CCXP_LITE.sidebarData.filterCategories([category], "semester")[0].id).toBe(
      "category-courses",
    );
    expect(window.CCXP_LITE.sidebarData.filterCategoryTree(category, "missing")).toBeNull();
    expect(window.CCXP_LITE.sidebarData.countLinksInTree(category)).toBe(1);
  });
});
