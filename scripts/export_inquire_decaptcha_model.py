#!/usr/bin/env python3

import argparse
import json

from pathlib import Path

from export_decaptcha_model import extract_state_dict, load_checkpoint


def build_inquire_payload(checkpoint, digits: int, crop_right: int):
    state = extract_state_dict(checkpoint)
    tensors = {}

    for key, tensor in state.items():
        if key.endswith("num_batches_tracked"):
            continue
        if key.startswith("heads."):
            prefix, index_str, suffix = key.split(".", maxsplit=2)
            if int(index_str) >= digits:
                continue
        tensors[key] = {
            "shape": list(tensor.shape),
            "data": tensor.data,
        }

    return {
        "digits": digits,
        "eps": 1e-5,
        "cropRight": crop_right,
        "tensors": tensors,
    }


def render_inquire_model_script(payload):
    payload_json = json.dumps(payload, ensure_ascii=True, separators=(",", ":"))
    return """(() => {
  const serializedModel = '%s';
  const runtimeScope = globalThis as typeof globalThis & {
    CCXP_LITE?: CcxpLiteNamespace;
  };
  runtimeScope.CCXP_LITE ??= {};
  const namespace = runtimeScope.CCXP_LITE;
  const model = JSON.parse(serializedModel) as CcxpLiteDecaptchaModel;
  namespace.inquireDecaptchaModel = model;
})();
""" % payload_json


def main():
    project_root = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(
        description="Export a 3-head inquire decaptcha model from the 6-head CCXP checkpoint."
    )
    parser.add_argument(
        "--checkpoint",
        default=str(project_root.parent / "ccxpDecaptcha" / "out" / "ccxp" / "checkpoints" / "best.pt"),
        help="Path to the source checkpoint.",
    )
    parser.add_argument(
        "--output",
        default=str(project_root / "src" / "inquire" / "decaptcha.model.ts"),
        help="Path to the generated TS file.",
    )
    parser.add_argument(
        "--digits",
        type=int,
        default=3,
        help="Number of classifier heads to keep from the source checkpoint.",
    )
    parser.add_argument(
        "--crop-right",
        type=int,
        default=0,
        help="Right-side crop to apply in the browser runtime before inference.",
    )
    args = parser.parse_args()

    checkpoint_path = Path(args.checkpoint).resolve()
    output_path = Path(args.output).resolve()
    checkpoint = load_checkpoint(checkpoint_path)
    payload = build_inquire_payload(checkpoint, digits=args.digits, crop_right=args.crop_right)
    output_path.write_text(render_inquire_model_script(payload), encoding="utf-8")


if __name__ == "__main__":
    main()
