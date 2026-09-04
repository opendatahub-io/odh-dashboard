#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../k8s-core/scripts/lib/crd-fetch.sh
source "${SCRIPT_DIR}/../../k8s-core/scripts/lib/crd-fetch.sh"

FIXTURE_DIR="${SCRIPT_DIR}/../src/__tests__/fixtures/trainer-crds"
VERSIONS_FILE="${SCRIPT_DIR}/VERSIONS"
mkdir -p "${FIXTURE_DIR}"

if [[ -z "${TRAINER_TAG:-}" ]] && [[ -f "${VERSIONS_FILE}" ]]; then
  # shellcheck source=/dev/null
  source "${VERSIONS_FILE}"
fi

if [[ "${TRAINER_TAG:-}" == "latest" ]] || [[ -z "${TRAINER_TAG:-}" ]]; then
  TRAINER_TAG="$(fetch_json https://api.github.com/repos/kubeflow/trainer/releases/latest | jq -r .tag_name)"
fi

if [[ -z "${TRAINER_TAG}" || "${TRAINER_TAG}" == "null" ]]; then
  echo "::error::Failed to resolve Trainer release tag (check GITHUB_TOKEN / rate limits)" >&2
  exit 1
fi

echo "Fetching Trainer ${TRAINER_TAG}"

TRAINER_BASE="https://raw.githubusercontent.com/kubeflow/trainer/${TRAINER_TAG}/manifests/base/crds"
for crd in \
  trainer.kubeflow.org_trainjobs.yaml \
  trainer.kubeflow.org_clustertrainingruntimes.yaml; do
  fetch_crd "${TRAINER_BASE}/${crd}" "${FIXTURE_DIR}/${crd}"
done

echo "Done. Run 'npm run test:contract' to validate."
echo "RESOLVED_TRAINER_TAG=${TRAINER_TAG}"
