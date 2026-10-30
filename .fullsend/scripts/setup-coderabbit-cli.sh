#!/usr/bin/env bash
# Install the CodeRabbit CLI for the coderabbit host adapter. pre-review.sh
# runs it in the review job before the adapter, with an allowlisted
# environment that holds no credentials, and reads the binary path from
# FULLSEND_ADAPTER_ENV_FILE.
#
# Always installs the latest CLI via the upstream installer. Feature
# requirements (review --remote / --deep) are expected to remain available
# on current releases; pin only if a future CLI breaks that contract.
set -euo pipefail

CODERABBIT_INSTALL_DIR="${RUNNER_TEMP:?RUNNER_TEMP is required}/coderabbit-bin"
installer="${RUNNER_TEMP}/coderabbit-install.sh"

export CODERABBIT_INSTALL_DIR CI=true
# The installer edits a shell profile when its destination is absent from PATH.
# The adapter gets the path from the env file below, so advertise the
# temporary destination up front and keep the host profile untouched.
export PATH="${CODERABBIT_INSTALL_DIR}:${PATH}"
curl -fsSL https://cli.coderabbit.ai/install.sh -o "${installer}"
bash "${installer}"

coderabbit_bin="${CODERABBIT_INSTALL_DIR}/coderabbit"
if [[ ! -x "${coderabbit_bin}" ]]; then
  echo "::error::CodeRabbit CLI binary not found at ${coderabbit_bin}" >&2
  exit 1
fi

echo "Installed CodeRabbit CLI version: $("${coderabbit_bin}" --version | head -n 1)"

if [[ -n "${FULLSEND_ADAPTER_ENV_FILE:-}" ]]; then
  printf 'FULLSEND_ADAPTER_BIN=%s\n' "${coderabbit_bin}" >> "${FULLSEND_ADAPTER_ENV_FILE}"
else
  echo "FULLSEND_ADAPTER_BIN=${coderabbit_bin}"
fi
