(function bootstrapCcxpLiteDecaptcha(
  globalScope: typeof globalThis,
  factory: (globalScope: typeof globalThis) => {
    predictDigits: (imageBytes: unknown) => Promise<string>;
  },
) {
  const api = factory(globalScope as Window & typeof globalThis);
  const runtimeScope = globalScope as typeof globalThis & { CCXP_LITE?: CcxpLiteNamespace };
  runtimeScope.CCXP_LITE ||= {};
  const namespace = runtimeScope.CCXP_LITE;
  namespace.decaptcha = api;

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
})(globalThis, (globalScope: typeof globalThis) => {
  const runtimeScope = globalScope as typeof globalThis & {
    CCXP_LITE?: {
      decaptchaModel?: CcxpLiteDecaptchaModel;
    };
    document?: Document;
  };
  const DIGITS = 6;
  const EPS = 1e-5;

  function getNamespace() {
    runtimeScope.CCXP_LITE ||= {};

    return runtimeScope.CCXP_LITE as CcxpLiteNamespace;
  }

  function getPreparedModel(): CcxpLitePreparedModel {
    const namespace = getNamespace();
    const model = namespace.decaptchaModel;

    if (!model) {
      throw new Error("Decaptcha model is not available.");
    }

    if (!model.preparedTensors) {
      const preparedTensors: Record<string, CcxpLitePreparedTensor> = {};
      Object.entries(model.tensors || {}).forEach(([name, tensor]) => {
        const sourceTensor = tensor;
        preparedTensors[name] = {
          shape: Array.isArray(sourceTensor.shape) ? sourceTensor.shape.slice() : [],
          data:
            sourceTensor.data instanceof Float32Array
              ? sourceTensor.data
              : new Float32Array(Array.from(sourceTensor.data || [])),
        };
      });
      model.preparedTensors = preparedTensors;
    }

    return {
      digits: model.digits || DIGITS,
      eps: model.eps || EPS,
      cropRight: Number.isFinite(model.cropRight) ? model.cropRight : 0,
      tensors: model.preparedTensors,
    };
  }

  function toUint8Array(imageBytes: unknown) {
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

  function loadImage(objectUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        resolve(image);
      };
      image.onerror = () => {
        reject(new Error("Failed to decode captcha image."));
      };
      image.src = objectUrl;
    });
  }

  async function decodeImageData(imageBytes: unknown) {
    const bytes = toUint8Array(imageBytes);
    const blobBytes = new Uint8Array(bytes);

    if (typeof Blob === "undefined") {
      throw new Error("Blob is not available for captcha decoding.");
    }

    if (typeof createImageBitmap === "function" && typeof OffscreenCanvas !== "undefined") {
      const bitmap = await createImageBitmap(new Blob([blobBytes]));
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

    if (!runtimeScope.document) {
      throw new Error("Document is not available for captcha decoding.");
    }

    const objectUrl = URL.createObjectURL(new Blob([blobBytes]));
    try {
      const image = await loadImage(objectUrl);
      const canvas = runtimeScope.document.createElement("canvas");
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

  function createTensor(
    shape: number[],
    data: Float32Array | ArrayLike<number>,
  ): CcxpLitePreparedTensor {
    return {
      shape: shape.slice(),
      data: data instanceof Float32Array ? data : new Float32Array(data),
    };
  }

  function tensorGet(tensor: CcxpLitePreparedTensor, indices: number[]) {
    let flatIndex = 0;
    let stride = 1;

    for (let axis = tensor.shape.length - 1; axis >= 0; axis -= 1) {
      flatIndex += indices[axis] * stride;
      stride *= tensor.shape[axis];
    }

    return tensor.data[flatIndex];
  }

  function extractImageTensorFromRgba(
    width: number,
    height: number,
    rgba: Uint8ClampedArray,
    options: { cropRight?: number } = {},
  ) {
    const cropRight = Math.max(0, Math.trunc(options.cropRight || 0));
    const usableWidth = width - cropRight;

    if (usableWidth <= 0) {
      throw new Error("Captcha crop removes the entire image width.");
    }

    const tensorData = new Float32Array(3 * height * usableWidth);
    let writeIndex = 0;

    for (let channel = 0; channel < 3; channel += 1) {
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < usableWidth; x += 1) {
          const pixelIndex = (y * width + x) * 4;
          tensorData[writeIndex] = rgba[pixelIndex + channel] / 255;
          writeIndex += 1;
        }
      }
    }

    return createTensor([3, height, usableWidth], tensorData);
  }

  function conv2d(
    inputTensor: CcxpLitePreparedTensor,
    weight: CcxpLitePreparedTensor,
    bias: CcxpLitePreparedTensor | null = null,
    options: { stride?: number; padding?: number; groups?: number } = {},
  ) {
    const stride = options.stride || 1;
    const padding = options.padding || 0;
    const groups = options.groups || 1;
    const [, inHeight, inWidth] = inputTensor.shape;
    const [outChannels, channelsPerGroup, kernelHeight, kernelWidth] = weight.shape;
    const outHeight = Math.floor((inHeight + 2 * padding - kernelHeight) / stride) + 1;
    const outWidth = Math.floor((inWidth + 2 * padding - kernelWidth) / stride) + 1;
    const out = new Float32Array(outChannels * outHeight * outWidth);
    const outChannelsPerGroup = outChannels / groups;

    let outIndex = 0;
    for (let outChannel = 0; outChannel < outChannels; outChannel += 1) {
      const groupIndex = Math.floor(outChannel / outChannelsPerGroup);
      const inputChannelOffset = groupIndex * channelsPerGroup;

      for (let outY = 0; outY < outHeight; outY += 1) {
        for (let outX = 0; outX < outWidth; outX += 1) {
          let acc = bias ? bias.data[outChannel] : 0;
          const inY0 = outY * stride - padding;
          const inX0 = outX * stride - padding;

          for (let channelIndex = 0; channelIndex < channelsPerGroup; channelIndex += 1) {
            const inputChannel = inputChannelOffset + channelIndex;

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

                acc +=
                  tensorGet(inputTensor, [inputChannel, inY, inX]) *
                  tensorGet(weight, [outChannel, channelIndex, kernelY, kernelX]);
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

  function batchnorm2d(
    inputTensor: CcxpLitePreparedTensor,
    gamma: CcxpLitePreparedTensor,
    beta: CcxpLitePreparedTensor,
    runningMean: CcxpLitePreparedTensor,
    runningVar: CcxpLitePreparedTensor,
    eps = EPS,
  ) {
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
        out[index] = (inputTensor.data[index] - mean) * invStd * gain + offset;
        index += 1;
      }
    }

    return createTensor(inputTensor.shape, out);
  }

  function relu(inputTensor: CcxpLitePreparedTensor) {
    const out = new Float32Array(inputTensor.data.length);
    for (let index = 0; index < inputTensor.data.length; index += 1) {
      out[index] = inputTensor.data[index] > 0 ? inputTensor.data[index] : 0;
    }
    return createTensor(inputTensor.shape, out);
  }

  function adaptiveAvgPool2d(
    inputTensor: CcxpLitePreparedTensor,
    outHeight: number,
    outWidth: number,
  ) {
    const [channels, inHeight, inWidth] = inputTensor.shape;
    const out = new Float32Array(channels * outHeight * outWidth);
    let outIndex = 0;

    for (let channel = 0; channel < channels; channel += 1) {
      for (let pooledY = 0; pooledY < outHeight; pooledY += 1) {
        const y0 = Math.floor((pooledY * inHeight) / outHeight);
        const y1 = Math.ceil(((pooledY + 1) * inHeight) / outHeight);

        for (let pooledX = 0; pooledX < outWidth; pooledX += 1) {
          const x0 = Math.floor((pooledX * inWidth) / outWidth);
          const x1 = Math.ceil(((pooledX + 1) * inWidth) / outWidth);

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

    return createTensor([channels, outHeight, outWidth], out);
  }

  function linear(
    inputVector: Float32Array | number[],
    weight: CcxpLitePreparedTensor,
    bias: CcxpLitePreparedTensor,
  ) {
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

  function argmax(values: Float32Array | number[]) {
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

  function applyDepthwiseSeparableBlock(
    inputTensor: CcxpLitePreparedTensor,
    tensors: Record<string, CcxpLitePreparedTensor>,
    prefix: string,
    options: { stride?: number } = {},
  ) {
    const stride = options.stride || 1;
    const inputChannels = inputTensor.shape[0];
    let output = conv2d(inputTensor, tensors[`${prefix}.0.weight`], null, {
      stride,
      padding: 1,
      groups: inputChannels,
    });
    output = batchnorm2d(
      output,
      tensors[`${prefix}.1.weight`],
      tensors[`${prefix}.1.bias`],
      tensors[`${prefix}.1.running_mean`],
      tensors[`${prefix}.1.running_var`],
    );
    output = relu(output);
    output = conv2d(output, tensors[`${prefix}.3.weight`], null, {
      stride: 1,
      padding: 0,
      groups: 1,
    });
    output = batchnorm2d(
      output,
      tensors[`${prefix}.4.weight`],
      tensors[`${prefix}.4.bias`],
      tensors[`${prefix}.4.running_mean`],
      tensors[`${prefix}.4.running_var`],
    );
    return relu(output);
  }

  function getHeadInputVectors(pooledTensor: CcxpLitePreparedTensor, digits: number) {
    const channels = pooledTensor.shape[0];
    const vectors: Float32Array[] = [];

    for (let digitIndex = 0; digitIndex < digits; digitIndex += 1) {
      const vector = new Float32Array(channels);
      for (let channel = 0; channel < channels; channel += 1) {
        vector[channel] = tensorGet(pooledTensor, [channel, 0, digitIndex]);
      }
      vectors.push(vector);
    }

    return vectors;
  }

  function predictDigitsFromTensor(imageTensor: CcxpLitePreparedTensor) {
    const model = getPreparedModel();
    const { tensors } = model;

    let features = conv2d(imageTensor, tensors["features.0.weight"], null, {
      stride: 2,
      padding: 1,
      groups: 1,
    });
    features = batchnorm2d(
      features,
      tensors["features.1.weight"],
      tensors["features.1.bias"],
      tensors["features.1.running_mean"],
      tensors["features.1.running_var"],
      model.eps,
    );
    features = relu(features);

    features = applyDepthwiseSeparableBlock(features, tensors, "features.3.block", { stride: 1 });
    features = applyDepthwiseSeparableBlock(features, tensors, "features.4.block", { stride: 2 });
    features = applyDepthwiseSeparableBlock(features, tensors, "features.5.block", { stride: 1 });

    const pooled = adaptiveAvgPool2d(features, 1, model.digits);
    const headInputs = getHeadInputVectors(pooled, model.digits);

    return headInputs
      .map((vector, digitIndex) => {
        const logits = linear(
          vector,
          tensors[`heads.${digitIndex}.weight`],
          tensors[`heads.${digitIndex}.bias`],
        );
        return String(argmax(logits));
      })
      .join("");
  }

  async function predictDigits(imageBytes) {
    const imageData = await decodeImageData(imageBytes);
    const tensor = extractImageTensorFromRgba(
      imageData.width,
      imageData.height,
      imageData.data,
      getPreparedModel(),
    );
    return predictDigitsFromTensor(tensor);
  }

  return {
    predictDigits,
    __test: {
      createTensor,
      extractImageTensorFromRgba,
      conv2d,
      batchnorm2d,
      relu,
      adaptiveAvgPool2d,
      linear,
      argmax,
      predictDigitsFromTensor,
      getPreparedModel,
    },
  };
});
