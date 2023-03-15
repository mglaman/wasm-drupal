#!/bin/bash
set -x
set -eu
set -o pipefail

docker build . --tag=wasm-drupal
docker run --name wasm-drupal-tmp --rm -v $(pwd)/../drupal:/output wasm-drupal sh -c cp -r /root/output/* /output/
