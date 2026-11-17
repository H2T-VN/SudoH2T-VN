"""Replay a saved evidence directory against the exact trusted model artifact."""
import argparse
import json

from app.evaluation.fingerprint import replay_case
from app.models.configurable_classifier import load_classifier


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--case", required=True, help="Directory containing fingerprint.json and PNG images")
    parser.add_argument("--artifacts", required=True, help="Trusted ONNX artifact bundle directory")
    parser.add_argument("--trusted-local-model", action="store_true", help="Operator-reviewed custom ONNX")
    args = parser.parse_args()
    record = replay_case(args.case, load_classifier(args.artifacts, trusted_local=args.trusted_local_model))
    print(json.dumps({"reproduced": True, "source_image_id": record["source_image_id"],
                      "failure_status": record["failure_status"], "image_sha256": record["image_sha256"]}))


if __name__ == "__main__":
    main()
