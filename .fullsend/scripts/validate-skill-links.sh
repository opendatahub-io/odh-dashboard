#!/usr/bin/env bash
# Verify Fullsend's ODH skill links remain repository-relative and usable.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SKILLS_DIR="${ROOT_DIR}/.fullsend/skills"
EXPECTED_TARGET='../../.claude/skills'
SKILLS=(style-review rbac-review jira-pr-review test-impact-review pr-description-review ci-status-review ci-flake-classifier)
SANDBOX_SKILLS=(style-review rbac-review jira-pr-review test-impact-review pr-description-review)

package_dir=$(mktemp -d)
trap 'rm -rf "${package_dir}"' EXIT

fail=0
for skill in "${SKILLS[@]}"; do
  link="${SKILLS_DIR}/${skill}"
  target="${EXPECTED_TARGET}/${skill}"
  if [[ ! -L "${link}" ]]; then
    echo "FAIL ${skill}: expected repository-relative symlink at .fullsend/skills/${skill}" >&2
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
  for sandbox_skill in "${SANDBOX_SKILLS[@]}"; do
    [[ "${skill}" == "${sandbox_skill}" ]] || continue
    if ! grep -Fqx "  - skills/${skill}" "${ROOT_DIR}/.fullsend/harness/review.yaml"; then
      echo "FAIL ${skill}: harness does not declare skills/${skill} for sandbox packaging" >&2
      fail=1
      continue 2
    fi
    if ! cp -RL "${link}" "${package_dir}/${skill}" || [[ ! -f "${package_dir}/${skill}/SKILL.md" ]]; then
      echo "FAIL ${skill}: a dereferenced sandbox package cannot include its canonical target" >&2
      fail=1
    else
      echo "PASS ${skill}: dereferenced sandbox-package fixture includes canonical SKILL.md"
    fi
  done
done

if [[ "${fail}" -ne 0 ]]; then
  exit 1
fi

echo "All Fullsend canonical-skill link checks passed"
