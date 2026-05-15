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
      sendMessage: (_message: unknown) => undefined,
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
  "shared/src/shared/constants.ts",
  "shared/src/shared/locale.ts",
  "shared/src/shared/theme.ts",
  "shared/src/shared/brand.ts",
  "shared/src/shared/dom.ts",
  "shared/src/shared/analytics.ts",
];

export const menuModulePaths = [
  ...sharedModulePaths,
  "shared/src/menu/model/state.ts",
  "shared/src/menu/model/favorites.ts",
  "shared/src/menu/model/data.ts",
  "shared/src/menu/runtime.ts",
  "shared/src/menu/ui/index.ts",
];

export const loginModulePaths = [
  ...sharedModulePaths,
  "shared/src/login/locale.ts",
  "shared/src/login/ui/support.ts",
  "shared/src/login/ui/tabs.ts",
  "shared/src/login/auth/validation.ts",
  "shared/src/login/ui/login.ts",
  "shared/src/login/auth/captcha.ts",
  "shared/src/login/pipeline/identify.ts",
  "shared/src/login/pipeline/rewrite.ts",
  "shared/src/login/pipeline/style.ts",
];
