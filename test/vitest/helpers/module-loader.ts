import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { Window } from "happy-dom";
import ts from "typescript";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

export type TestWindow = Window &
  typeof globalThis & {
    CCXP_LITE: CcxpLiteNamespace;
    document: Document;
    chrome: {
      runtime: {
        id: string;
        getURL: (assetPath: string) => string;
        lastError: unknown;
      };
      storage: {
        local: {
          get: (keys: string[] | null, callback: (result: Record<string, unknown>) => void) => void;
        };
      };
    };
  };

export function createTestWindow(
  html = "<!doctype html><html lang='zh'><head></head><body></body></html>",
  url = "https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/index.php",
): { window: TestWindow } {
  const window = new Window({
    url,
    width: 1280,
    height: 960,
  });
  window.document.write(html);
  const testWindow = window as unknown as TestWindow;

  testWindow.CCXP_LITE = {} as CcxpLiteNamespace;
  testWindow.chrome = {
    runtime: {
      id: "ccxp-lite-test",
      getURL: (assetPath: string) => `chrome-extension://ccxp-lite/${assetPath}`,
      lastError: undefined,
    },
    storage: {
      local: {
        get: (_keys: string[] | null, callback: (result: Record<string, unknown>) => void) => {
          callback({});
        },
      },
    },
  };

  testWindow.requestAnimationFrame = ((callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  }) as typeof testWindow.requestAnimationFrame;
  testWindow.cancelAnimationFrame = (() => undefined) as typeof testWindow.cancelAnimationFrame;

  Object.defineProperty(testWindow.document, "readyState", {
    configurable: true,
    get: () => "complete",
  });

  return { window: testWindow };
}

export function loadModules(window: TestWindow, modulePaths: string[]): void {
  const context = vm.createContext(window as unknown as vm.Context);
  modulePaths.forEach((modulePath) => {
    const sourcePath = path.join(repoRoot, modulePath);
    const source = fs.readFileSync(sourcePath, "utf8");
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.None,
      },
      fileName: sourcePath,
    }).outputText;

    new vm.Script(transpiled, { filename: sourcePath }).runInContext(context);
  });
}

export const sharedModulePaths = [
  "src/shared/constants.ts",
  "src/shared/locale.ts",
  "src/shared/theme.ts",
  "src/shared/brand.ts",
  "src/shared/dom.ts",
];

export const menuModulePaths = [
  ...sharedModulePaths,
  "src/menu/state.ts",
  "src/menu/favorites.ts",
  "src/menu/data.ts",
  "src/menu/runtime.ts",
  "src/menu/ui.ts",
];

export const landingModulePaths = [
  ...sharedModulePaths,
  "src/landing/locale.ts",
  "src/landing/support.ts",
  "src/landing/tabs.ts",
  "src/landing/validation.ts",
  "src/landing/login.ts",
  "src/landing/captcha.ts",
];
