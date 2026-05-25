import { describe, expect, test, vi } from "vitest";

import {
  createTestWindow,
  loadModules,
  requireElement,
  requireValue,
  sharedModulePaths,
} from "../helpers/module-loader.js";
import { createInquireCaptchaHtml } from "../helpers/login-fixtures.js";

const inquireCaptchaModulePaths = [
  ...sharedModulePaths,
  "src/login/locale.ts",
  "src/login/auth/captcha.ts",
  "src/inquire/captcha.ts",
];

async function flushPromises() {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

describe("inquire captcha", () => {
  test("autofills 3-digit INQUIRE auth_num fields with the dedicated predictor", async () => {
    const { window } = createTestWindow(
      createInquireCaptchaHtml(),
      "https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/6/6.2/6.2.F/JH62f001.php",
    );
    const document = window.document as Document;
    const legacyPredictDigits = vi.fn().mockResolvedValue("654321");
    const inquirePredictDigits = vi.fn().mockResolvedValue("482");
    window.CCXP_LITE.decaptcha = { predictDigits: legacyPredictDigits };
    window.CCXP_LITE.inquireDecaptcha = { predictDigits: inquirePredictDigits };
    window.fetch = vi.fn() as unknown as typeof window.fetch;

    const image = requireElement(
      document.querySelector<HTMLImageElement>("img[src*='auth_img.php?ACIXSTORE=']"),
      "inquire captcha image",
    );
    Object.defineProperty(image, "complete", {
      configurable: true,
      get: () => true,
    });
    Object.defineProperty(image, "naturalWidth", {
      configurable: true,
      get: () => 42,
    });
    Object.defineProperty(image, "naturalHeight", {
      configurable: true,
      get: () => 30,
    });

    loadModules(window, inquireCaptchaModulePaths);

    const input = requireElement(
      document.querySelector<HTMLInputElement>("input[name='auth_num']"),
      "inquire captcha input",
    );
    expect(input.getAttribute("aria-busy")).toBe("true");

    const EventConstructor = requireValue(document.defaultView?.Event, "event constructor");
    image.dispatchEvent(new EventConstructor("load"));

    await flushPromises();
    await flushPromises();

    expect(input.value).toBe("482");
    expect(inquirePredictDigits).toHaveBeenCalledTimes(1);
    expect(inquirePredictDigits.mock.calls[0]?.[0]).toBe(image);
    expect(legacyPredictDigits).not.toHaveBeenCalled();
    expect(window.fetch).not.toHaveBeenCalled();
  });
});
