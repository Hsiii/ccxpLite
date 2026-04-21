(function bootstrapCcxpLiteDecaptcha(globalScope, factory) {
  const api = factory(globalScope);
  const namespace = globalScope.CCXP_LITE || (globalScope.CCXP_LITE = {});
  namespace.decaptcha = api;

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createCcxpLiteDecaptcha(globalScope) {
  const DIGITS = 6;
  const MAX_VALID_WIDTH = 100;
  const EPS = 1e-5;

  function getNamespace() {
    return globalScope.CCXP_LITE || (globalScope.CCXP_LITE = {});
  }

  function getPreparedModel() {
    const namespace = getNamespace();
    const model = namespace.decaptchaModel;

    if (!model) {
      throw new Error("Decaptcha model is not available.");
    }

    if (!model.preparedTensors) {
      const preparedTensors = {};
      Object.entries(model.tensors || {}).forEach(([name, tensor]) => {
        preparedTensors[name] = {
          shape: Array.isArray(tensor.shape) ? tensor.shape.slice() : [],
          data: tensor.data instanceof Float32Array ? tensor.data : new Float32Array(tensor.data),
        };
      });
      model.preparedTensors = preparedTensors;
    }

    return {
      digits: model.digits || DIGITS,
      maxValidWidth: model.maxValidWidth || MAX_VALID_WIDTH,
      eps: model.eps || EPS,
      tensors: model.preparedTensors,
    };
  }

  function toUint8Array(imageBytes) {
    if (imageBytes instanceof Uint8Array) {
      return imageBytes;
    }

    if (imageBytes instanceof ArrayBuffer) {
      return new Uint8Array(imageBytes);
    }

    if (ArrayBuffer.isView(imageBytes)) {
      return new Uint8Array(imageBytes.buffer, imageBytes.byteOffset, imageBytes.byteLength);
    }

    throw new TypeError("Expected captcha image bytes as ArrayBuffer or Uint8Array.");
  }

  function loadImage(objectUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Failed to decode captcha image."));
      image.src = objectUrl;
    });
  }

  async function decodeImageData(imageBytes) {
    const bytes = toUint8Array(imageBytes);

    if (typeof Blob === "undefined") {
      throw new Error("Blob is not available for captcha decoding.");
    }

    if (typeof createImageBitmap === "function" && typeof OffscreenCanvas !== "undefined") {
      const bitmap = await createImageBitmap(new Blob([bytes]));
      try {
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          throw new Error("Failed to create 2d canvas context.");
        }

        context.drawImage(bitmap, 0, 0);
        return {
          width: bitmap.width,
          height: bitmap.height,
          data: context.getImageData(0, 0, bitmap.width, bitmap.height).data,
        };
      } finally {
        if (typeof bitmap.close === "function") {
          bitmap.close();
        }
      }
    }

    if (!globalScope.document) {
      throw new Error("Document is not available for captcha decoding.");
    }

    const objectUrl = URL.createObjectURL(new Blob([bytes]));
    try {
      const image = await loadImage(objectUrl);
      const canvas = globalScope.document.createElement("canvas");
      canvas.width = image.naturalWidth || image.width;
      canvas.height = image.naturalHeight || image.height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        throw new Error("Failed to create 2d canvas context.");
      }

      context.drawImage(image, 0, 0);
      return {
        width: canvas.width,
        height: canvas.height,
        data: context.getImageData(0, 0, canvas.width, canvas.height).data,
      };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  function createTensor(shape, data) {
    return {
      shape: shape.slice(),
      data: data instanceof Float32Array ? data : new Float32Array(data),
    };
  }

  function tensorGet(tensor, indices) {
    let flatIndex = 0;
    let stride = 1;

    for (let axis = tensor.shape.length - 1; axis >= 0; axis -= 1) {
      flatIndex += indices[axis] * stride;
      stride *= tensor.shape[axis];
    }

    return tensor.data[flatIndex];
  }

  function extractPatchesFromRgba(width, height, rgba, options = {}) {
    const digits = options.digits || DIGITS;
    const maxValidWidth = options.maxValidWidth || MAX_VALID_WIDTH;
    const usableWidth = Math.min(width, maxValidWidth);

    if (usableWidth < digits) {
      throw new Error("Captcha image is too narrow.");
    }

    const widthPerDigit = Math.floor(usableWidth / digits);
    const splitPoints = [];
    for (let offset = 0; offset < usableWidth; offset += widthPerDigit) {
      splitPoints.push(offset);
    }

    if (splitPoints.length <= digits) {
      throw new Error("Captcha split points are invalid.");
    }

    const patches = [];

    for (let digitIndex = 0; digitIndex < digits; digitIndex += 1) {
      const x0 = splitPoints[digitIndex];
      const x1 = splitPoints[digitIndex + 1];
      const patchWidth = x1 - x0;
      const patchData = new Float32Array(3 * height * patchWidth);
      let writeIndex = 0;

      for (let channel = 0; channel < 3; channel += 1) {
        for (let y = 0; y < height; y += 1) {
          for (let x = x0; x < x1; x += 1) {
            const pixelIndex = ((y * width) + x) * 4;
            patchData[writeIndex] = rgba[pixelIndex + channel] / 255;
            writeIndex += 1;
          }
        }
      }

      patches.push(createTensor([3, height, patchWidth], patchData));
    }

    return patches;
  }

  function conv2d(inputTensor, weight, bias, stride = 2, padding = 1) {
    const [inChannels, inHeight, inWidth] = inputTensor.shape;
    const [outChannels, , kernelHeight, kernelWidth] = weight.shape;
    const outHeight = Math.floor((inHeight + (2 * padding) - kernelHeight) / stride) + 1;
    const outWidth = Math.floor((inWidth + (2 * padding) - kernelWidth) / stride) + 1;
    const out = new Float32Array(outChannels * outHeight * outWidth);

    let outIndex = 0;
    for (let outChannel = 0; outChannel < outChannels; outChannel += 1) {
      for (let outY = 0; outY < outHeight; outY += 1) {
        for (let outX = 0; outX < outWidth; outX += 1) {
          let acc = bias.data[outChannel];
          const inY0 = (outY * stride) - padding;
          const inX0 = (outX * stride) - padding;

          for (let inChannel = 0; inChannel < inChannels; inChannel += 1) {
            for (let kernelY = 0; kernelY < kernelHeight; kernelY += 1) {
              const inY = inY0 + kernelY;
              if (inY < 0 || inY >= inHeight) {
                continue;
              }

              for (let kernelX = 0; kernelX < kernelWidth; kernelX += 1) {
                const inX = inX0 + kernelX;
                if (inX < 0 || inX >= inWidth) {
                  continue;
                }

                acc += tensorGet(inputTensor, [inChannel, inY, inX]) * tensorGet(weight, [outChannel, inChannel, kernelY, kernelX]);
              }
            }
          }

          out[outIndex] = acc;
          outIndex += 1;
        }
      }
    }

    return createTensor([outChannels, outHeight, outWidth], out);
  }

  function batchnorm2d(inputTensor, gamma, beta, runningMean, runningVar, eps = EPS) {
    const [channels, height, width] = inputTensor.shape;
    const out = new Float32Array(inputTensor.data.length);
    let index = 0;

    for (let channel = 0; channel < channels; channel += 1) {
      const gain = gamma.data[channel];
      const offset = beta.data[channel];
      const mean = runningMean.data[channel];
      const variance = runningVar.data[channel];
      const invStd = 1 / Math.sqrt(variance + eps);

      for (let pixel = 0; pixel < height * width; pixel += 1) {
        out[index] = ((inputTensor.data[index] - mean) * invStd) * gain + offset;
        index += 1;
      }
    }

    return createTensor(inputTensor.shape, out);
  }

  function relu(inputTensor) {
    const out = new Float32Array(inputTensor.data.length);
    for (let index = 0; index < inputTensor.data.length; index += 1) {
      out[index] = inputTensor.data[index] > 0 ? inputTensor.data[index] : 0;
    }
    return createTensor(inputTensor.shape, out);
  }

  function adaptiveAvgPool2d2x2(inputTensor) {
    const [channels, inHeight, inWidth] = inputTensor.shape;
    const out = new Float32Array(channels * 4);
    let outIndex = 0;

    for (let channel = 0; channel < channels; channel += 1) {
      for (let outY = 0; outY < 2; outY += 1) {
        const y0 = Math.floor((outY * inHeight) / 2);
        const y1 = Math.ceil(((outY + 1) * inHeight) / 2);

        for (let outX = 0; outX < 2; outX += 1) {
          const x0 = Math.floor((outX * inWidth) / 2);
          const x1 = Math.ceil(((outX + 1) * inWidth) / 2);

          let total = 0;
          let count = 0;
          for (let inY = y0; inY < y1; inY += 1) {
            for (let inX = x0; inX < x1; inX += 1) {
              total += tensorGet(inputTensor, [channel, inY, inX]);
              count += 1;
            }
          }

          out[outIndex] = total / Math.max(count, 1);
          outIndex += 1;
        }
      }
    }

    return createTensor([channels, 2, 2], out);
  }

  function linear(inputVector, weight, bias) {
    const [outFeatures, inFeatures] = weight.shape;
    const out = new Float32Array(outFeatures);

    for (let outIndex = 0; outIndex < outFeatures; outIndex += 1) {
      const base = outIndex * inFeatures;
      let acc = bias.data[outIndex];
      for (let inIndex = 0; inIndex < inFeatures; inIndex += 1) {
        acc += weight.data[base + inIndex] * inputVector[inIndex];
      }
      out[outIndex] = acc;
    }

    return out;
  }

  function argmax(values) {
    let bestIndex = 0;
    let bestValue = values[0];

    for (let index = 1; index < values.length; index += 1) {
      if (values[index] > bestValue) {
        bestIndex = index;
        bestValue = values[index];
      }
    }

    return bestIndex;
  }

  function predictDigitsForPatches(patches) {
    const model = getPreparedModel();
    const tensors = model.tensors;
    const answer = [];

    patches.forEach((patch) => {
      let value = conv2d(patch, tensors["0.weight"], tensors["0.bias"], 2, 1);
      value = batchnorm2d(value, tensors["1.weight"], tensors["1.bias"], tensors["1.running_mean"], tensors["1.running_var"], model.eps);
      value = relu(value);

      value = conv2d(value, tensors["3.weight"], tensors["3.bias"], 2, 1);
      value = batchnorm2d(value, tensors["4.weight"], tensors["4.bias"], tensors["4.running_mean"], tensors["4.running_var"], model.eps);
      value = relu(value);

      value = adaptiveAvgPool2d2x2(value);
      answer.push(String(argmax(linear(value.data, tensors["8.weight"], tensors["8.bias"]))));
    });

    return answer.join("");
  }

  async function predictDigits(imageBytes) {
    const imageData = await decodeImageData(imageBytes);
    const patches = extractPatchesFromRgba(imageData.width, imageData.height, imageData.data, getPreparedModel());
    return predictDigitsForPatches(patches);
  }

  return {
    predictDigits,
    __test: {
      createTensor,
      extractPatchesFromRgba,
      conv2d,
      batchnorm2d,
      relu,
      adaptiveAvgPool2d2x2,
      linear,
      argmax,
      predictDigitsForPatches,
      getPreparedModel,
    },
  };
});
