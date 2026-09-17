#!/usr/bin/env bash
# Install the pinned CodeRabbit CLI for a trusted host-adapter matrix job.
# This setup step runs before adapter credentials are injected.
set -euo pipefail

CODERABBIT_VERSION="0.7.6"
CODERABBIT_INSTALLER_SHA256="d7750952836a5082986e9168e1858d2871ae2d0bf929cf8ea607ac33a17ab8db"
CODERABBIT_INSTALL_DIR="${RUNNER_TEMP:?RUNNER_TEMP is required}/coderabbit-bin"
installer="${RUNNER_TEMP}/coderabbit-install.sh"

export CODERABBIT_VERSION CODERABBIT_INSTALL_DIR CI=true
# The installer edits a shell profile when its destination is absent from PATH.
# The runner job uses GITHUB_ENV below, so advertise the temporary destination
# up front and keep the host profile untouched.
export PATH="${CODERABBIT_INSTALL_DIR}:${PATH}"
curl -fsSL https://cli.coderabbit.ai/install.sh -o "${installer}"
actual_sha256="$(sha256sum "${installer}" | awk '{print $1}')"
[[ "${actual_sha256}" == "${CODERABBIT_INSTALLER_SHA256}" ]]
bash "${installer}"

coderabbit_bin="${CODERABBIT_INSTALL_DIR}/coderabbit"
installed_version="$("${coderabbit_bin}" --version | head -n 1)"
[[ "${installed_version}" == "${CODERABBIT_VERSION}" ]]

if [[ -n "${GITHUB_ENV:-}" ]]; then
  printf 'FULLSEND_ADAPTER_BIN=%s\n' "${coderabbit_bin}" >> "${GITHUB_ENV}"
else
  echo "FULLSEND_ADAPTER_BIN=${coderabbit_bin}"
fi
