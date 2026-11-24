#!/usr/bin/env bash
# Validate .fullsend/dimensions.json, the host-side producer registry that
# pre-review.sh (cli-adapter rows) and post-review.sh (labels, output kinds,
# finding categories) read. The stock pr-review skill dispatches reviewers
# from persona frontmatter, so nothing here checks reviewer definitions.
#
# Usage: validate-dimensions.sh [registry.json]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGISTRY="${1:-${SCRIPT_DIR}/../dimensions.json}"
# The category enum of the stock review-result schema (stock/README.md).
STOCK_CATEGORIES="${SCRIPT_DIR}/stock/review-categories.json"

fail() {
  echo "FAIL dimension registry: $*" >&2
  exit 1
}

jq empty "${REGISTRY}" 2>/dev/null || fail "invalid JSON: ${REGISTRY}"
jq -e 'type == "array" and length > 0 and all(.[]; type == "string" and . != "")' \
  "${STOCK_CATEGORIES}" >/dev/null 2>&1 || fail "invalid stock category list: ${STOCK_CATEGORIES}"

jq -e '(.dimensions | type == "array" and length > 0) and all(.dimensions[]; type == "object")' \
  "${REGISTRY}" >/dev/null || fail "dimensions must be a non-empty array of objects"

jq -e 'all(.dimensions[]; .id | type == "string" and test("^[a-z0-9][a-z0-9-]{0,63}$"))' \
  "${REGISTRY}" >/dev/null || fail "every row needs an id of lowercase letters, digits and hyphens"

jq -e '([.dimensions[].id] | length) == ([.dimensions[].id] | unique | length)' \
  "${REGISTRY}" >/dev/null || fail "duplicate id"

# One message per broken row. A findings row's categories are checked against
# the stock enum because reviewer findings are validated by the stock result
# schema and projected into the prior-review marker. cli-adapter rows are
# exempt: their findings are merged on the host and never reach that schema.
errors="$(jq -r --slurpfile stock "${STOCK_CATEGORIES}" '
  def nonempty_string: type == "string" and . != "";
  .dimensions[]
  | .id as $id
  | (
      (if (.label | nonempty_string) then empty else "missing non-empty label" end),
      (if (.kind | IN("llm-subagent", "llm-skill", "cli-adapter")) then empty
       else "kind must be llm-subagent, llm-skill, or cli-adapter" end),
      (if (.output | type == "string"
            and test("^(findings|context|(section|check|signal):[a-z0-9][a-z0-9_-]*)$")) then empty
       else "output must be findings, context, section:<name>, check:<name> or signal:<name>" end),
      (if (.failure_severity // "info" | IN("info", "low", "medium", "high", "critical")) then empty
       else "failure_severity must be a finding severity" end),
      (if has("result_fields") | not then empty
       elif (.result_fields | type == "array" and length > 0 and all(.[]; nonempty_string)) then empty
       else "result_fields must be a non-empty string array" end),
      (if (.output | type == "string" and startswith("signal:")) and (has("result_fields") | not)
       then "signal rows require result_fields" else empty end),
      (if .output != "findings" then
         (if has("categories") then "categories belong to findings rows only" else empty end)
       elif (.categories | type == "array" and length > 0 and all(.[]; nonempty_string)) | not then
         "findings rows need a non-empty categories array"
       elif .kind == "cli-adapter" then empty
       else (.categories - $stock[0]
             | if length == 0 then empty
               else "categories not in the stock review-result enum: " + join(", ") end)
       end)
    )
  | "\($id): \(.)"
' "${REGISTRY}")" || fail "could not evaluate ${REGISTRY}"
if [[ -n "${errors}" ]]; then
  while IFS= read -r line; do
    echo "FAIL dimension registry: ${line}" >&2
  done <<< "${errors}"
  exit 1
fi

jq -r '.dimensions[] | "PASS dimension \(.id) (\(.kind), \(.output), label=\(.label))"' "${REGISTRY}"
echo "Fullsend dimension registry contract is valid"
