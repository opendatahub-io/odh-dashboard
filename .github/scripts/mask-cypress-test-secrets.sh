#!/usr/bin/env bash
# Register GitHub Actions masks for credentials in Cypress test-variables.yml.
# Usage: mask-cypress-test-secrets.sh /path/to/test-variables.yml
set -euo pipefail

FILE="${1:-}"
if [[ -z "$FILE" || ! -f "$FILE" ]]; then
  echo "⚠️  test-variables file not found; skipping credential masking"
  exit 0
fi

mask_value() {
  local value="$1"
  if [[ -z "$value" || ${#value} -lt 3 ]]; then
    return 0
  fi
  echo "::add-mask::${value}"
  # Tests also embed these values as base64 in Secret YAML.
  echo "::add-mask::$(printf '%s' "${value}" | base64 | tr -d '\n')"
}

extract_scalar() {
  local key="$1"
  grep -E "^[[:space:]]*${key}:" "$FILE" 2>/dev/null | head -1 | sed -E "s/^[[:space:]]*${key}:[[:space:]]*//; s/[[:space:]]+$//; s/^['\"]//; s/['\"]$//" || true
}

# AWS keys used by AutoML / AutoRAG / Feature Store S3 helpers
mask_value "$(extract_scalar AWS_ACCESS_KEY_ID)"
mask_value "$(extract_scalar AWS_SECRET_ACCESS_KEY)"

# Other credentials from the same test config (same leak class if logged)
mask_value "$(extract_scalar NGC_API_KEY)"
mask_value "$(extract_scalar GEMINI_API_KEY)"
mask_value "$(extract_scalar OGX_API_KEY)"
mask_value "$(extract_scalar OCI_SECRET_VALUE)"

while IFS= read -r password; do
  mask_value "$password"
done < <(
  grep -E "^[[:space:]]*PASSWORD:" "$FILE" 2>/dev/null | sed -E "s/^[[:space:]]*PASSWORD:[[:space:]]*//; s/[[:space:]]+$//; s/^['\"]//; s/['\"]$//" || true
)

echo "✅ Registered GitHub Actions masks for test-variables credentials"
