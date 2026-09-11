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

jq empty "${REGISTRY}" || fail "invalid JSON: ${REGISTRY}"
jq empty "${SCHEMA}" || fail "invalid JSON: ${SCHEMA}"

jq -e '
  (.dimensions | type == "array" and length > 0) and
  ([.dimensions[] | select((.kind != "llm-subagent") and (.kind != "llm-skill") and (.kind != "cli-adapter"))] | length == 0)
' "${REGISTRY}" >/dev/null || fail "kind must be llm-subagent, llm-skill, or cli-adapter"

while IFS=$'\t' read -r id kind output definition meta result_fields inline_skill; do
  [[ -n "${id}" ]] || fail "dimension without id"
  case "${output}" in
    findings|context) ;;
    section:*)
      section="${output#section:}"
      jq -e --arg section "${section}" '.properties[$section] != null' "${SCHEMA}" >/dev/null || fail "${id}: section ${section} is absent from result schema"
      if [[ -n "${result_fields}" ]]; then
        jq -ne --argjson fields "${result_fields}" '($fields | type == "array" and length > 0) and all($fields[]; type == "string" and . != "")' >/dev/null || fail "${id}: result_fields must be a non-empty string array"
        while IFS= read -r field; do
          jq -e --arg field "${field}" '.properties[$field] != null' "${SCHEMA}" >/dev/null || fail "${id}: result field ${field} is absent from result schema"
        done < <(jq -r '.[]' <<<"${result_fields}")
      fi
      ;;
    check:*)
      jq -e '."$defs".readiness_check != null' "${SCHEMA}" >/dev/null || fail "${id}: result schema lacks readiness_check"
      ;;
    classifier:*)
      jq -e '."$defs".classifier_result != null' "${SCHEMA}" >/dev/null || fail "${id}: result schema lacks classifier_result"
      ;;
    *) fail "${id}: unsupported output ${output}" ;;
  esac

  if [[ "${kind}" == "llm-subagent" || "${kind}" == "llm-skill" ]]; then
    [[ -n "${definition}" && -f "${ROOT_DIR}/.fullsend/${definition}" ]] || fail "${id}: missing LLM definition ${definition:-<none>}"
    [[ -n "${meta}" && -f "${ROOT_DIR}/.fullsend/${meta}" ]] || fail "${id}: missing meta prompt ${meta:-<none>}"
  fi
  if [[ -n "${inline_skill}" && ! -f "${ROOT_DIR}/.fullsend/${inline_skill}" ]]; then
    # Not fatal: inline_skill may resolve against the agent's inherited
    # Fullsend skill namespace rather than this repository's .fullsend tree.
    # Surface it anyway — an inline_skill that resolves nowhere is silently
    # dropped at dispatch, and nothing else reports that.
    printf 'WARN dimension %s: inline_skill %s does not resolve under .fullsend/\n' "${id}" "${inline_skill}" >&2
  fi
  if [[ "${kind}" == "cli-adapter" && "${output}" == context && -n "${meta}" ]]; then
    fail "${id}: cli context adapters must not declare an LLM meta prompt"
  fi
  printf 'PASS dimension %s (%s, %s)\n' "${id}" "${kind}" "${output}"
done < <(jq -r '.dimensions[] | [.id, .kind, (.output // "findings"), (.definition // ""), (.meta_prompt // ""), (.result_fields // [] | @json), (.inline_skill // "")] | @tsv' "${REGISTRY}")

echo "Fullsend dimension registry contract is valid"
