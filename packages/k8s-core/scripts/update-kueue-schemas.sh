#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/crd-fetch.sh
source "${SCRIPT_DIR}/lib/crd-fetch.sh"

FIXTURE_DIR="${SCRIPT_DIR}/../src/__tests__/fixtures/kueue-crds"
VERSIONS_FILE="${SCRIPT_DIR}/VERSIONS"
mkdir -p "${FIXTURE_DIR}"

if [[ -z "${KUEUE_TAG:-}" ]] && [[ -f "${VERSIONS_FILE}" ]]; then
  # shellcheck source=/dev/null
  source "${VERSIONS_FILE}"
fi

if [[ "${KUEUE_TAG:-}" == "latest" ]] || [[ -z "${KUEUE_TAG:-}" ]]; then
  KUEUE_TAG="$(fetch_json https://api.github.com/repos/kubernetes-sigs/kueue/releases/latest | jq -r .tag_name)"
fi

if [[ -z "${KUEUE_TAG}" || "${KUEUE_TAG}" == "null" ]]; then
  echo "::error::Failed to resolve Kueue release tag (check GITHUB_TOKEN / rate limits)" >&2
  exit 1
fi

echo "Fetching Kueue ${KUEUE_TAG}"

KUEUE_BASE="https://raw.githubusercontent.com/kubernetes-sigs/kueue/${KUEUE_TAG}/config/components/crd/bases"
for crd in \
  kueue.x-k8s.io_workloads.yaml \
  kueue.x-k8s.io_clusterqueues.yaml \
  kueue.x-k8s.io_localqueues.yaml \
  kueue.x-k8s.io_workloadpriorityclasses.yaml \
  kueue.x-k8s.io_cohorts.yaml \
  kueue.x-k8s.io_resourceflavors.yaml; do
  fetch_crd "${KUEUE_BASE}/${crd}" "${FIXTURE_DIR}/${crd}"
done

echo "Done. Run 'npm run test:contract' to validate."
echo "RESOLVED_KUEUE_TAG=${KUEUE_TAG}"
