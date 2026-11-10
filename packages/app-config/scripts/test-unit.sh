#!/usr/bin/env bash
set -euo pipefail

jest --silent "$@"
node --test "$(dirname "$0")/package-subtree-files.integration.cjs"
