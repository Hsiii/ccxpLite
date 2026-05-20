import { describe, expect, test } from "vitest";

import {
  createTestWindow,
  loadModules,
  menuModulePaths,
  requireValue,
} from "../helpers/module-loader.js";

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
    expect(model.categories[0].blocks[0].label).toBe("\u5B78\u5206");
    expect(model.categories[0].blocks[0].links[0].label).toBe(
      "\u5B78\u5206&\u62B5\u514D\u5B78\u5206",
    );
    expect(model.categories[0].blocks[1].links[0].label).toBe("\u5B78\u671F\u6210\u7E3E");
  });

  test("filters favorites and categories by normalized search text", () => {
    const { window } = createTestWindow();
    loadModules(window, menuModulePaths);
    const sidebarData = requireValue(window.CCXP_LITE.sidebarData, "sidebarData");

    const category: CcxpLiteSidebarCategoryNode = {
      id: "category-courses",
      label: "Courses & Grades",
      kind: "category",
      links: [],
      blocks: [
        {
          id: "section-academic",
          label: "Academic",
          kind: "block",
          links: [{ id: "grades", label: "Semester Grades" }],
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
    expect(model.categories[0].blocks[0].label).toBe("\u5168\u65B0\u529F\u80FD\u6E2C\u8A66");
    expect(model.categories[0].blocks[0].links[0].label).toBe(
      "\u5168\u65B0\u529F\u80FD\u6E2C\u8A66",
    );
  });

  test("merges rendered leaf nodes that are missing from the legacy script tree", () => {
    const { window } = createTestWindow(`
      <!doctype html>
      <html>
        <body>
          <script>
            foldersTree = gFld("root", "");
            insDoc(foldersTree, gLnk(0, "\u6559\u5B78\u52A9\u7406\u8A55\u91CF\u554F\u5377", "/ta-survey"));
          </script>
          <div id="item1">
            <a href="/teach-survey">\u586B\u5BEB\u6559\u5B78\u610F\u898B\u8ABF\u67E5</a>
          </div>
          <div id="item2">
            <a href="/campus-network">\u6821\u5712\u7DB2\u8DEF\u8207\u6388\u6B0A\u8EDF\u9AD4\u670D\u52D9\u54C1\u8CEA\u554F\u5377\u8ABF\u67E5</a>
          </div>
        </body>
      </html>
    `);
    loadModules(window, menuModulePaths);

    const sidebarData = requireValue(window.CCXP_LITE.sidebarData, "sidebarData");
    const shared = requireValue(window.CCXP_LITE.shared, "shared");
    const root = requireValue(sidebarData.parseSidebarTree(window.document), "parsed sidebar tree");
    const model = sidebarData.buildSidebarModel(root, window.document, shared.STRINGS);
    const allLabels = model.categories.flatMap((category: CcxpLiteSidebarCategoryNode) =>
      category.blocks.flatMap((block) => block.links.map((link) => link.label)),
    );

    expect(allLabels).toContain("\u586B\u5BEB\u6559\u5B78\u610F\u898B\u8ABF\u67E5");
    expect(allLabels).toContain(
      "\u6821\u5712\u7DB2\u8DEF\u8207\u6388\u6B0A\u8EDF\u9AD4\u670D\u52D9\u54C1\u8CEA\u554F\u5377\u8ABF\u67E5",
    );
  });

  test("categorizes newly surfaced mixed-language labels instead of leaving them unsorted", () => {
    const { window } = createTestWindow(`
      <!doctype html>
      <html>
        <body>
          <script>
            foldersTree = gFld("root", "");
            insDoc(foldersTree, gLnk(0, "\u586B\u5BEB\u6559\u5B78\u610F\u898B\u8ABF\u67E5", "/teach-survey"));
            insDoc(foldersTree, gLnk(0, "\u7D9C\u5408\u610F\u898B\u5E73\u5747\u5206\u6578", "/teach-average"));
            insDoc(foldersTree, gLnk(0, "\u52A0\u7C3D\u7533\u8ACBapplication for extra selection", "/extra-selection"));
            insDoc(foldersTree, gLnk(0, "\u505C\u4FEE\u7533\u8ACBCourse withdrawal application", "/withdrawal"));
            insDoc(foldersTree, gLnk(0, "\u6821\u5712\u7DB2\u8DEF\u8207\u6388\u6B0A\u8EDF\u9AD4\u670D\u52D9\u54C1\u8CEA\u554F\u5377\u8ABF\u67E5", "/campus-network"));
          </script>
        </body>
      </html>
    `);
    loadModules(window, menuModulePaths);

    const sidebarData = requireValue(window.CCXP_LITE.sidebarData, "sidebarData");
    const shared = requireValue(window.CCXP_LITE.shared, "shared");
    const root = requireValue(sidebarData.parseSidebarTree(window.document), "parsed sidebar tree");
    const model = sidebarData.buildSidebarModel(root, window.document, shared.STRINGS);
    const categoryByLabel = new Map(
      model.categories.map((category: CcxpLiteSidebarCategoryNode) => [category.label, category]),
    );

    expect(
      categoryByLabel
        .get("\u6559\u5B78\u610F\u898B")
        ?.blocks.flatMap((block) => block.links.map((link) => link.label)),
    ).toEqual(
      expect.arrayContaining([
        "\u586B\u5BEB\u6559\u5B78\u610F\u898B\u8ABF\u67E5",
        "\u7D9C\u5408\u610F\u898B\u5E73\u5747\u5206\u6578",
      ]),
    );
    expect(
      categoryByLabel
        .get("\u9810\u6392\u8207\u9078\u8AB2")
        ?.blocks.flatMap((block) => block.links.map((link) => link.label)),
    ).toEqual(
      expect.arrayContaining([
        "\u52A0\u7C3D\u7533\u8ACBapplication for extra selection",
        "\u505C\u4FEE\u7533\u8ACBCourse withdrawal application",
      ]),
    );
    expect(
      categoryByLabel
        .get("\u6821\u5712\u7CFB\u7D71")
        ?.blocks.flatMap((block) => block.links.map((link) => link.label)),
    ).toEqual(
      expect.arrayContaining([
        "\u6821\u5712\u7DB2\u8DEF\u8207\u6388\u6B0A\u8EDF\u9AD4\u670D\u52D9\u54C1\u8CEA\u554F\u5377\u8ABF\u67E5",
      ]),
    );
    expect(
      model.categories.map((category: CcxpLiteSidebarCategoryNode) => category.label),
    ).not.toContain("\u65B0\u589E\u8207\u672A\u5206\u985E");
  });

  test("drops loose category links when the same destination already exists inside a grouped block", () => {
    const { window } = createTestWindow(`
      <!doctype html>
      <html>
        <body>
          <script>
            foldersTree = gFld("root", "");
            aux0 = insFld(foldersTree, gFld("\u9078\u8AB2 Select courses", ""));
            insDoc(aux0, gLnk(0, "\u7DB2\u8DEF\u9078\u8AB2 Select courses", "/course/select"));
            insDoc(aux0, gLnk(0, "\u52A0\u7C3D\u7533\u8ACB application for extra selection", "/course/extra"));
            insDoc(foldersTree, gLnk(0, "\u7DB2\u8DEF\u9078\u8AB2Select courses", "/course/select"));
            insDoc(foldersTree, gLnk(0, "\u52A0\u7C3D\u7533\u8ACBapplication for extra selection", "/course/extra"));
          </script>
        </body>
      </html>
    `);
    loadModules(window, menuModulePaths);

    const sidebarData = requireValue(window.CCXP_LITE.sidebarData, "sidebarData");
    const shared = requireValue(window.CCXP_LITE.shared, "shared");
    const root = requireValue(sidebarData.parseSidebarTree(window.document), "parsed sidebar tree");
    const model = sidebarData.buildSidebarModel(root, window.document, shared.STRINGS);
    const category = model.categories.find(
      (entry: CcxpLiteSidebarCategoryNode) => entry.label === "\u9810\u6392\u8207\u9078\u8AB2",
    );

    expect(category?.blocks).toHaveLength(1);
    expect(category?.blocks[0]?.links.map((link) => link.label)).toEqual([
      "\u7DB2\u8DEF\u9078\u8AB2 Select courses",
      "\u52A0\u7C3D\u7533\u8ACB application for extra selection",
    ]);
  });

  test("categorizes english-only groups instead of dropping them into new and unsorted", () => {
    const { window } = createTestWindow(`
      <!doctype html>
      <html>
        <body>
          <script>
            foldersTree = gFld("root", "");
            aux0 = insFld(foldersTree, gFld("Select courses", ""));
            insDoc(aux0, gLnk(0, "Add / Drop Courses", "/courses"));
            aux1 = insFld(foldersTree, gFld("Learning platform", ""));
            insDoc(aux1, gLnk(0, "Course materials", "/learning"));
            aux2 = insFld(foldersTree, gFld("Student leave system", ""));
            insDoc(aux2, gLnk(0, "Leave application", "/leave"));
          </script>
        </body>
      </html>
    `);
    loadModules(window, menuModulePaths);

    const sidebarData = requireValue(window.CCXP_LITE.sidebarData, "sidebarData");
    const shared = requireValue(window.CCXP_LITE.shared, "shared");
    const root = requireValue(sidebarData.parseSidebarTree(window.document), "parsed sidebar tree");
    const strings = shared.getLocalizedStrings("en");
    const model = sidebarData.buildSidebarModel(root, window.document, strings);

    expect(model.categories.map((category: { label: string }) => category.label)).toContain(
      "Planning & Enrollment",
    );
    expect(model.categories.map((category: { label: string }) => category.label)).toContain(
      "Campus Systems",
    );
    expect(model.categories.map((category: { label: string }) => category.label)).toContain(
      "Forms",
    );
    expect(model.categories.map((category: { label: string }) => category.label)).not.toContain(
      "New & Unsorted",
    );
  });

  test("uses nested english folder labels to classify the first layer node", () => {
    const { window } = createTestWindow(`
      <!doctype html>
      <html>
        <body>
          <script>
            foldersTree = gFld("root", "");
            aux0 = insFld(foldersTree, gFld("Student services", ""));
            aux1 = insFld(aux0, gFld("Select courses", ""));
            insDoc(aux1, gLnk(0, "Apply now", "/courses/apply"));
          </script>
        </body>
      </html>
    `);
    loadModules(window, menuModulePaths);

    const sidebarData = requireValue(window.CCXP_LITE.sidebarData, "sidebarData");
    const shared = requireValue(window.CCXP_LITE.shared, "shared");
    const root = requireValue(sidebarData.parseSidebarTree(window.document), "parsed sidebar tree");
    const strings = shared.getLocalizedStrings("en");
    const model = sidebarData.buildSidebarModel(root, window.document, strings);

    expect(model.categories).toHaveLength(1);
    expect(model.categories[0].label).toBe("Planning & Enrollment");
    expect(model.categories[0].blocks[0].label).toBe("Student services");
    expect(model.categories[0].blocks[0].links[0].pathSegments).toEqual([
      "Student services",
      "Select courses",
      "Apply now",
    ]);
  });

  test("keeps favorites visible when a nested menu gains an intermediate layer", () => {
    const { window } = createTestWindow(`
      <!doctype html>
      <html>
        <body>
          <script>
            foldersTree = gFld("root", "");
            aux0 = insFld(foldersTree, gFld("Student services", ""));
            aux1 = insFld(aux0, gFld("Select courses", ""));
            insDoc(aux1, gLnk(0, "Apply now", "/courses/apply"));
          </script>
        </body>
      </html>
    `);
    loadModules(window, menuModulePaths);

    const sidebarFavorites = requireValue(window.CCXP_LITE.sidebarFavorites, "sidebarFavorites");
    const sidebarData = requireValue(window.CCXP_LITE.sidebarData, "sidebarData");
    const shared = requireValue(window.CCXP_LITE.shared, "shared");
    const root = requireValue(sidebarData.parseSidebarTree(window.document), "parsed sidebar tree");
    const strings = shared.getLocalizedStrings("en");

    sidebarFavorites.favoriteState.ids = new Set([
      sidebarFavorites.createLinkId({
        label: "Apply now",
        href: "/courses/apply",
        pathSegments: ["Student services", "Apply now"],
        target: "main",
      }),
    ]);
    sidebarFavorites.favoriteState.hasLoaded = true;

    const model = sidebarData.buildSidebarModel(root, window.document, strings);

    expect(model.favorites.blocks).toHaveLength(0);
    expect(model.favorites.links).toHaveLength(1);
    expect(model.favorites.links?.[0].label).toBe("Apply now");
    expect(model.favorites.links?.[0].pathSegments).toEqual([
      "Student services",
      "Select courses",
      "Apply now",
    ]);
  });

  test("adds pinned folders to the favorites blocks instead of pinning their child links", () => {
    const { window } = createTestWindow(`
      <!doctype html>
      <html>
        <body>
          <script>
            foldersTree = gFld("root", "");
            aux0 = insFld(foldersTree, gFld("Student services", ""));
            aux1 = insFld(aux0, gFld("Select courses", ""));
            insDoc(aux1, gLnk(0, "Apply now", "/courses/apply"));
          </script>
        </body>
      </html>
    `);
    loadModules(window, menuModulePaths);

    const sidebarFavorites = requireValue(window.CCXP_LITE.sidebarFavorites, "sidebarFavorites");
    const sidebarData = requireValue(window.CCXP_LITE.sidebarData, "sidebarData");
    const shared = requireValue(window.CCXP_LITE.shared, "shared");
    const root = requireValue(sidebarData.parseSidebarTree(window.document), "parsed sidebar tree");
    const strings = shared.getLocalizedStrings("en");

    sidebarFavorites.favoriteState.ids = new Set([
      sidebarFavorites.createBlockId({
        label: "Student services",
        pathSegments: ["Student services"],
        parentCategoryId: "category-planning-and-enrollment",
      }),
    ]);
    sidebarFavorites.favoriteState.hasLoaded = true;

    const model = sidebarData.buildSidebarModel(root, window.document, strings);

    expect(model.favorites.blocks).toHaveLength(1);
    expect(model.favorites.blocks[0]?.label).toBe("Student services");
    expect(model.favorites.links).toHaveLength(0);
  });

  test("drops duplicated links from broader blocks when a narrower block already contains them", () => {
    const { window } = createTestWindow(`
      <!doctype html>
      <html>
        <body>
          <script>
            foldersTree = gFld("root", "");
            aux0 = insFld(foldersTree, gFld("Student services", ""));
            insDoc(aux0, gLnk(0, "Overview", "/student-services"));
            aux1 = insFld(aux0, gFld("Select courses", ""));
            insDoc(aux1, gLnk(0, "Apply now", "/courses/apply"));
            aux2 = insFld(foldersTree, gFld("Select courses", ""));
            insDoc(aux2, gLnk(0, "Apply now", "/courses/apply"));
          </script>
        </body>
      </html>
    `);
    loadModules(window, menuModulePaths);

    const sidebarData = requireValue(window.CCXP_LITE.sidebarData, "sidebarData");
    const shared = requireValue(window.CCXP_LITE.shared, "shared");
    const root = requireValue(sidebarData.parseSidebarTree(window.document), "parsed sidebar tree");
    const strings = shared.getLocalizedStrings("en");
    const model = sidebarData.buildSidebarModel(root, window.document, strings);
    const category = model.categories.find(
      (entry: CcxpLiteSidebarCategoryNode) => entry.label === "Planning & Enrollment",
    );

    expect(category?.blocks.map((block) => block.label)).toEqual([
      "Student services",
      "Select courses",
    ]);
    expect(category?.blocks[0]?.links.map((link) => link.label)).toEqual(["Overview"]);
    expect(category?.blocks[1]?.links.map((link) => link.label)).toEqual(["Apply now"]);
  });

  test("drops mixed-language duplicates from a broad block when sibling blocks expose them separately", () => {
    const { window } = createTestWindow(`
      <!doctype html>
      <html>
        <body>
          <script>
            foldersTree = gFld("root", "");
            aux0 = insFld(foldersTree, gFld("\u9078\u8AB2\u8207\u9810\u6392", ""));
            aux1 = insFld(aux0, gFld("\u9810\u6392\u7CFB\u7D71 Tentative schedule", ""));
            insDoc(aux1, gLnk(0, "\u8AB2\u7A0B\u9810\u6392Tentative schedule", "/tentative"));
            aux2 = insFld(aux0, gFld("\u9078\u8AB2 Select courses", ""));
            insDoc(aux2, gLnk(0, "\u7DB2\u8DEF\u9078\u8AB2Select courses", "/select"));
            insDoc(aux2, gLnk(0, "\u52A0\u7C3D\u7533\u8ACBapplication for extra selection", "/extra"));
            insDoc(aux2, gLnk(0, "\u505C\u4FEE\u7533\u8ACBCourse withdrawal application", "/withdraw"));
            insDoc(aux2, gLnk(0, "\u9078\u8AB2\u60C5\u5F62\u67E5\u8A62Inquiries regarding course selection results", "/inquiry"));
            aux3 = insFld(foldersTree, gFld("\u9810\u6392\u7CFB\u7D71 Tentative schedule", ""));
            insDoc(aux3, gLnk(0, "\u8AB2\u7A0B\u9810\u6392 Tentative schedule", "/tentative"));
            aux4 = insFld(foldersTree, gFld("\u9078\u8AB2 Select courses", ""));
            insDoc(aux4, gLnk(0, "\u7DB2\u8DEF\u9078\u8AB2 Select courses", "/select"));
            insDoc(aux4, gLnk(0, "\u52A0\u7C3D\u7533\u8ACB application for extra selection", "/extra"));
            insDoc(aux4, gLnk(0, "\u505C\u4FEE\u7533\u8ACB Course withdrawal application", "/withdraw"));
            insDoc(aux4, gLnk(0, "\u9078\u8AB2\u60C5\u5F62\u67E5\u8A62 Inquiries regarding course selection results", "/inquiry"));
            insDoc(foldersTree, gLnk(0, "\u6821\u969B/\u8DE8\u7CFB\u7D71\u9078\u4FEE", "/cross"));
            insDoc(foldersTree, gLnk(0, "\u6691\u4FEE Summer courses", "/summer"));
          </script>
        </body>
      </html>
    `);
    loadModules(window, menuModulePaths);

    const sidebarData = requireValue(window.CCXP_LITE.sidebarData, "sidebarData");
    const shared = requireValue(window.CCXP_LITE.shared, "shared");
    const root = requireValue(sidebarData.parseSidebarTree(window.document), "parsed sidebar tree");
    const model = sidebarData.buildSidebarModel(root, window.document, shared.STRINGS);
    const category = model.categories.find(
      (entry: CcxpLiteSidebarCategoryNode) => entry.label === "\u9810\u6392\u8207\u9078\u8AB2",
    );

    expect(category?.blocks.map((block) => block.label)).toEqual([
      "\u8DE8\u7CFB\u8207\u6821\u5167\u7CFB\u7D71",
      "\u9810\u6392\u7CFB\u7D71 Tentative schedule",
      "\u9078\u8AB2 Select courses",
    ]);
    expect(category?.blocks[0]?.links.map((link) => link.label)).toEqual([
      "\u6821\u969B/\u8DE8\u7CFB\u7D71\u9078\u4FEE",
      "\u6691\u4FEE Summer courses",
    ]);
    expect(category?.blocks[1]?.links.map((link) => link.label)).toEqual([
      "\u8AB2\u7A0B\u9810\u6392 Tentative schedule",
    ]);
    expect(category?.blocks[2]?.links.map((link) => link.label)).toEqual([
      "\u7DB2\u8DEF\u9078\u8AB2 Select courses",
      "\u52A0\u7C3D\u7533\u8ACB application for extra selection",
      "\u505C\u4FEE\u7533\u8ACB Course withdrawal application",
      "\u9078\u8AB2\u60C5\u5F62\u67E5\u8A62 Inquiries regarding course selection results",
    ]);
  });

  test("applies manual english translations to unmatched chinese sidebar labels", () => {
    const { window } = createTestWindow(`
      <!doctype html>
      <html>
        <body>
          <script>
            foldersTree = gFld("root", "");
            insDoc(foldersTree, gLnk(0, "\u7C3D\u5230\u9000", "/attendance"));
          </script>
        </body>
      </html>
    `);
    loadModules(window, menuModulePaths);

    const sidebarData = requireValue(window.CCXP_LITE.sidebarData, "sidebarData");
    const shared = requireValue(window.CCXP_LITE.shared, "shared");
    const root = requireValue(sidebarData.parseSidebarTree(window.document), "parsed sidebar tree");
    const strings = shared.getLocalizedStrings("en");
    const model = sidebarData.buildSidebarModel(root, window.document, strings);

    expect(model.categories).toHaveLength(1);
    expect(model.categories[0].label).toBe("New & Unsorted");
    expect(model.categories[0].blocks[0].label).toBe("Check In/Out");
    expect(model.categories[0].blocks[0].links[0].label).toBe("Check In/Out");
  });
});
