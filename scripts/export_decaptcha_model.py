#!/usr/bin/env python3

import argparse
import io
import json
import pickle
import struct
import zipfile
from collections import OrderedDict
from pathlib import Path


class FloatStorage:
    pass


class LongStorage:
    pass


class TensorData:
    def __init__(self, shape, data):
        self.shape = tuple(int(value) for value in shape)
        self.data = data


class PTUnpickler(pickle.Unpickler):
    def find_class(self, module, name):
        if module == "collections" and name == "OrderedDict":
            return OrderedDict
        if module == "torch._utils" and name == "_rebuild_tensor_v2":
            return rebuild_tensor_v2
        if module == "torch" and name == "FloatStorage":
            return FloatStorage
        if module == "torch" and name == "LongStorage":
            return LongStorage
        raise ValueError(f"Unsupported pickle class: {module}.{name}")


def rebuild_tensor_v2(storage, storage_offset, size, stride, requires_grad, backward_hooks):
    shape = (size,) if isinstance(size, int) else tuple(size)

    if len(shape) == 0:
        return TensorData((), [storage[int(storage_offset)]])

    flat = []
    total = 1
    for dim in shape:
        total *= dim

    for linear_idx in range(total):
        rem = linear_idx
        storage_idx = int(storage_offset)
        for axis in range(len(shape) - 1, -1, -1):
            dim = shape[axis]
            idx = rem % dim
            rem //= dim
            storage_idx += idx * int(stride[axis])
        flat.append(storage[storage_idx])

    return TensorData(shape, flat)


def load_checkpoint(checkpoint_path):
    with zipfile.ZipFile(checkpoint_path, "r") as archive:
        storage_cache = {}
        root_prefix = archive.namelist()[0].split("/", 1)[0]

        def persistent_load(pid):
            if not isinstance(pid, tuple) or pid[0] != "storage":
                raise ValueError(f"Unexpected persistent id: {pid}")

            _, storage_type, key, location, size = pid
            size = int(size)
            cache_key = str(key)
            if cache_key in storage_cache:
                return storage_cache[cache_key]

            raw = archive.read(f"{root_prefix}/data/{cache_key}")
            if storage_type is FloatStorage:
                values = list(struct.unpack("<" + ("f" * size), raw[: 4 * size]))
            elif storage_type is LongStorage:
                values = list(struct.unpack("<" + ("q" * size), raw[: 8 * size]))
            else:
                raise ValueError(f"Unsupported storage type: {storage_type}")

            storage_cache[cache_key] = values
            return values

        unpickler = PTUnpickler(io.BytesIO(archive.read(f"{root_prefix}/data.pkl")))
        unpickler.persistent_load = persistent_load
        return unpickler.load()


def extract_state_dict(checkpoint):
    if isinstance(checkpoint, OrderedDict):
        return checkpoint
    if isinstance(checkpoint, dict):
        state_dict = checkpoint.get("state_dict")
        if isinstance(state_dict, (OrderedDict, dict)):
            return state_dict
    raise ValueError("Unsupported checkpoint format: expected an OrderedDict or a dict with `state_dict`.")


def to_model_payload(checkpoint):
    state = extract_state_dict(checkpoint)
    tensors = {}
    for key, tensor in state.items():
        if key.endswith("num_batches_tracked"):
            continue
        tensors[key] = {
            "shape": list(tensor.shape),
            "data": tensor.data,
        }

    digits = checkpoint.get("digits", 6) if isinstance(checkpoint, dict) else 6
    return {
      "digits": digits,
      "eps": 1e-5,
      "tensors": tensors,
    }


def render_model_script(payload):
    payload_json = json.dumps(payload, ensure_ascii=True, separators=(",", ":"))
    return """(function bootstrapCcxpLiteDecaptchaModel(globalScope, factory) {
  const model = factory();
  const namespace = globalScope.CCXP_LITE || (globalScope.CCXP_LITE = {});
  namespace.decaptchaModel = model;

  if (typeof module === "object" && module.exports) {
    module.exports = model;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createCcxpLiteDecaptchaModel() {
  return %s;
});
""" % payload_json


def main():
    project_root = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(description="Export the ccxp decaptcha checkpoint into a bundled JS model file.")
    parser.add_argument(
        "--checkpoint",
        default=str(project_root.parent / "ccxpDecaptcha" / "out" / "best.pt"),
        help="Path to the source checkpoint.",
    )
    parser.add_argument(
        "--output",
        default=str(project_root / "src" / "content.decaptcha.model.js"),
        help="Path to the generated JS file.",
    )
    args = parser.parse_args()

    checkpoint_path = Path(args.checkpoint).resolve()
    output_path = Path(args.output).resolve()
    checkpoint = load_checkpoint(checkpoint_path)
    output_path.write_text(render_model_script(to_model_payload(checkpoint)), encoding="utf-8")


if __name__ == "__main__":
    main()
