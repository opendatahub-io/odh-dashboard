#!/usr/bin/env bash
# Install the pinned CodeRabbit CLI for a trusted host-adapter matrix job.
# This setup step runs before adapter credentials are injected.
set -euo pipefail

# 0.7.7+ is required for `review --remote`, which reviews the PR server-side
# instead of checking fork code out next to the API key.
CODERABBIT_VERSION="0.7.8"
CODERABBIT_INSTALLER_SHA256="d0d6e3bf9abc95e4c93b40ad8b363940b69289fdb598fad53adc5e8951f84206"
CODERABBIT_INSTALL_DIR="${RUNNER_TEMP:?RUNNER_TEMP is required}/coderabbit-bin"
installer="${RUNNER_TEMP}/coderabbit-install.sh"

export CODERABBIT_VERSION CODERABBIT_INSTALL_DIR CI=true
# The installer edits a shell profile when its destination is absent from PATH.
# The runner job uses GITHUB_ENV below, so advertise the temporary destination
# up front and keep the host profile untouched.
export PATH="${CODERABBIT_INSTALL_DIR}:${PATH}"
curl -fsSL https://cli.coderabbit.ai/install.sh -o "${installer}"
actual_sha256="$(sha256sum "${installer}" | awk '{print $1}')"
if [[ "${actual_sha256}" != "${CODERABBIT_INSTALLER_SHA256}" ]]; then
  echo "::error::CodeRabbit installer checksum mismatch: expected ${CODERABBIT_INSTALLER_SHA256}, got ${actual_sha256}" >&2
  exit 1
fi
bash "${installer}"

coderabbit_bin="${CODERABBIT_INSTALL_DIR}/coderabbit"
installed_version="$("${coderabbit_bin}" --version | head -n 1)"
if [[ "${installed_version}" != "${CODERABBIT_VERSION}" ]]; then
  echo "::error::CodeRabbit CLI version mismatch: expected ${CODERABBIT_VERSION}, got ${installed_version}" >&2
  exit 1
fi

if [[ -n "${GITHUB_ENV:-}" ]]; then
  printf 'FULLSEND_ADAPTER_BIN=%s\n' "${coderabbit_bin}" >> "${GITHUB_ENV}"
else
  echo "FULLSEND_ADAPTER_BIN=${coderabbit_bin}"
fi
