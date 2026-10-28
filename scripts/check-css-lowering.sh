#!/usr/bin/env bash
# Guard for RHOAIENG-100835: fail when emitted production CSS contains the
# :lang() RTL fallback selectors LightningCSS emits when it lowers CSS logical
# properties (its default 'fully supports es6' targets). The lowering beats
# PatternFly contextual-override specificity and only appears in production
# builds, so it must not re-enter built output silently.
#
# Usage: check-css-lowering.sh <dist-dir> [<dist-dir> ...]
# Invoked from PR Build Validation against the host image's frontend/public
# and each module image's /static output.
set -euo pipefail

# LightningCSS emits :lang(ae) (Avestan) only as part of its generated RTL
# fallback selector lists; no ODH Dashboard source or dependency uses it.
SIGNATURE=':lang(ae)'

if [ "$#" -eq 0 ]; then
  echo "Usage: $0 <dist-dir> [<dist-dir> ...]" >&2
  exit 2
fi

offenders=$(grep -R -l -F "$SIGNATURE" "$@" --include='*.css' 2>/dev/null || true)
if [ -n "$offenders" ]; then
  echo "❌ FAIL: LightningCSS logical-properties lowering found in:" >&2
  echo "$offenders" | sed 's/^/  - /' >&2
  echo >&2
  echo "Found \"${SIGNATURE}\" — emitted when the minimizer lowers logical properties" >&2
  echo "into physical values plus :lang() RTL fallbacks (default es6 targets)." >&2
  echo "Fix: build with lightningCssMinimizerOptions from @odh-dashboard/app-config/rspack" >&2
  echo "(exclude: { logicalProperties: true }). See RHOAIENG-100835." >&2
  exit 1
fi

count=$(find "$@" -name '*.css' -type f 2>/dev/null | wc -l | tr -d ' ')
echo "✅ PASS: no logical-properties lowering in ${count} CSS file(s)"
