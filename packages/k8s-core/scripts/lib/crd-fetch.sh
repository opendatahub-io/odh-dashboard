#!/usr/bin/env bash
# Shared CRD fetch utilities — source this file in update scripts.
# Usage: source "$(dirname "${BASH_SOURCE[0]}")/lib/crd-fetch.sh"

fetch_json() {
  local url="$1"
  if [[ -n "${GITHUB_TOKEN:-}" ]]; then
    curl --fail --silent --show-error --location -H "Authorization: Bearer ${GITHUB_TOKEN}" "${url}"
  else
    curl --fail --silent --show-error --location "${url}"
  fi
}

expected_crd_name() {
  local filename="$1"
  local base="${filename%.yaml}"
  local group="${base%_*}"
  local plural="${base#*_}"
  echo "${plural}.${group}"
}

validate_crd_file() {
  local dest="$1"
  local name
  name="$(basename "${dest}")"
  local expected actual
  expected="$(expected_crd_name "${name}")"

  if ! grep -q '^apiVersion: apiextensions.k8s.io/' "${dest}"; then
    echo "::error::Downloaded ${name} does not look like a CRD (missing apiextensions apiVersion)" >&2
    return 1
  fi

  actual="$(grep -E '^  name: ' "${dest}" | head -1 | awk '{print $2}')"
  if [[ -z "${actual}" ]]; then
    echo "::error::Downloaded ${name} is missing metadata.name" >&2
    return 1
  fi

  if [[ "${actual}" != "${expected}" ]]; then
    echo "::error::Downloaded ${name} has metadata.name=${actual}, expected ${expected}" >&2
    return 1
  fi

  return 0
}

download_crd_to() {
  local url="$1"
  local dest="$2"
  if [[ -n "${GITHUB_TOKEN:-}" ]]; then
    curl --fail --silent --show-error --location -H "Authorization: Bearer ${GITHUB_TOKEN}" "${url}" -o "${dest}"
  else
    curl --fail --silent --show-error --location "${url}" -o "${dest}"
  fi
  validate_crd_file "${dest}"
}

fetch_crd() {
  local url="$1"
  local dest="$2"
  local name
  name="$(basename "${dest}")"
  download_crd_to "${url}" "${dest}"
  echo "  Updated ${name}"
}

fetch_crds_staged() {
  local dest_dir="$1"
  shift
  local staging
  staging="$(mktemp -d)"
  local -a names=()
  local url dest name staging_dest

  while [[ $# -ge 2 ]]; do
    url="$1"
    dest="$2"
    shift 2
    name="$(basename "${dest}")"
    names+=("${name}")
    staging_dest="${staging}/${name}"
    if ! download_crd_to "${url}" "${staging_dest}"; then
      rm -rf "${staging}"
      return 1
    fi
  done

  mkdir -p "${dest_dir}"
  cp "${staging}/"* "${dest_dir}/"
  rm -rf "${staging}"

  for name in "${names[@]}"; do
    echo "  Updated ${name}"
  done
}

read_version_pin() {
  local file="$1"
  local var_name="$2"
  local value
  value="$(grep -E "^${var_name}=" "${file}" | tail -n1 | cut -d= -f2- | tr -d ' \"')"
  if [[ -z "${value}" ]] || [[ "${value}" == *';'* ]] || [[ "${value}" == *'|'* ]] || [[ "${value}" == *$'\n'* ]]; then
    echo "::error::Invalid ${var_name} in ${file}" >&2
    exit 1
  fi
  printf '%s' "${value}"
}
