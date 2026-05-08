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
    expect(model.categories[0].sections[0].label).toBe("\u5B78\u5206");
    expect(model.categories[0].sections[0].directLinks[0].label).toBe(
      "\u5B78\u5206&\u62B5\u514D\u5B78\u5206",
    );
    expect(model.categories[0].sections[1].directLinks[0].label).toBe("\u5B78\u671F\u6210\u7E3E");
  });

  test("uses the single direct-link label when only one synthetic item exists", () => {
    const { window } = createTestWindow(`
      <!doctype html>
      <html>
        <body>
          <script>
            foldersTree = gFld("root", "");
            aux0 = insFld(foldersTree, gFld("\u6821\u5167\u5176\u4ED6\u7CFB\u7D71", ""));
            insDoc(aux0, gLnk(1, "\u5916\u90E8\u7CFB\u7D71", "/ccxp/INQUIRE/PE/1/14D/report"));
            insDoc(foldersTree, gLnk(0, "\u660E\u71C8\u5E73\u53F0", "/portal"));
          </script>
        </body>
      </html>
    `);
    loadModules(window, menuModulePaths);

    const sidebarData = requireValue(window.CCXP_LITE.sidebarData, "sidebarData");
    const shared = requireValue(window.CCXP_LITE.shared, "shared");
    const root = requireValue(sidebarData.parseSidebarTree(window.document), "parsed sidebar tree");
    const model = sidebarData.buildSidebarModel(root, window.document, shared.STRINGS);
    const campusCategory = model.categories.find(
      (category: { label: string }) => category.label === "\u6821\u5712\u7CFB\u7D71",
    );

    expect(campusCategory?.sections[0]?.label).toBe("\u660E\u71C8\u5E73\u53F0");
  });

  test("combines the strongest keywords when multiple synthetic items share a category", () => {
    const { window } = createTestWindow(`
      <!doctype html>
      <html>
        <body>
          <script>
            foldersTree = gFld("root", "");
            aux0 = insFld(foldersTree, gFld("\u6821\u5167\u5176\u4ED6\u7CFB\u7D71", ""));
            insDoc(aux0, gLnk(1, "\u5916\u90E8\u7CFB\u7D71", "/ccxp/INQUIRE/PE/1/14D/report"));
            insDoc(foldersTree, gLnk(0, "\u5B78\u7FD2\u5E73\u53F0", "/learn"));
            insDoc(foldersTree, gLnk(0, "\u8A08\u901A\u4E2D\u5FC3\u76F8\u95DC\u670D\u52D9", "/cc"));
          </script>
        </body>
      </html>
    `);
    loadModules(window, menuModulePaths);

    const sidebarData = requireValue(window.CCXP_LITE.sidebarData, "sidebarData");
    const shared = requireValue(window.CCXP_LITE.shared, "shared");
    const root = requireValue(sidebarData.parseSidebarTree(window.document), "parsed sidebar tree");
    const model = sidebarData.buildSidebarModel(root, window.document, shared.STRINGS);
    const campusCategory = model.categories.find(
      (category: { label: string }) => category.label === "\u6821\u5712\u7CFB\u7D71",
    );

    expect(campusCategory?.sections[0]?.label).toBe("\u5B78\u7FD2\u8207\u8A08\u901A");
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

  test("keeps unmatched links visible in a fallback category", () => {
    const { window } = createTestWindow(`
      <!doctype html>
      <html>
        <body>
          <script>
            foldersTree = gFld("root", "");
            insDoc(foldersTree, gLnk(0, "\u5168\u65B0\u529F\u80FD\u6E2C\u8A66", "/brand-new"));
          </script>
        </body>
      </html>
    `);
    loadModules(window, menuModulePaths);

    const sidebarData = requireValue(window.CCXP_LITE.sidebarData, "sidebarData");
    const shared = requireValue(window.CCXP_LITE.shared, "shared");
    const root = requireValue(sidebarData.parseSidebarTree(window.document), "parsed sidebar tree");
    const model = sidebarData.buildSidebarModel(root, window.document, shared.STRINGS);

    expect(model.categories).toHaveLength(1);
    expect(model.categories[0].label).toBe("\u65B0\u589E\u8207\u672A\u5206\u985E");
    expect(model.categories[0].sections[0].label).toBe("\u5168\u65B0\u529F\u80FD\u6E2C\u8A66");
    expect(model.categories[0].sections[0].directLinks[0].label).toBe(
      "\u5168\u65B0\u529F\u80FD\u6E2C\u8A66",
    );
  });

  test("keeps unmatched groups visible in a fallback category", () => {
    const { window } = createTestWindow(`
      <!doctype html>
      <html>
        <body>
          <script>
            foldersTree = gFld("root", "");
            aux0 = insFld(foldersTree, gFld("\u7814\u7A76\u5BA4\u5DE5\u5177", ""));
            insDoc(aux0, gLnk(0, "\u5132\u5B58\u7A7A\u9593\u7533\u8ACB", "/lab-storage"));
          </script>
        </body>
      </html>
    `);
    loadModules(window, menuModulePaths);

    const sidebarData = requireValue(window.CCXP_LITE.sidebarData, "sidebarData");
    const shared = requireValue(window.CCXP_LITE.shared, "shared");
    const root = requireValue(sidebarData.parseSidebarTree(window.document), "parsed sidebar tree");
    const model = sidebarData.buildSidebarModel(root, window.document, shared.STRINGS);

    expect(model.categories).toHaveLength(1);
    expect(model.categories[0].label).toBe("\u65B0\u589E\u8207\u672A\u5206\u985E");
    expect(model.categories[0].sections[0].label).toBe("\u7814\u7A76\u5BA4\u5DE5\u5177");
    expect(model.categories[0].sections[0].directLinks[0].label).toBe(
      "\u5132\u5B58\u7A7A\u9593\u7533\u8ACB",
    );
  });
});
