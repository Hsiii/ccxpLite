function isOauthArray<T>(value: unknown): value is T[] {
  return value !== null && typeof value === "object" && value.constructor === Array;
}

function toOauthUint8Array(imageBytes: unknown) {
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

async function loadOauthImage(objectUrl: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener(
      "load",
      () => {
        resolve(image);
      },
      { once: true },
    );
    image.addEventListener(
      "error",
      () => {
        reject(new Error("Failed to decode captcha image."));
      },
      { once: true },
    );
    image.src = objectUrl;
  });
}

function createOauthTensor(
  shape: readonly number[],
  data: Float32Array | ArrayLike<number>,
): CcxpLitePreparedTensor {
  return {
    shape: [...shape],
    data: data instanceof Float32Array ? data : new Float32Array(data),
  };
}

function oauthTensorGet(tensor: CcxpLitePreparedTensor, indices: readonly number[]) {
  let flatIndex = 0;
  let stride = 1;
  for (let axis = tensor.shape.length - 1; axis >= 0; axis--) {
    flatIndex += indices[axis] * stride;
    stride *= tensor.shape[axis];
  }
  return tensor.data[flatIndex];
}

function oauthLinear(
  inputVector: Float32Array | readonly number[],
  weight: CcxpLitePreparedTensor,
  bias?: CcxpLitePreparedTensor,
) {
  const [outFeatures, inFeatures] = weight.shape;
  const out = new Float32Array(outFeatures);
  for (let outIndex = 0; outIndex < outFeatures; outIndex++) {
    const base = outIndex * inFeatures;
    let acc = bias?.data[outIndex] ?? 0;
    for (let inIndex = 0; inIndex < inFeatures; inIndex++) {
      acc += weight.data[base + inIndex] * inputVector[inIndex];
    }
    out[outIndex] = acc;
  }
  return out;
}

function oauthArgmax(values: Float32Array | readonly number[]) {
  let bestIndex = 0;
  let bestValue = values[0];
  for (let index = 1; index < values.length; index++) {
    if (values[index] > bestValue) {
      bestIndex = index;
      bestValue = values[index];
    }
  }
  return bestIndex;
}

function isOauthImageElement(value: unknown): value is HTMLImageElement {
  return typeof HTMLImageElement !== "undefined" && value instanceof HTMLImageElement;
}

function flattenOauthFeatureTokens(featureTensor: CcxpLitePreparedTensor): readonly Float32Array[] {
  const [channels, height, width] = featureTensor.shape;
  const tokenCount = height * width;
  return Array.from({ length: tokenCount }, (_, tokenIndex) => {
    const token = new Float32Array(channels);
    const y = Math.floor(tokenIndex / width);
    const x = tokenIndex % width;
    for (const [channel] of token.entries()) {
      token[channel] = oauthTensorGet(featureTensor, [channel, y, x]);
    }
    return token;
  });
}

function addOauthPositionEmbedding(
  tokens: readonly Float32Array[],
  positionTensor: CcxpLitePreparedTensor,
): readonly Float32Array[] {
  return tokens.map((token, tokenIndex) => {
    const next = new Float32Array(token.length);
    for (const [channel, tokenValue] of token.entries()) {
      next[channel] = tokenValue + oauthTensorGet(positionTensor, [0, tokenIndex, channel]);
    }
    return next;
  });
}

function oauthSoftmax(values: Float32Array) {
  let maxValue = values[0];
  for (const value of values.subarray(1)) {
    if (value > maxValue) {
      maxValue = value;
    }
  }
  const out = new Float32Array(values.length);
  let total = 0;
  for (const [index, rawValue] of values.entries()) {
    const value = Math.exp(rawValue - maxValue);
    out[index] = value;
    total += value;
  }
  if (total === 0) {
    return out;
  }
  for (const [index, value] of out.entries()) {
    out[index] = value / total;
  }
  return out;
}

(function bootstrapCcxpLiteOauthDecaptcha(
  globalScope: typeof globalThis,
  factory: (globalScope: typeof globalThis) => {
    predictDigits: (imageBytes: unknown) => Promise<string>;
  },
) {
  const api = factory(globalScope as Window & typeof globalThis);
  const runtimeScope = globalScope as typeof globalThis & {
    CCXP_LITE?: CcxpLiteNamespace;
  };
  runtimeScope.CCXP_LITE ??= {};
  const namespace = runtimeScope.CCXP_LITE;
  namespace.oauthDecaptcha = api;
})(globalThis, (globalScope: typeof globalThis) => {
  const runtimeScope = globalScope as typeof globalThis & {
    CCXP_LITE?: {
      oauthDecaptchaModel?: CcxpLiteDecaptchaModel;
    };
    document?: Document;
  };
  const DIGITS = 4;
  const EPS = 1e-5;
  const FEATURE_HEIGHT = 5;
  const FEATURE_WIDTH = 10;

  function getNamespace() {
    runtimeScope.CCXP_LITE ??= {};
    return runtimeScope.CCXP_LITE as CcxpLiteNamespace;
  }

  function getPreparedModel(): CcxpLitePreparedModel {
    const namespace = getNamespace();
    const model = namespace.oauthDecaptchaModel;
    if (!model) {
      throw new Error("OAuth decaptcha model is not available.");
    }
    if (!model.preparedTensors) {
      const preparedTensors: Record<string, CcxpLitePreparedTensor> = {};
      for (const [name, tensor] of Object.entries(model.tensors ?? {})) {
        const sourceTensor = tensor;
        preparedTensors[name] = {
          shape: isOauthArray(sourceTensor.shape) ? [...sourceTensor.shape] : [],
          data:
            sourceTensor.data instanceof Float32Array
              ? sourceTensor.data
              : new Float32Array(sourceTensor.data ?? []),
        };
      }
      model.preparedTensors = preparedTensors;
    }
    return {
      digits: model.digits ?? DIGITS,
      eps: model.eps ?? EPS,
      cropRight: 0,
      featureHeight:
        typeof model.featureHeight === "number" && Number.isFinite(model.featureHeight)
          ? model.featureHeight
          : FEATURE_HEIGHT,
      featureWidth:
        typeof model.featureWidth === "number" && Number.isFinite(model.featureWidth)
          ? model.featureWidth
          : FEATURE_WIDTH,
      tensors: model.preparedTensors,
    };
  }

  async function decodeImageData(imageSource: unknown) {
    if (isOauthImageElement(imageSource)) {
      const image = imageSource;
      const width = image.naturalWidth > 0 ? image.naturalWidth : image.width;
      const height = image.naturalHeight > 0 ? image.naturalHeight : image.height;
      const canvas =
        typeof OffscreenCanvas === "undefined"
          ? runtimeScope.document.createElement("canvas")
          : new OffscreenCanvas(width, height);
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true }) as
        | OffscreenCanvasRenderingContext2D
        | CanvasRenderingContext2D
        | null;
      if (!context) {
        throw new Error("Failed to create 2d canvas context.");
      }
      context.drawImage(image, 0, 0);
      return {
        width,
        height,
        data: context.getImageData(0, 0, width, height).data,
      };
    }

    const bytes = toOauthUint8Array(imageSource);
    const blobBytes = new Uint8Array(bytes);
    if (typeof Blob === "undefined") {
      throw new TypeError("Blob is not available for captcha decoding.");
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

    const objectUrl = URL.createObjectURL(new Blob([blobBytes]));
    try {
      const image = await loadOauthImage(objectUrl);
      const canvas = runtimeScope.document.createElement("canvas");
      canvas.width = image.naturalWidth > 0 ? image.naturalWidth : image.width;
      canvas.height = image.naturalHeight > 0 ? image.naturalHeight : image.height;
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

  function extractImageTensorFromRgba(width: number, height: number, rgba: Uint8ClampedArray) {
    const tensorData = new Float32Array(3 * height * width);
    let writeIndex = 0;
    for (let channel = 0; channel < 3; channel++) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const pixelIndex = (y * width + x) * 4;
          tensorData[writeIndex] = rgba[pixelIndex + channel] / 255;
          writeIndex++;
        }
      }
    }
    return createOauthTensor([3, height, width], tensorData);
  }

  function conv2d(
    inputTensor: CcxpLitePreparedTensor,
    weight: CcxpLitePreparedTensor,
    bias?: CcxpLitePreparedTensor,
    options: {
      stride?: number;
      padding?: number;
      groups?: number;
    } = {},
  ) {
    const stride = options.stride ?? 1;
    const padding = options.padding ?? 0;
    const groups = options.groups ?? 1;
    const [, inHeight, inWidth] = inputTensor.shape;
    const [outChannels, channelsPerGroup, kernelHeight, kernelWidth] = weight.shape;
    const outHeight = Math.floor((inHeight + 2 * padding - kernelHeight) / stride) + 1;
    const outWidth = Math.floor((inWidth + 2 * padding - kernelWidth) / stride) + 1;
    const out = new Float32Array(outChannels * outHeight * outWidth);
    const outChannelsPerGroup = outChannels / groups;
    let outIndex = 0;
    for (let outChannel = 0; outChannel < outChannels; outChannel++) {
      const groupIndex = Math.floor(outChannel / outChannelsPerGroup);
      const inputChannelOffset = groupIndex * channelsPerGroup;
      for (let outY = 0; outY < outHeight; outY++) {
        for (let outX = 0; outX < outWidth; outX++) {
          let acc = bias ? bias.data[outChannel] : 0;
          const inY0 = outY * stride - padding;
          const inX0 = outX * stride - padding;
          for (let channelIndex = 0; channelIndex < channelsPerGroup; channelIndex++) {
            const inputChannel = inputChannelOffset + channelIndex;
            for (let kernelY = 0; kernelY < kernelHeight; kernelY++) {
              const inY = inY0 + kernelY;
              if (inY < 0 || inY >= inHeight) {
                continue;
              }
              for (let kernelX = 0; kernelX < kernelWidth; kernelX++) {
                const inX = inX0 + kernelX;
                if (inX < 0 || inX >= inWidth) {
                  continue;
                }
                acc +=
                  oauthTensorGet(inputTensor, [inputChannel, inY, inX]) *
                  oauthTensorGet(weight, [outChannel, channelIndex, kernelY, kernelX]);
              }
            }
          }
          out[outIndex] = acc;
          outIndex++;
        }
      }
    }
    return createOauthTensor([outChannels, outHeight, outWidth], out);
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
    for (let channel = 0; channel < channels; channel++) {
      const gain = gamma.data[channel];
      const offset = beta.data[channel];
      const mean = runningMean.data[channel];
      const variance = runningVar.data[channel];
      const invStd = 1 / Math.sqrt(variance + eps);
      for (let pixel = 0; pixel < height * width; pixel++) {
        out[index] = (inputTensor.data[index] - mean) * invStd * gain + offset;
        index++;
      }
    }
    return createOauthTensor(inputTensor.shape, out);
  }

  function relu(inputTensor: CcxpLitePreparedTensor) {
    const out = new Float32Array(inputTensor.data.length);
    for (let index = 0; index < inputTensor.data.length; index++) {
      out[index] = Math.max(inputTensor.data[index], 0);
    }
    return createOauthTensor(inputTensor.shape, out);
  }

  function addTensors(left: CcxpLitePreparedTensor, right: CcxpLitePreparedTensor) {
    const out = new Float32Array(left.data.length);
    for (let index = 0; index < left.data.length; index++) {
      out[index] = left.data[index] + right.data[index];
    }
    return createOauthTensor(left.shape, out);
  }

  function applyDepthwiseSeparableBlock(
    inputTensor: CcxpLitePreparedTensor,
    tensors: Readonly<Record<string, CcxpLitePreparedTensor>>,
    prefix: string,
    stride = 1,
  ) {
    let output = conv2d(inputTensor, tensors[`${prefix}.depthwise.weight`], undefined, {
      stride,
      padding: 1,
      groups: inputTensor.shape[0],
    });
    output = batchnorm2d(
      output,
      tensors[`${prefix}.depthwise_bn.weight`],
      tensors[`${prefix}.depthwise_bn.bias`],
      tensors[`${prefix}.depthwise_bn.running_mean`],
      tensors[`${prefix}.depthwise_bn.running_var`],
    );
    output = relu(output);
    output = conv2d(output, tensors[`${prefix}.pointwise.weight`], undefined, {
      stride: 1,
      padding: 0,
      groups: 1,
    });
    output = batchnorm2d(
      output,
      tensors[`${prefix}.pointwise_bn.weight`],
      tensors[`${prefix}.pointwise_bn.bias`],
      tensors[`${prefix}.pointwise_bn.running_mean`],
      tensors[`${prefix}.pointwise_bn.running_var`],
    );
    return relu(output);
  }

  function applyResidualBlock(
    inputTensor: CcxpLitePreparedTensor,
    tensors: Readonly<Record<string, CcxpLitePreparedTensor>>,
    prefix: string,
    stride = 1,
  ) {
    let output = applyDepthwiseSeparableBlock(inputTensor, tensors, `${prefix}.block.0`, stride);
    output = applyDepthwiseSeparableBlock(output, tensors, `${prefix}.block.1`, 1);
    let shortcut = inputTensor;
    if (Object.hasOwn(tensors, `${prefix}.shortcut.0.weight`)) {
      shortcut = conv2d(inputTensor, tensors[`${prefix}.shortcut.0.weight`], undefined, {
        stride,
        padding: 0,
        groups: 1,
      });
      shortcut = batchnorm2d(
        shortcut,
        tensors[`${prefix}.shortcut.1.weight`],
        tensors[`${prefix}.shortcut.1.bias`],
        tensors[`${prefix}.shortcut.1.running_mean`],
        tensors[`${prefix}.shortcut.1.running_var`],
      );
    }
    return relu(addTensors(output, shortcut));
  }

  function predictDigitsFromTensor(imageTensor: CcxpLitePreparedTensor) {
    const model = getPreparedModel();
    const { tensors } = model;
    let features = conv2d(imageTensor, tensors["stem.0.weight"], undefined, {
      stride: 2,
      padding: 1,
      groups: 1,
    });
    features = batchnorm2d(
      features,
      tensors["stem.1.weight"],
      tensors["stem.1.bias"],
      tensors["stem.1.running_mean"],
      tensors["stem.1.running_var"],
      model.eps,
    );
    features = relu(features);
    features = applyResidualBlock(features, tensors, "backbone.0", 1);
    features = applyResidualBlock(features, tensors, "backbone.1", 2);
    features = applyResidualBlock(features, tensors, "backbone.2", 2);
    features = applyResidualBlock(features, tensors, "backbone.3", 2);

    if (features.shape[1] !== model.featureHeight || features.shape[2] !== model.featureWidth) {
      throw new Error(
        `Unexpected OAuth feature map shape ${features.shape[1]}x${features.shape[2]}.`,
      );
    }

    const tokens = flattenOauthFeatureTokens(features);
    const positionedTokens = addOauthPositionEmbedding(tokens, tensors.position);
    const projectedTokens = positionedTokens.map((token) =>
      oauthLinear(token, tensors["attention_head.feature_proj.weight"]),
    );
    const queryTensor = tensors["attention_head.query"];

    const answers: string[] = [];
    for (let digitIndex = 0; digitIndex < model.digits; digitIndex++) {
      const attentionScores = new Float32Array(projectedTokens.length);
      for (const [tokenIndex, token] of projectedTokens.entries()) {
        let score = 0;
        for (const [channel, tokenValue] of token.entries()) {
          score += tokenValue * oauthTensorGet(queryTensor, [digitIndex, channel]);
        }
        attentionScores[tokenIndex] = score;
      }
      const attentionWeights = oauthSoftmax(attentionScores);
      const pooled = new Float32Array(queryTensor.shape[1]);
      for (const [tokenIndex, token] of positionedTokens.entries()) {
        const weight = attentionWeights[tokenIndex];
        for (const [channel, tokenValue] of token.entries()) {
          pooled[channel] += tokenValue * weight;
        }
      }
      const logits = oauthLinear(
        pooled,
        tensors[`attention_head.classifiers.${digitIndex}.weight`],
        tensors[`attention_head.classifiers.${digitIndex}.bias`],
      );
      answers.push(String(oauthArgmax(logits)));
    }

    return answers.join("");
  }

  async function predictDigits(imageBytes: unknown) {
    const imageData = await decodeImageData(imageBytes);
    const tensor = extractImageTensorFromRgba(imageData.width, imageData.height, imageData.data);
    return predictDigitsFromTensor(tensor);
  }

  return {
    predictDigits,
    __test: {
      createTensor: createOauthTensor,
      extractImageTensorFromRgba,
      conv2d,
      batchnorm2d,
      relu,
      linear: oauthLinear,
      argmax: oauthArgmax,
      softmax: oauthSoftmax,
      addTensors,
      predictDigitsFromTensor,
      getPreparedModel,
    },
  };
});
