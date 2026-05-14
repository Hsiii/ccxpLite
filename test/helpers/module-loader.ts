import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { Window } from "happy-dom";
import ts from "typescript";

const repoRoot = process.cwd();

export type TestWindow = Window &
  typeof globalThis & {
    CCXP_LITE: CcxpLiteNamespace;
    document: Document;
    chrome: typeof chrome;
    dataLayer?: CcxpLiteDataLayerEvent[];
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
        get: (
          _keys: readonly string[] | undefined,
          callback: (result: Readonly<Record<string, unknown>>) => void,
        ) => {
          callback({});
        },
      },
    },
  } as unknown as typeof chrome;

  testWindow.requestAnimationFrame = ((callback: FrameRequestCallback) => {
    const frameTime = 0;
    callback(frameTime);
    return 1;
  }) as typeof testWindow.requestAnimationFrame;
  testWindow.cancelAnimationFrame = (() => undefined) as typeof testWindow.cancelAnimationFrame;

  Object.defineProperty(testWindow.document, "readyState", {
    configurable: true,
    get: () => "complete",
  });

  return { window: testWindow };
}

export function loadModules(window: TestWindow, modulePaths: readonly string[]): void {
  const context = vm.createContext(window as unknown as vm.Context);
  for (const modulePath of modulePaths) {
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
  }
}

export function requireValue<T>(value: T | undefined, message = "Expected value"): T {
  if (value === undefined) {
    throw new Error(message);
  }

  return value;
}

export function requireElement<T extends Element>(
  value: T | null,
  message = "Expected element",
): T {
  if (value === null) {
    throw new Error(message);
  }

  return value;
}

export const sharedModulePaths = [
  "src/shared/constants.ts",
  "src/shared/analytics.ts",
  "src/shared/locale.ts",
  "src/shared/theme.ts",
  "src/shared/brand.ts",
  "src/shared/dom.ts",
];

export const menuModulePaths = [
  ...sharedModulePaths,
  "src/menu/model/state.ts",
  "src/menu/model/favorites.ts",
  "src/menu/model/data.ts",
  "src/menu/runtime.ts",
  "src/menu/ui/index.ts",
];

export const loginModulePaths = [
  ...sharedModulePaths,
  "src/login/locale.ts",
  "src/login/ui/support.ts",
  "src/login/ui/tabs.ts",
  "src/login/auth/validation.ts",
  "src/login/ui/login.ts",
  "src/login/auth/captcha.ts",
  "src/login/pipeline/identify.ts",
  "src/login/pipeline/rewrite.ts",
  "src/login/pipeline/style.ts",
];
