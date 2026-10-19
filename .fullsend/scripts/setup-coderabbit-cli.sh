#!/usr/bin/env bash
# Install the CodeRabbit CLI for a trusted host-adapter matrix job.
# This setup step runs before adapter credentials are injected.
#
# Always installs the latest CLI via the upstream installer. Feature
# requirements (review --remote / --deep) are expected to remain available
# on current releases; pin only if a future CLI breaks that contract.
set -euo pipefail

CODERABBIT_INSTALL_DIR="${RUNNER_TEMP:?RUNNER_TEMP is required}/coderabbit-bin"
installer="${RUNNER_TEMP}/coderabbit-install.sh"

export CODERABBIT_INSTALL_DIR CI=true
# The installer edits a shell profile when its destination is absent from PATH.
# The runner job uses GITHUB_ENV below, so advertise the temporary destination
# up front and keep the host profile untouched.
export PATH="${CODERABBIT_INSTALL_DIR}:${PATH}"
curl -fsSL https://cli.coderabbit.ai/install.sh -o "${installer}"
bash "${installer}"

coderabbit_bin="${CODERABBIT_INSTALL_DIR}/coderabbit"
if [[ ! -x "${coderabbit_bin}" ]]; then
  echo "::error::CodeRabbit CLI binary not found at ${coderabbit_bin}" >&2
  exit 1
fi

echo "Installed CodeRabbit CLI version: $("${coderabbit_bin}" --version | head -n 1)"

if [[ -n "${GITHUB_ENV:-}" ]]; then
  printf 'FULLSEND_ADAPTER_BIN=%s\n' "${coderabbit_bin}" >> "${GITHUB_ENV}"
else
  echo "FULLSEND_ADAPTER_BIN=${coderabbit_bin}"
fi
