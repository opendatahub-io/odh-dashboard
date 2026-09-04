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

fetch_crd() {
  local url="$1"
  local dest="$2"
  local name
  name="$(basename "${dest}")"
  if [[ -n "${GITHUB_TOKEN:-}" ]]; then
    curl --fail --silent --show-error --location -H "Authorization: Bearer ${GITHUB_TOKEN}" "${url}" -o "${dest}"
  else
    curl --fail --silent --show-error --location "${url}" -o "${dest}"
  fi
  if ! grep -q '^apiVersion: apiextensions.k8s.io/' "${dest}"; then
    echo "::error::Downloaded ${name} does not look like a CRD (missing apiextensions apiVersion)" >&2
    rm -f "${dest}"
    exit 1
  fi
  echo "  Updated ${name}"
}
