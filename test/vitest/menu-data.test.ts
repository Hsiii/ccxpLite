import { describe, expect, test } from "vitest";

import {
  createTestWindow,
  loadModules,
  menuModulePaths,
  requireValue,
} from "./helpers/module-loader.js";

function createSidebarTreeDocument() {
  return `
    <!doctype html>
    <html>
      <body>
        <script>
          foldersTree = gFld("root", "");
          aux0 = insFld(foldersTree, gFld("\u8AB2\u7A0B\u3001\u6210\u7E3E Courses, transcript", ""));
          insDoc(aux0, gLnk(0, "\u5B78\u671F\u6210\u7E3E", "/grades?sid=1&keep=yes"));
          insDoc(foldersTree, gLnk(0, "\u5B78\u5206&\u62B5\u514D\u5B78\u5206", "/credits"));
          aux1 = insFld(foldersTree, gFld("\u6821\u5167\u5176\u4ED6\u7CFB\u7D71", ""));
          insDoc(aux1, gLnk(1, "\u5916\u90E8\u7CFB\u7D71", "/ccxp/INQUIRE/PE/1/14D/report"));
        </script>
      </body>
    </html>
  `;
}

describe("sidebar data", () => {
  test("parses the legacy tree script and categorizes links", () => {
    const { window } = createTestWindow(createSidebarTreeDocument());
    loadModules(window, menuModulePaths);

    const sidebarData = requireValue(window.CCXP_LITE.sidebarData, "sidebarData");
    const shared = requireValue(window.CCXP_LITE.shared, "shared");
    const root = requireValue(sidebarData.parseSidebarTree(window.document), "parsed sidebar tree");
    const model = sidebarData.buildSidebarModel(root, window.document, shared.STRINGS);

    expect(root.children).toHaveLength(3);
    expect(model.categories.map((category: { label: string }) => category.label)).toContain(
      "\u8AB2\u7A0B\u6210\u7E3E",
    );
    expect(model.categories.map((category: { label: string }) => category.label)).toContain(
      "\u6821\u5712\u7CFB\u7D71",
    );
    expect(model.categories[0].sections[0].label).toBe("\u4E3B\u8981\u529F\u80FD");
    expect(model.categories[0].sections[0].directLinks[0].label).toBe(
      "\u5B78\u5206&\u62B5\u514D\u5B78\u5206",
    );
    expect(model.categories[0].sections[1].directLinks[0].label).toBe("\u5B78\u671F\u6210\u7E3E");
  });

  test("filters favorites and categories by normalized search text", () => {
    const { window } = createTestWindow();
    loadModules(window, menuModulePaths);
    const sidebarData = requireValue(window.CCXP_LITE.sidebarData, "sidebarData");

    const category: CcxpLiteSidebarCategoryNode = {
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
      sidebarData.filterFavoriteLinks(
        [
          { id: "grades", label: "Semester Grades" },
          { id: "calendar", label: "Calendar" },
        ],
        "  semester   grades ",
      ),
    ).toHaveLength(1);

    expect(sidebarData.filterCategories([category], "semester")[0]?.id).toBe("category-courses");
    expect(sidebarData.filterCategoryTree(category, "missing")).toBeUndefined();
    expect(sidebarData.countLinksInTree(category)).toBe(1);
  });
});
