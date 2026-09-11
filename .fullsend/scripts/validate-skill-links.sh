#!/usr/bin/env bash
# Verify Fullsend's ODH skill links remain repository-relative and usable.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SUBAGENTS_DIR="${ROOT_DIR}/.fullsend/skills/pr-review/sub-agents"
HOST_ADAPTERS_DIR="${ROOT_DIR}/.fullsend/skills/pr-review/host-adapters"
EXPECTED_TARGET='../../../../.claude/skills'
SKILLS=(style-review rbac-review jira-pr-review test-impact-review pr-description-review ci-status-review ci-flake-classifier)
SANDBOX_SKILLS=(style-review rbac-review jira-pr-review test-impact-review pr-description-review)

fail=0
for skill in "${SKILLS[@]}"; do
  if [[ " ${SANDBOX_SKILLS[*]} " == *" ${skill} "* ]]; then
    link="${SUBAGENTS_DIR}/${skill}"
    display_path=".fullsend/skills/pr-review/sub-agents/${skill}"
  else
    link="${HOST_ADAPTERS_DIR}/${skill}"
    display_path=".fullsend/skills/pr-review/host-adapters/${skill}"
  fi
  target="${EXPECTED_TARGET}/${skill}"
  if [[ ! -L "${link}" ]]; then
    echo "FAIL ${skill}: expected repository-relative symlink at ${display_path}" >&2
    fail=1
    continue
  fi
  if [[ "$(readlink "${link}")" != "${target}" ]]; then
    echo "FAIL ${skill}: expected link target ${target}, got $(readlink "${link}")" >&2
    fail=1
  fi
  if [[ ! -f "${link}/SKILL.md" ]]; then
    echo "FAIL ${skill}: canonical target .claude/skills/${skill}/SKILL.md is unavailable; land its canonical-skill change before enabling this Fullsend dimension" >&2
    fail=1
  else
    echo "PASS ${skill}: repository-relative link resolves to canonical SKILL.md"
  fi
  if [[ -e "${ROOT_DIR}/.fullsend/skills/${skill}" || -L "${ROOT_DIR}/.fullsend/skills/${skill}" ]]; then
    echo "FAIL ${skill}: review component must not also exist as a top-level Fullsend skill" >&2
    fail=1
  fi
  for sandbox_skill in "${SANDBOX_SKILLS[@]}"; do
    [[ "${skill}" == "${sandbox_skill}" ]] || continue
    if grep -Fqx "  - skills/${skill}" "${ROOT_DIR}/.fullsend/harness/review.yaml"; then
      echo "FAIL ${skill}: harness imports nested reviewer as a peer skill" >&2
      fail=1
      continue 2
    fi
    expected_definition="skills/pr-review/sub-agents/${skill}/SKILL.md"
    if ! jq -e --arg skill "${skill}" --arg definition "${expected_definition}" \
      '.dimensions[] | select(.id == $skill) | .definition == $definition' \
      "${ROOT_DIR}/.fullsend/dimensions.json" >/dev/null; then
      echo "FAIL ${skill}: dimension definition must be ${expected_definition}" >&2
      fail=1
    fi
  done
done

if ! grep -Fqx "  - skills/pr-review" "${ROOT_DIR}/.fullsend/harness/review.yaml"; then
  echo "FAIL pr-review: harness must package the orchestrator skill" >&2
  fail=1
else
  for skill in "${SANDBOX_SKILLS[@]}"; do
    definition="${ROOT_DIR}/.fullsend/skills/pr-review/sub-agents/${skill}/SKILL.md"
    if [[ ! -f "${definition}" ]]; then
      echo "FAIL ${skill}: target-checkout definition cannot resolve canonical SKILL.md" >&2
      fail=1
    else
      echo "PASS ${skill}: nested definition resolves from target checkout"
    fi
  done
fi

if [[ "${fail}" -ne 0 ]]; then
  exit 1
fi

echo "All Fullsend canonical-skill link checks passed"
