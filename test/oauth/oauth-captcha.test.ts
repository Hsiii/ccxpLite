import { describe, expect, test, vi } from "vitest";

import {
  createTestWindow,
  loadModules,
  requireElement,
  requireValue,
  sharedModulePaths,
} from "../helpers/module-loader.js";
import { createOauthLoginHtml } from "../helpers/login-fixtures.js";

const oauthCaptchaModulePaths = [
  ...sharedModulePaths,
  "shared/src/login/locale.ts",
  "shared/src/login/auth/captcha.ts",
  "shared/src/oauth/captcha.ts",
];

async function flushPromises() {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

async function markOauthCaptchaImageLoaded(document: Document) {
  const image = requireElement(
    document.querySelector<HTMLImageElement>("img[alt='CAPTCHA Image']"),
    "oauth captcha image",
  );
  Object.defineProperty(image, "complete", {
    configurable: true,
    get: () => true,
  });
  Object.defineProperty(image, "naturalWidth", {
    configurable: true,
    get: () => 150,
  });
  Object.defineProperty(image, "naturalHeight", {
    configurable: true,
    get: () => 80,
  });
  const EventConstructor = requireValue(document.defaultView?.Event, "event constructor");
  image.dispatchEvent(new EventConstructor("load"));
  await flushPromises();
  await flushPromises();
  return image;
}

describe("oauth captcha", () => {
  test("autofills the OAuth captcha field with the dedicated predictor", async () => {
    const { window } = createTestWindow(
      createOauthLoginHtml(),
      "https://oauth.ccxp.nthu.edu.tw/v1.1/authorize.php?client_id=eeclass",
    );
    const document = window.document as Document;
    const legacyPredictDigits = vi.fn().mockResolvedValue("111111");
    const oauthPredictDigits = vi.fn().mockResolvedValue("7688");
    window.CCXP_LITE.decaptcha = { predictDigits: legacyPredictDigits };
    window.CCXP_LITE.oauthDecaptcha = { predictDigits: oauthPredictDigits };

    window.fetch = vi.fn() as unknown as typeof window.fetch;

    loadModules(window, oauthCaptchaModulePaths);

    const input = requireElement(
      document.querySelector<HTMLInputElement>("input[name='captcha']"),
      "oauth captcha input",
    );
    expect(input.getAttribute("aria-busy")).toBe("true");

    const image = await markOauthCaptchaImageLoaded(document);

    expect(input.value).toBe("7688");
    expect(oauthPredictDigits).toHaveBeenCalledTimes(1);
    expect(oauthPredictDigits.mock.calls[0]?.[0]).toBe(image);
    expect(legacyPredictDigits).not.toHaveBeenCalled();
    expect(window.fetch).not.toHaveBeenCalled();
  });

  test("re-autofills when refresh replaces the OAuth captcha image node", async () => {
    const { window } = createTestWindow(
      createOauthLoginHtml(),
      "https://oauth.ccxp.nthu.edu.tw/v1.1/authorize.php?client_id=eeclass",
    );
    const document = window.document as Document;
    const oauthPredictDigits = vi.fn().mockResolvedValueOnce("7688").mockResolvedValueOnce("1234");
    window.CCXP_LITE.oauthDecaptcha = { predictDigits: oauthPredictDigits };
    window.fetch = vi.fn() as unknown as typeof window.fetch;

    loadModules(window, oauthCaptchaModulePaths);

    const input = requireElement(
      document.querySelector<HTMLInputElement>("input[name='captcha']"),
      "oauth captcha input",
    );
    await markOauthCaptchaImageLoaded(document);
    expect(input.value).toBe("7688");

    const mediaRow = requireElement(
      document.querySelector<HTMLElement>(".oauth-captcha-shell"),
      "oauth captcha shell",
    );
    const replacement = document.createElement("img");
    replacement.alt = "CAPTCHA Image";
    replacement.src = "captchaimg.php?id=demo-20260511-refresh";
    Object.defineProperty(replacement, "complete", {
      configurable: true,
      get: () => true,
    });
    Object.defineProperty(replacement, "naturalWidth", {
      configurable: true,
      get: () => 150,
    });
    Object.defineProperty(replacement, "naturalHeight", {
      configurable: true,
      get: () => 80,
    });
    requireElement(
      document.querySelector<HTMLImageElement>("img[alt='CAPTCHA Image']"),
      "oauth captcha image",
    ).replaceWith(replacement);
    const EventConstructor = requireValue(document.defaultView?.Event, "event constructor");
    const loadEvent = new EventConstructor("load");
    replacement.dispatchEvent(loadEvent);

    await flushPromises();
    await flushPromises();

    expect(mediaRow.querySelector("img[alt='CAPTCHA Image']")).toBe(replacement);
    expect(input.value).toBe("1234");
    expect(oauthPredictDigits).toHaveBeenCalledTimes(2);
    expect(oauthPredictDigits.mock.calls[1]?.[0]).toBe(replacement);
    expect(window.fetch).not.toHaveBeenCalled();
  });

  test("waits for the OAuth captcha image to finish loading before predicting", async () => {
    const { window } = createTestWindow(
      createOauthLoginHtml(),
      "https://oauth.ccxp.nthu.edu.tw/v1.1/authorize.php?client_id=eeclass",
    );
    const document = window.document as Document;
    const oauthPredictDigits = vi.fn().mockResolvedValue("5094");
    window.CCXP_LITE.oauthDecaptcha = { predictDigits: oauthPredictDigits };
    window.fetch = vi.fn() as unknown as typeof window.fetch;

    const image = requireElement(
      document.querySelector<HTMLImageElement>("img[alt='CAPTCHA Image']"),
      "oauth captcha image",
    );
    let isLoaded = false;
    Object.defineProperty(image, "complete", {
      configurable: true,
      get: () => isLoaded,
    });
    Object.defineProperty(image, "naturalWidth", {
      configurable: true,
      get: () => (isLoaded ? 150 : 0),
    });
    Object.defineProperty(image, "naturalHeight", {
      configurable: true,
      get: () => (isLoaded ? 80 : 0),
    });

    loadModules(window, oauthCaptchaModulePaths);

    await flushPromises();
    await flushPromises();
    expect(oauthPredictDigits).not.toHaveBeenCalled();

    isLoaded = true;
    const EventConstructor = requireValue(document.defaultView?.Event, "event constructor");
    image.dispatchEvent(new EventConstructor("load"));

    await flushPromises();
    await flushPromises();

    const input = requireElement(
      document.querySelector<HTMLInputElement>("input[name='captcha']"),
      "oauth captcha input",
    );
    expect(input.value).toBe("5094");
    expect(oauthPredictDigits).toHaveBeenCalledTimes(1);
    expect(oauthPredictDigits.mock.calls[0]?.[0]).toBe(image);
    expect(window.fetch).not.toHaveBeenCalled();
  });

  test("keeps retrying until the OAuth captcha field appears", async () => {
    const { window } = createTestWindow(
      "<!doctype html><html lang='zh'><head></head><body><div id='late-root'></div></body></html>",
      "https://oauth.ccxp.nthu.edu.tw/v1.1/authorize.php?client_id=eeclass",
    );
    const document = window.document as Document;
    const oauthPredictDigits = vi.fn().mockResolvedValue("4321");
    window.CCXP_LITE.oauthDecaptcha = { predictDigits: oauthPredictDigits };
    window.fetch = vi.fn() as unknown as typeof window.fetch;

    loadModules(window, oauthCaptchaModulePaths);

    const lateRoot = requireElement(document.querySelector("#late-root"), "late root");
    lateRoot.innerHTML = `
      <form method="post" action="/v1.1/authorize.php">
        <label>
          <span>\u5B78\u865F\u3001\u54E1\u5DE5\u7DE8\u865F</span>
          <input type="text" name="id" value="" />
        </label>
        <label>
          <span>\u5BC6\u78BC</span>
          <input type="password" name="password" value="" />
        </label>
        <label>
          <span>\u9A57\u8B49\u78BC</span>
          <input type="number" name="captcha" value="" />
        </label>
        <div class="oauth-captcha-shell">
          <img alt="CAPTCHA Image" src="captchaimg.php?id=late-demo" />
        </div>
      </form>
    `;

    await markOauthCaptchaImageLoaded(document);
    await flushPromises();
    await flushPromises();

    const input = requireElement(
      document.querySelector<HTMLInputElement>("input[name='captcha']"),
      "late oauth captcha input",
    );
    expect(input.value).toBe("4321");
    expect(oauthPredictDigits).toHaveBeenCalledTimes(1);
    expect(window.fetch).not.toHaveBeenCalled();
  });
});
