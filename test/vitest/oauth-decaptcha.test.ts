/* eslint-disable @typescript-eslint/no-restricted-imports */
import { describe, expect, test } from "vitest";

import * as oauthDecaptchaModelModule from "../../src/content.oauth.decaptcha.model.js";
import * as oauthDecaptchaModule from "../../src/content.oauth.decaptcha.js";

globalThis.CCXP_LITE ??= {} as CcxpLiteNamespace;
const namespace = globalThis.CCXP_LITE;

interface OauthDecaptchaTest {
  __test: {
    createTensor: (s: readonly number[], d: readonly number[]) => CcxpLitePreparedTensor;
    extractImageTensorFromRgba: (
      w: number,
      h: number,
      r: Uint8ClampedArray,
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
    linear: (
      i: Float32Array,
      w: CcxpLitePreparedTensor,
      b?: CcxpLitePreparedTensor,
    ) => Float32Array;
    argmax: (i: Float32Array) => number;
    softmax: (i: Float32Array) => Float32Array;
    addTensors: (l: CcxpLitePreparedTensor, r: CcxpLitePreparedTensor) => CcxpLitePreparedTensor;
    predictDigitsFromTensor: (t: CcxpLitePreparedTensor) => string;
    getPreparedModel: () => CcxpLitePreparedModel;
  };
  predictDigits: (imageBytes: ArrayBuffer) => Promise<string>;
}

const oauthDecaptcha = namespace.oauthDecaptcha as unknown as OauthDecaptchaTest;

describe("oauth decaptcha model bootstrap", () => {
  test("registers the generated model on the shared namespace", () => {
    expect(Object.keys(oauthDecaptchaModelModule)).toEqual([]);
    expect(namespace.oauthDecaptchaModel).toBeDefined();
  });
});

describe("oauth decaptcha runtime bootstrap", () => {
  test("registers the oauth decaptcha API on the shared namespace", () => {
    expect(Object.keys(oauthDecaptchaModule)).toEqual([]);
    expect(oauthDecaptcha).toBeDefined();
    expect(typeof oauthDecaptcha.predictDigits).toBe("function");
  });
});

describe("oauth decaptcha preprocessing", () => {
  test("converts a full OAuth captcha image into CHW float data", () => {
    const width = 150;
    const height = 80;
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

    const tensor = oauthDecaptcha.__test.extractImageTensorFromRgba(width, height, rgba);

    expect(tensor.shape).toEqual([3, 80, 150]);
    expect(tensor.data[0]).toBeCloseTo(0, 6);
    expect(tensor.data[80 * 150]).toBeCloseTo(0, 6);
    expect(tensor.data[3 * 80 * 150 - 1]).toBeCloseTo(200 / 255, 6);
  });
});

describe("oauth decaptcha tensor ops", () => {
  test("computes grouped conv2d, tensor addition, and softmax", () => {
    const input = oauthDecaptcha.__test.createTensor([2, 2, 2], [1, 2, 3, 4, 10, 20, 30, 40]);
    const weight = oauthDecaptcha.__test.createTensor([2, 1, 1, 1], [2, 3]);
    const output = oauthDecaptcha.__test.conv2d(input, weight, undefined, {
      groups: 2,
    });

    expect(output.shape).toEqual([2, 2, 2]);
    expect([...output.data]).toEqual([2, 4, 6, 8, 30, 60, 90, 120]);

    const added = oauthDecaptcha.__test.addTensors(
      oauthDecaptcha.__test.createTensor([1, 2, 2], [1, 2, 3, 4]),
      oauthDecaptcha.__test.createTensor([1, 2, 2], [4, 3, 2, 1]),
    );
    expect([...added.data]).toEqual([5, 5, 5, 5]);

    const softmax = oauthDecaptcha.__test.softmax(new Float32Array([0, 1]));
    expect(softmax[0] + softmax[1]).toBeCloseTo(1, 6);
    expect(softmax[1]).toBeGreaterThan(softmax[0]);
  });

  test("computes batchnorm, relu, linear, and argmax", () => {
    const input = oauthDecaptcha.__test.createTensor([1, 2, 2], [1, 2, 3, 4]);
    const gamma = oauthDecaptcha.__test.createTensor([1], [2]);
    const beta = oauthDecaptcha.__test.createTensor([1], [1]);
    const mean = oauthDecaptcha.__test.createTensor([1], [2]);
    const variance = oauthDecaptcha.__test.createTensor([1], [4]);
    const normalized = oauthDecaptcha.__test.batchnorm2d(input, gamma, beta, mean, variance, 0);

    expect([...normalized.data]).toEqual([0, 1, 2, 3]);

    const relu = oauthDecaptcha.__test.relu(
      oauthDecaptcha.__test.createTensor([1, 2, 2], [-2, -1, 0, 3]),
    );
    expect([...relu.data]).toEqual([0, 0, 0, 3]);

    const logits = oauthDecaptcha.__test.linear(
      new Float32Array([1, 2, 3]),
      oauthDecaptcha.__test.createTensor([2, 3], [1, 0, 1, 0, 1, 0]),
      oauthDecaptcha.__test.createTensor([2], [0.5, -1]),
    );
    expect([...logits]).toEqual([4.5, 1]);
    expect(oauthDecaptcha.__test.argmax(logits)).toBe(0);
  });
});

describe("oauth decaptcha model parity", () => {
  test("matches the Python reference answer on a deterministic synthetic full image", () => {
    const model = oauthDecaptcha.__test.getPreparedModel();
    const answer = oauthDecaptcha.__test.predictDigitsFromTensor(
      oauthDecaptcha.__test.extractImageTensorFromRgba(
        150,
        80,
        (() => {
          const width = 150;
          const height = 80;
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
      ),
    );

    expect(model.digits).toBe(4);
    expect(answer).toBe("2222");
  });
});
