import { describe, expect, test, vi } from "vitest";

import {
  createTestWindow,
  loadModules,
  requireElement,
  requireValue,
  sharedModulePaths,
} from "./helpers/module-loader.js";
import { createOauthLoginHtml } from "./helpers/landing-fixtures.js";

const oauthCaptchaModulePaths = [
  ...sharedModulePaths,
  "src/landing/locale.ts",
  "src/landing/captcha.ts",
  "src/oauth/captcha.ts",
];

async function flushPromises() {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
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

    const landingCaptcha = requireValue(window.CCXP_LITE.landingCaptcha, "landingCaptcha");
    landingCaptcha.enableLoginCaptchaAutofill(document, document);

    const input = requireElement(
      document.querySelector<HTMLInputElement>("input[name='captcha']"),
      "oauth captcha input",
    );
    expect(input.getAttribute("aria-busy")).toBe("true");

    await flushPromises();
    await flushPromises();

    expect(input.value).toBe("7688");
    expect(oauthPredictDigits).toHaveBeenCalledTimes(1);
    expect(oauthPredictDigits.mock.calls[0]?.[0]).toBe(
      document.querySelector<HTMLImageElement>("img[alt='CAPTCHA Image']"),
    );
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

    const landingCaptcha = requireValue(window.CCXP_LITE.landingCaptcha, "landingCaptcha");
    landingCaptcha.enableLoginCaptchaAutofill(document, document);

    const input = requireElement(
      document.querySelector<HTMLInputElement>("input[name='captcha']"),
      "oauth captcha input",
    );
    await flushPromises();
    await flushPromises();
    expect(input.value).toBe("7688");

    const mediaRow = requireElement(
      document.querySelector<HTMLElement>(".oauth-captcha-shell"),
      "oauth captcha shell",
    );
    const replacement = document.createElement("img");
    replacement.alt = "CAPTCHA Image";
    replacement.src = "captchaimg.php?id=demo-20260511-refresh";
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
});
