#!/usr/bin/env bash
# Encode a path for use in artifact filenames without collapsing distinct dirs.
# '/' → '__', leave '.' alone so "a/b" and "a.b" do not collide.
# Usage: encode-audit-path.sh <path>
set -euo pipefail
printf '%s' "${1:?path required}" | sed 's|/|__|g'
