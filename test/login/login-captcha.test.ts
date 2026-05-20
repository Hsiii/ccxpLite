import { describe, expect, test, vi } from "vitest";

import {
  requireElement,
  createTestWindow,
  loadModules,
  requireValue,
  sharedModulePaths,
} from "../helpers/module-loader.js";
import { createLoginHtml } from "../helpers/login-fixtures.js";

const loginCaptchaModulePaths = [
  ...sharedModulePaths,
  "src/login/locale.ts",
  "src/login/auth/captcha.ts",
];

async function flushPromises() {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

describe("login captcha", () => {
  test("binds once, shows loading, fills the input, and emits input/change events on success", async () => {
    const { window } = createTestWindow(createLoginHtml());
    const document = window.document as Document;
    const predictDigits = vi.fn().mockResolvedValue("654321");
    window.CCXP_LITE.decaptcha = { predictDigits };
    loadModules(window, loginCaptchaModulePaths);
    const loginCaptcha = requireValue(window.CCXP_LITE.loginCaptcha, "loginCaptcha");

    window.fetch = vi.fn() as unknown as typeof window.fetch;

    const image = requireElement(
      document.querySelector<HTMLImageElement>(".ccxp-lite-captcha-media-row img"),
      "legacy captcha image",
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

    const input = requireElement(
      document.querySelector<HTMLInputElement>("input[name='passwd2']"),
      "captcha input",
    );
    const inputSpy = vi.fn();
    const changeSpy = vi.fn();
    input.addEventListener("input", (event) => {
      inputSpy(event);
    });
    input.addEventListener("change", (event) => {
      changeSpy(event);
    });

    loginCaptcha.enableCaptchaAutofill(document, document);
    expect(input.getAttribute("aria-busy")).toBe("true");
    expect(
      (document.querySelector("form") as HTMLElement).dataset.ccxpLiteCaptchaAutofillBound,
    ).toBe("true");

    await flushPromises();
    await flushPromises();

    expect(input.value).toBe("654321");
    expect(input.getAttribute("aria-busy")).toBe("false");
    expect(inputSpy).toHaveBeenCalled();
    expect(changeSpy).toHaveBeenCalled();
    expect(window.fetch).not.toHaveBeenCalled();
    expect(predictDigits.mock.calls[0]?.[0]).toBe(image);

    loginCaptcha.enableCaptchaAutofill(document, document);
    expect(predictDigits).toHaveBeenCalledTimes(1);
  });

  test("falls back to manual entry and flashes timeout when download and image fallback both fail", async () => {
    const { window } = createTestWindow(createLoginHtml());
    const document = window.document as Document;
    window.CCXP_LITE.decaptcha = { predictDigits: vi.fn() };
    loadModules(window, loginCaptchaModulePaths);
    const loginCaptcha = requireValue(window.CCXP_LITE.loginCaptcha, "loginCaptcha");

    window.fetch = vi.fn(async () => {
      await Promise.resolve();
      const error = new Error("captcha-timeout");
      error.name = "TimeoutError";
      throw error;
    }) as unknown as typeof window.fetch;

    const input = requireElement(
      document.querySelector<HTMLInputElement>("input[name='passwd2']"),
      "captcha input",
    );
    const image = requireElement(
      document.querySelector<HTMLImageElement>(".ccxp-lite-captcha-media-row img"),
      "legacy captcha image",
    );
    Object.defineProperty(image, "complete", {
      configurable: true,
      get: () => false,
    });
    Object.defineProperty(image, "naturalWidth", {
      configurable: true,
      get: () => 0,
    });
    Object.defineProperty(image, "naturalHeight", {
      configurable: true,
      get: () => 0,
    });
    loginCaptcha.enableCaptchaAutofill(document, document);
    setTimeout(() => {
      image.dispatchEvent(new Event("error"));
    }, 0);
    await flushPromises();
    await flushPromises();
    await flushPromises();

    expect(input.hasAttribute("aria-busy")).toBe(false);
    expect(input.dataset.timeoutFlash).toBe("true");
    expect(input.value).toBe("");
  });

  test("falls back to network bytes when the legacy captcha image is not ready", async () => {
    const { window } = createTestWindow(createLoginHtml());
    const document = window.document as Document;
    const predictDigits = vi.fn().mockResolvedValue("432109");
    window.CCXP_LITE.decaptcha = { predictDigits };
    loadModules(window, loginCaptchaModulePaths);
    const loginCaptcha = requireValue(window.CCXP_LITE.loginCaptcha, "loginCaptcha");

    window.fetch = vi.fn(async () =>
      await Promise.resolve({
        ok: true,
        arrayBuffer: async () => await Promise.resolve(new ArrayBuffer(8)),
      }),
    ) as unknown as typeof window.fetch;

    const image = requireElement(
      document.querySelector<HTMLImageElement>(".ccxp-lite-captcha-media-row img"),
      "legacy captcha image",
    );
    Object.defineProperty(image, "complete", {
      configurable: true,
      get: () => false,
    });
    Object.defineProperty(image, "naturalWidth", {
      configurable: true,
      get: () => 0,
    });
    Object.defineProperty(image, "naturalHeight", {
      configurable: true,
      get: () => 0,
    });

    const input = requireElement(
      document.querySelector<HTMLInputElement>("input[name='passwd2']"),
      "captcha input",
    );

    loginCaptcha.enableCaptchaAutofill(document, document);
    await flushPromises();
    await flushPromises();

    expect(input.value).toBe("432109");
    expect(input.getAttribute("aria-busy")).toBe("false");
    expect(predictDigits).toHaveBeenCalledTimes(1);
    expect(predictDigits.mock.calls[0]?.[0]).toBeInstanceOf(ArrayBuffer);
    expect(window.fetch).toHaveBeenCalledTimes(1);
  });
});
