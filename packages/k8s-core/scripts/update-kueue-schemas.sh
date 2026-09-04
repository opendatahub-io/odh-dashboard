#!/usr/bin/env bash
set -euo pipefail

FIXTURE_DIR="$(cd "$(dirname "$0")/../src/__tests__/fixtures/kueue-crds" && pwd)"
mkdir -p "${FIXTURE_DIR}"

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
    echo "::error::Downloaded ${name} does not look like a CRD (missing apiextensions apiVersion)"
    rm -f "${dest}"
    exit 1
  fi
  echo "  Updated ${name}"
}

KUEUE_TAG="$(fetch_json https://api.github.com/repos/kubernetes-sigs/kueue/releases/latest | jq -r .tag_name)"
TRAINER_TAG="$(fetch_json https://api.github.com/repos/kubeflow/trainer/releases/latest | jq -r .tag_name)"

if [[ -z "${KUEUE_TAG}" || "${KUEUE_TAG}" == "null" ]]; then
  echo "::error::Failed to resolve latest Kueue release tag (check GITHUB_TOKEN / rate limits)"
  exit 1
fi
if [[ -z "${TRAINER_TAG}" || "${TRAINER_TAG}" == "null" ]]; then
  echo "::error::Failed to resolve latest Trainer release tag (check GITHUB_TOKEN / rate limits)"
  exit 1
fi

echo "Fetching Kueue ${KUEUE_TAG}, Trainer ${TRAINER_TAG}"

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

TRAINER_BASE="https://raw.githubusercontent.com/kubeflow/trainer/${TRAINER_TAG}/manifests/base/crds"
for crd in \
  trainer.kubeflow.org_trainjobs.yaml \
  trainer.kubeflow.org_clustertrainingruntimes.yaml; do
  fetch_crd "${TRAINER_BASE}/${crd}" "${FIXTURE_DIR}/${crd}"
done

echo "Done. Run 'npm run test:contract' to validate."
