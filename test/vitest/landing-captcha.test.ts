import { describe, expect, test, vi } from "vitest";

import { createTestWindow, loadModules, sharedModulePaths } from "./helpers/module-loader.js";
import { createLandingLoginHtml } from "./helpers/landing-fixtures.js";

const landingCaptchaModulePaths = [
  ...sharedModulePaths,
  "src/landing/locale.ts",
  "src/landing/captcha.ts",
];

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("landing captcha", () => {
  test("binds once, shows loading, fills the input, and emits input/change events on success", async () => {
    const { window } = createTestWindow(createLandingLoginHtml());
    const predictDigits = vi.fn().mockResolvedValue("654321");
    window.CCXP_LITE.decaptcha = { predictDigits };
    loadModules(window, landingCaptchaModulePaths);

    let resolveFetch: ((value: Response) => void) | null = null;
    window.fetch = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    ) as typeof window.fetch;

    const input = window.document.querySelector("input[name='passwd2']") as HTMLInputElement;
    const inputSpy = vi.fn();
    const changeSpy = vi.fn();
    input.addEventListener("input", inputSpy);
    input.addEventListener("change", changeSpy);

    window.CCXP_LITE.landingCaptcha.enableLoginCaptchaAutofill(window.document, window.document);
    expect(input.getAttribute("aria-busy")).toBe("true");
    expect(window.document.querySelector("form")?.dataset.ccxpLiteCaptchaAutofillBound).toBe(
      "true",
    );

    resolveFetch?.({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    } as Response);
    await flushPromises();
    await flushPromises();

    expect(input.value).toBe("654321");
    expect(input.getAttribute("aria-busy")).toBe("false");
    expect(inputSpy).toHaveBeenCalled();
    expect(changeSpy).toHaveBeenCalled();

    window.CCXP_LITE.landingCaptcha.enableLoginCaptchaAutofill(window.document, window.document);
    expect((window.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0);
  });

  test("falls back to manual entry and flashes timeout on timeout-style failures", async () => {
    const { window } = createTestWindow(createLandingLoginHtml());
    window.CCXP_LITE.decaptcha = { predictDigits: vi.fn() };
    loadModules(window, landingCaptchaModulePaths);

    window.fetch = vi.fn(async () => {
      const error = new Error("captcha-timeout");
      error.name = "TimeoutError";
      throw error;
    }) as typeof window.fetch;

    const input = window.document.querySelector("input[name='passwd2']") as HTMLInputElement;
    window.CCXP_LITE.landingCaptcha.enableLoginCaptchaAutofill(window.document, window.document);
    await flushPromises();
    await flushPromises();

    expect(input.hasAttribute("aria-busy")).toBe(false);
    expect(input.getAttribute("data-timeout-flash")).toBe("true");
    expect(input.value).toBe("");
  });
});
