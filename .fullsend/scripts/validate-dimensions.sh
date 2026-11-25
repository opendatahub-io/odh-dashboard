#!/usr/bin/env bash
# Validate the locally extended Fullsend dimension contract before dispatch.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
REGISTRY="${ROOT_DIR}/.fullsend/dimensions.json"
SCHEMA="${ROOT_DIR}/.fullsend/schemas/review-result.schema.json"

fail() {
  echo "FAIL dimension registry: $*" >&2
  exit 1
}

schema_has_property() {
  jq -e --arg field "$1" '.properties[$field] != null' "${SCHEMA}" >/dev/null
}

validate_result_fields() {
  local id="$1" result_fields="$2" field
  jq -ne --argjson fields "${result_fields}" '($fields | type == "array" and length > 0) and all($fields[]; type == "string" and . != "")' >/dev/null || fail "${id}: result_fields must be a non-empty string array"
  while IFS= read -r field; do
    schema_has_property "${field}" || fail "${id}: result field ${field} is absent from result schema"
  done < <(jq -r '.[]' <<<"${result_fields}")
}

jq empty "${REGISTRY}" || fail "invalid JSON: ${REGISTRY}"
jq empty "${SCHEMA}" || fail "invalid JSON: ${SCHEMA}"

jq -e '
  (.dimensions | type == "array" and length > 0) and
  ([.dimensions[] | select((.kind != "llm-subagent") and (.kind != "llm-skill") and (.kind != "cli-adapter"))] | length == 0)
' "${REGISTRY}" >/dev/null || fail "kind must be llm-subagent, llm-skill, or cli-adapter"

# The orchestrator dispatches an LLM context row only through its pre-dispatch
# step, so one without the stage would never run, and the stage on any other
# row would hand reviewers something that is not a context brief.
jq -e '
  all(.dimensions[];
    (.kind == "llm-subagent" or .kind == "llm-skill") as $llm |
    ((.output // "findings") == "context") as $context |
    (.stage // "") as $stage |
    ($stage == "" or $stage == "pre-dispatch") and
    (($stage == "pre-dispatch") == ($llm and $context)))
' "${REGISTRY}" >/dev/null || fail "stage must be pre-dispatch on every LLM row with output context, and absent on every other row"

# A check:* row may declare the sub-checks its producer returns. Declaring them
# is optional: without checks[] the row is a single check whose id is the row
# id (the pre-multi-check contract). When declared, the set owns the row ids
# and labels, so validate its shape and keep the id namespace disjoint from
# producer ids — otherwise a sub-check and a producer could not be told apart.
jq -e '
  all(.dimensions[] | select(has("checks"));
    ((.output // "findings") | startswith("check:")) and
    (.checks | type == "array" and length > 0) and
    all(.checks[];
      (type == "object") and
      ((.id // "") | type == "string" and length > 0) and
      ((.label // "") | type == "string" and length > 0)) and
    ((.checks | map(.id) | unique | length) == (.checks | length)))
' "${REGISTRY}" >/dev/null || fail "checks[] is only valid on check:* rows and must be a non-empty array of unique {id,label} objects"

if ! jq -e '
  ([.dimensions[].id]) as $dims |
  ([.dimensions[] | .checks // [] | .[] | .id]) as $subs |
  (($subs | unique | length) == ($subs | length)) and
  (([$subs[] | select(. as $s | $dims | index($s))] | length) == 0)
' "${REGISTRY}" >/dev/null; then
  fail "declared checks[] ids must be unique across the registry and must not collide with a dimension id"
fi


while IFS=$'\t' read -r id label kind output definition meta result_fields inline_skill; do
  [[ -n "${id}" ]] || fail "dimension without id"
  [[ -n "${label}" ]] || fail "${id}: missing non-empty label"
  case "${output}" in
    findings|context) ;;
    section:*)
      section="${output#section:}"
      schema_has_property "${section}" || fail "${id}: section ${section} is absent from result schema"
      if [[ -n "${result_fields}" && "${result_fields}" != "[]" ]]; then
        validate_result_fields "${id}" "${result_fields}"
      fi
      ;;
    check:*)
      jq -e '."$defs".readiness_check != null' "${SCHEMA}" >/dev/null || fail "${id}: result schema lacks readiness_check"
      ;;
    signal:*)
      [[ -n "${result_fields}" && "${result_fields}" != "[]" ]] || fail "${id}: signal rows require result_fields"
      validate_result_fields "${id}" "${result_fields}"
      ;;
    *) fail "${id}: unsupported output ${output}" ;;
  esac

  if [[ "${kind}" == "llm-subagent" || "${kind}" == "llm-skill" ]]; then
    [[ -n "${definition}" && -f "${ROOT_DIR}/.fullsend/${definition}" ]] || fail "${id}: missing LLM definition ${definition:-<none>}"
    [[ -n "${meta}" && -f "${ROOT_DIR}/.fullsend/${meta}" ]] || fail "${id}: missing meta prompt ${meta:-<none>}"
  fi
  if [[ -n "${inline_skill}" && ! -f "${ROOT_DIR}/.fullsend/${inline_skill}" ]]; then
    # Expected for a skill the base harness supplies: the run log shows
    # docs-review loaded into the agent's skill namespace from the harness
    # cache, not from this repository. Report it so an inline_skill that
    # resolves in NEITHER place is visible — that one is silently dropped at
    # dispatch and nothing else reports it.
    printf 'NOTE dimension %s: inline_skill %s is not under .fullsend/ — it must resolve from the inherited harness skills\n' "${id}" "${inline_skill}" >&2
  fi
  if [[ "${kind}" == "cli-adapter" && "${output}" == context && -n "${meta}" ]]; then
    fail "${id}: cli context adapters must not declare an LLM meta prompt"
  fi
  printf 'PASS dimension %s (%s, %s, label=%s)\n' "${id}" "${kind}" "${output}" "${label}"
done < <(jq -r '.dimensions[] | [.id, (.label // ""), .kind, (.output // "findings"), (.definition // ""), (.meta_prompt // ""), (.result_fields // [] | @json), (.inline_skill // "")] | @tsv' "${REGISTRY}")

echo "Fullsend dimension registry contract is valid"
