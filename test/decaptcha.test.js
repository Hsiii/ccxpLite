const { describe, test, expect } = require("bun:test");

globalThis.CCXP_LITE = {};
require("../src/content.decaptcha.model.js");
const decaptcha = require("../src/content.decaptcha.js");

function createSyntheticPatches() {
  return Array.from({ length: 6 }, (_, digitIndex) => {
    const data = new Float32Array(3 * 24 * 16);
    let writeIndex = 0;

    for (let channel = 0; channel < 3; channel += 1) {
      for (let y = 0; y < 24; y += 1) {
        for (let x = 0; x < 16; x += 1) {
          const rawValue = ((digitIndex + 1) * 17) + (channel * 11) + (y * 3) + x;
          data[writeIndex] = (rawValue % 255) / 255;
          writeIndex += 1;
        }
      }
    }

    return decaptcha.__test.createTensor([3, 24, 16], data);
  });
}

describe("decaptcha preprocessing", () => {
  test("clamps width to 100 and splits into six patches", () => {
    const width = 120;
    const height = 2;
    const rgba = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = ((y * width) + x) * 4;
        rgba[index] = x;
        rgba[index + 1] = y * 50;
        rgba[index + 2] = 200;
        rgba[index + 3] = 255;
      }
    }

    const patches = decaptcha.__test.extractPatchesFromRgba(width, height, rgba);
    expect(patches).toHaveLength(6);
    expect(patches[0].shape).toEqual([3, 2, 16]);
    expect(patches[5].shape).toEqual([3, 2, 16]);
    expect(patches[0].data[0]).toBeCloseTo(0, 6);
    expect(patches[0].data[(3 * 16 * 2) - 1]).toBeCloseTo(200 / 255, 6);
  });

  test("rejects captcha images narrower than six pixels", () => {
    const rgba = new Uint8ClampedArray(5 * 2 * 4);
    expect(() => decaptcha.__test.extractPatchesFromRgba(5, 2, rgba)).toThrow("Captcha image is too narrow.");
  });
});

describe("decaptcha tensor ops", () => {
  test("computes conv2d with stride and padding", () => {
    const input = decaptcha.__test.createTensor([1, 3, 3], [
      1, 2, 3,
      4, 5, 6,
      7, 8, 9,
    ]);
    const weight = decaptcha.__test.createTensor([1, 1, 2, 2], [
      1, 0,
      0, 1,
    ]);
    const bias = decaptcha.__test.createTensor([1], [0.5]);

    const output = decaptcha.__test.conv2d(input, weight, bias, 1, 0);
    expect(output.shape).toEqual([1, 2, 2]);
    expect(Array.from(output.data)).toEqual([6.5, 8.5, 12.5, 14.5]);
  });

  test("computes batchnorm, relu, pool, linear, and argmax", () => {
    const input = decaptcha.__test.createTensor([1, 2, 2], [1, 2, 3, 4]);
    const gamma = decaptcha.__test.createTensor([1], [2]);
    const beta = decaptcha.__test.createTensor([1], [1]);
    const mean = decaptcha.__test.createTensor([1], [2]);
    const variance = decaptcha.__test.createTensor([1], [4]);

    const normalized = decaptcha.__test.batchnorm2d(input, gamma, beta, mean, variance, 0);
    expect(Array.from(normalized.data)).toEqual([0, 1, 2, 3]);

    const relu = decaptcha.__test.relu(decaptcha.__test.createTensor([1, 2, 2], [-2, -1, 0, 3]));
    expect(Array.from(relu.data)).toEqual([0, 0, 0, 3]);

    const pooled = decaptcha.__test.adaptiveAvgPool2d2x2(decaptcha.__test.createTensor([1, 4, 4], [
      1, 2, 3, 4,
      5, 6, 7, 8,
      9, 10, 11, 12,
      13, 14, 15, 16,
    ]));
    expect(Array.from(pooled.data)).toEqual([3.5, 5.5, 11.5, 13.5]);

    const logits = decaptcha.__test.linear(
      new Float32Array([1, 2, 3]),
      decaptcha.__test.createTensor([2, 3], [
        1, 0, 1,
        0, 1, 0,
      ]),
      decaptcha.__test.createTensor([2], [0.5, -1]),
    );
    expect(Array.from(logits)).toEqual([4.5, 1]);
    expect(decaptcha.__test.argmax(logits)).toBe(0);
  });
});

describe("decaptcha model parity", () => {
  test("matches the Python reference answer on deterministic synthetic patches", () => {
    const answer = decaptcha.__test.predictDigitsForPatches(createSyntheticPatches());
    expect(answer).toBe("444444");
  });
});
