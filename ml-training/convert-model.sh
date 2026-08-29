#!/bin/sh
set -eu

input_path="${MODEL_INPUT_PATH:-/models/dog_emotion_resnet50.keras}"
output_dir="${MODEL_OUTPUT_DIR:-/models/tfjs}"
output_model="${output_dir}/model.json"
version_file="${output_dir}/.conversion-version"
conversion_version="2"

if [ -f "${output_model}" ] && \
   [ -f "${version_file}" ] && \
   [ "$(cat "${version_file}")" = "${conversion_version}" ]; then
  python /usr/local/bin/normalize-tfjs-model.py "${output_model}"
  echo "TensorFlow.js model already exists at ${output_model}; skipping conversion."
  exit 0
fi

if [ ! -f "${input_path}" ]; then
  echo "Keras model not found at ${input_path}." >&2
  exit 1
fi

temporary_dir="$(mktemp -d /models/.tfjs-conversion.XXXXXX)"
prepared_model="${temporary_dir}/deployment.h5"
temporary_output="${temporary_dir}/output"

cleanup() {
  rm -rf "${temporary_dir}"
}
trap cleanup EXIT INT TERM

mkdir -p "${temporary_output}"

echo "Converting ${input_path} to TensorFlow.js format..."
python /usr/local/bin/prepare-model.py "${input_path}" "${prepared_model}"
tensorflowjs_converter \
  --input_format=keras \
  "${prepared_model}" \
  "${temporary_output}"

if [ ! -f "${temporary_output}/model.json" ]; then
  echo "Conversion finished without creating model.json." >&2
  exit 1
fi

python /usr/local/bin/normalize-tfjs-model.py "${temporary_output}/model.json"
printf '%s' "${conversion_version}" > "${temporary_output}/.conversion-version"

mkdir -p "${output_dir}"
find "${output_dir}" -maxdepth 1 -type f \
  \( -name 'model.json' -o -name '*.bin' -o -name '.conversion-version' \) \
  -delete
find "${temporary_output}" -maxdepth 1 -type f \
  -exec mv '{}' "${output_dir}/" \;

echo "TensorFlow.js model created at ${output_model}."
