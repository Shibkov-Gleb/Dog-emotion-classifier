import json
import os
import sys
import tempfile


def normalize(value):
    if isinstance(value, list):
        for item in value:
            normalize(item)
        return

    if not isinstance(value, dict):
        return

    if value.get("class_name") == "InputLayer":
        config = value.get("config", {})
        if "batch_shape" in config and "batch_input_shape" not in config:
            config["batch_input_shape"] = config.pop("batch_shape")

    for child in value.values():
        normalize(child)


def main():
    model_path = sys.argv[1]
    with open(model_path, encoding="utf-8") as model_file:
        model = json.load(model_file)

    normalize(model)

    output_dir = os.path.dirname(model_path)
    file_descriptor, temporary_path = tempfile.mkstemp(
        dir=output_dir,
        prefix="model-",
        suffix=".json.tmp",
    )
    try:
        with os.fdopen(file_descriptor, "w", encoding="utf-8") as output_file:
            json.dump(model, output_file, separators=(",", ":"))
        os.replace(temporary_path, model_path)
        os.chmod(model_path, 0o644)
    finally:
        if os.path.exists(temporary_path):
            os.remove(temporary_path)


if __name__ == "__main__":
    main()
