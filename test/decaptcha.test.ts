/* eslint-disable @typescript-eslint/no-restricted-imports */
import { describe, test, expect } from "bun:test";
import * as decaptchaModelModule from "../src/content.decaptcha.model.js";
import * as decaptchaModule from "../src/content.decaptcha.js";

globalThis.CCXP_LITE = {} as CcxpLiteNamespace;
interface DecaptchaTest {
  __test: {
    createTensor: (s: readonly number[], d: readonly number[]) => CcxpLitePreparedTensor;
    extractImageTensorFromRgba: (
      w: number,
      h: number,
      r: Float32Array,
      o: unknown,
    ) => CcxpLitePreparedTensor;
    conv2d: (
      i: CcxpLitePreparedTensor,
      w: CcxpLitePreparedTensor,
      b: CcxpLitePreparedTensor | undefined,
      o?: {
        groups?: number;
      },
    ) => CcxpLitePreparedTensor;
    batchnorm2d: (
      i: CcxpLitePreparedTensor,
      w: CcxpLitePreparedTensor,
      b: CcxpLitePreparedTensor,
      m: CcxpLitePreparedTensor,
      v: CcxpLitePreparedTensor,
      e: number,
    ) => CcxpLitePreparedTensor;
    relu: (i: CcxpLitePreparedTensor) => CcxpLitePreparedTensor;
    adaptiveAvgPool2d: (i: CcxpLitePreparedTensor, s: readonly number[]) => CcxpLitePreparedTensor;
    linear: (i: Float32Array, w: CcxpLitePreparedTensor, b: CcxpLitePreparedTensor) => Float32Array;
    argmax: (i: Float32Array) => number;
    predictDigitsFromTensor: (t: CcxpLitePreparedTensor, m: unknown) => string;
    getPreparedModel: () => CcxpLitePreparedModel;
  };
  predictDigits: (imageBytes: ArrayBuffer) => Promise<string>;
}
const decaptchaModel = decaptchaModelModule as unknown;
const decaptcha = decaptchaModule as unknown as DecaptchaTest;
// eslint-disable-next-line no-void
void decaptchaModel;
describe("decaptcha preprocessing", () => {
  test("converts a cropped captcha image into CHW float data", () => {
    const width = 113;
    const height = 36;
    const rgba = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        rgba[index] = x % 256;
        rgba[index + 1] = y % 256;
        rgba[index + 2] = 200;
        rgba[index + 3] = 255;
      }
    }
    const tensor = decaptcha.__test.extractImageTensorFromRgba(width, height, rgba, {
      cropRight: 13,
    });
    expect(tensor.shape).toEqual([3, 36, 100]);
    expect(tensor.data[0]).toBeCloseTo(0, 6);
    expect(tensor.data[36 * 100]).toBeCloseTo(0, 6);
    expect(tensor.data[3 * 36 * 100 - 1]).toBeCloseTo(200 / 255, 6);
  });
});
describe("decaptcha tensor ops", () => {
  test("computes grouped conv2d for depthwise kernels", () => {
    const input = decaptcha.__test.createTensor([2, 2, 2], [1, 2, 3, 4, 10, 20, 30, 40]);
    const weight = decaptcha.__test.createTensor([2, 1, 1, 1], [2, 3]);
    const output = decaptcha.__test.conv2d(input, weight, undefined, {
      groups: 2,
    });
    expect(output.shape).toEqual([2, 2, 2]);
    expect([...output.data]).toEqual([2, 4, 6, 8, 30, 60, 90, 120]);
  });
  test("computes batchnorm, relu, adaptive avg pool, linear, and argmax", () => {
    const input = decaptcha.__test.createTensor([1, 2, 2], [1, 2, 3, 4]);
    const gamma = decaptcha.__test.createTensor([1], [2]);
    const beta = decaptcha.__test.createTensor([1], [1]);
    const mean = decaptcha.__test.createTensor([1], [2]);
    const variance = decaptcha.__test.createTensor([1], [4]);
    const normalized = decaptcha.__test.batchnorm2d(input, gamma, beta, mean, variance, 0);
    expect([...normalized.data]).toEqual([0, 1, 2, 3]);
    const relu = decaptcha.__test.relu(decaptcha.__test.createTensor([1, 2, 2], [-2, -1, 0, 3]));
    expect([...relu.data]).toEqual([0, 0, 0, 3]);
    const pooled = decaptcha.__test.adaptiveAvgPool2d(
      decaptcha.__test.createTensor(
        [1, 4, 4],
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
      ),
      1,
      2,
    );
    expect([...pooled.data]).toEqual([7.5, 9.5]);
    const logits = decaptcha.__test.linear(
      new Float32Array([1, 2, 3]),
      decaptcha.__test.createTensor([2, 3], [1, 0, 1, 0, 1, 0]),
      decaptcha.__test.createTensor([2], [0.5, -1]),
    );
    expect([...logits]).toEqual([4.5, 1]);
    expect(decaptcha.__test.argmax(logits)).toBe(0);
  });
});
describe("decaptcha model parity", () => {
  test("matches the Python reference answer on a deterministic synthetic full image", () => {
    const model = decaptcha.__test.getPreparedModel();
    const answer = decaptcha.__test.predictDigitsFromTensor(
      decaptcha.__test.extractImageTensorFromRgba(
        113,
        36,
        (() => {
          const width = 113;
          const height = 36;
          const rgba = new Uint8ClampedArray(width * height * 4);
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const index = (y * width + x) * 4;
              rgba[index] = (x * 3 + y) % 256;
              rgba[index + 1] = (x + y * 5) % 256;
              rgba[index + 2] = (x * 7 + y * 11) % 256;
              rgba[index + 3] = 255;
            }
          }
          return rgba;
        })(),
        model,
      ),
    );
    expect(answer).toBe("077774");
  });
});
