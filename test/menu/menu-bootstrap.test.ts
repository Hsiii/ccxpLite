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
        </script>
      </body>
    </html>
  `;
}

describe("sidebar bootstrap", () => {
  test("reuses the same favorite subscriber across repeated simplify passes", () => {
    const { window } = createTestWindow(createSidebarTreeDocument());
    loadModules(window, [...menuModulePaths, "src/menu/ui/bootstrap.ts"]);

    const sidebar = requireValue(window.CCXP_LITE.sidebar, "sidebar");
    const sidebarFavorites = requireValue(window.CCXP_LITE.sidebarFavorites, "sidebarFavorites");

    sidebar.simplifySidebar(
      {
        contentDocument: window.document,
      } as unknown as HTMLIFrameElement,
      () => undefined,
    );
    sidebar.simplifySidebar(
      {
        contentDocument: window.document,
      } as unknown as HTMLIFrameElement,
      () => undefined,
    );

    expect(sidebarFavorites.favoriteSubscribers.size).toBe(1);
  });
});
