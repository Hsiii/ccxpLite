#!/usr/bin/env python3

import argparse

from pathlib import Path

from export_decaptcha_model import load_checkpoint, render_model_script, to_model_payload


def main():
    project_root = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(
        description="Export the inquire decaptcha checkpoint into a bundled TS model file."
    )
    parser.add_argument(
        "--checkpoint",
        default=str(project_root.parent / "ccxpDecaptcha" / "out" / "inquire" / "checkpoints" / "best.pt"),
        help="Path to the source checkpoint.",
    )
    parser.add_argument(
        "--output",
        default=str(project_root / "src" / "inquire" / "decaptcha.model.ts"),
        help="Path to the generated TS file.",
    )
    args = parser.parse_args()

    checkpoint_path = Path(args.checkpoint).resolve()
    output_path = Path(args.output).resolve()
    checkpoint = load_checkpoint(checkpoint_path)
    output_path.write_text(render_model_script(to_model_payload(checkpoint)), encoding="utf-8")


if __name__ == "__main__":
    main()
