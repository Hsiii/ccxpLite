import { describe, expect, test, vi } from "vitest";

import {
  requireElement,
  createTestWindow,
  loadModules,
  requireValue,
  sharedModulePaths,
} from "../helpers/module-loader.js";
import { createLandingLoginHtml } from "../helpers/landing-fixtures.js";

const landingCaptchaModulePaths = [
  ...sharedModulePaths,
  "src/landing/locale.ts",
  "src/landing/auth/captcha.ts",
];

async function flushPromises() {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

describe("landing captcha", () => {
  test("binds once, shows loading, fills the input, and emits input/change events on success", async () => {
    const { window } = createTestWindow(createLandingLoginHtml());
    const document = window.document as Document;
    const predictDigits = vi.fn().mockResolvedValue("654321");
    window.CCXP_LITE.decaptcha = { predictDigits };
    loadModules(window, landingCaptchaModulePaths);
    const landingCaptcha = requireValue(window.CCXP_LITE.landingCaptcha, "landingCaptcha");

    let resolveFetch: ((value: Response) => void) | undefined;
    window.fetch = vi.fn(
      async () =>
        await new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    ) as unknown as typeof window.fetch;

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

    landingCaptcha.enableLoginCaptchaAutofill(document, document);
    expect(input.getAttribute("aria-busy")).toBe("true");
    expect(
      (document.querySelector("form") as HTMLElement).dataset.ccxpLiteCaptchaAutofillBound,
    ).toBe("true");

    resolveFetch?.({
      ok: true,
      arrayBuffer: async () => await Promise.resolve(new ArrayBuffer(8)),
    } as Response);
    await flushPromises();
    await flushPromises();

    expect(input.value).toBe("654321");
    expect(input.getAttribute("aria-busy")).toBe("false");
    expect(inputSpy).toHaveBeenCalled();
    expect(changeSpy).toHaveBeenCalled();

    landingCaptcha.enableLoginCaptchaAutofill(document, document);
    expect(vi.mocked(window.fetch).mock.calls.length).toBeGreaterThan(0);
  });

  test("falls back to manual entry and flashes timeout on timeout-style failures", async () => {
    const { window } = createTestWindow(createLandingLoginHtml());
    const document = window.document as Document;
    window.CCXP_LITE.decaptcha = { predictDigits: vi.fn() };
    loadModules(window, landingCaptchaModulePaths);
    const landingCaptcha = requireValue(window.CCXP_LITE.landingCaptcha, "landingCaptcha");

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
    landingCaptcha.enableLoginCaptchaAutofill(document, document);
    await flushPromises();
    await flushPromises();

    expect(input.hasAttribute("aria-busy")).toBe(false);
    expect(input.dataset.timeoutFlash).toBe("true");
    expect(input.value).toBe("");
  });
});
