#!/usr/bin/env bash
# Lint every deployment profile of this repository with kube-linter.
#
# Renders each profile with pinned kustomize/helm into temporary scratch
# outside the repository and lints the result with the pinned kube-linter and
# the repository's .kube-linter.yaml config. Run from any directory:
#
#   ./hack/lint-manifests.sh            # fail on findings (default)
#   KUBE_LINTER_FAIL_ON_FINDINGS=false ./hack/lint-manifests.sh  # warn only
#
# Requires: go, jq, bash 3.2+. Kustomize chart inflation is not used by any
# profile, so no helm executable is needed on PATH (the operator chart renders
# through the pinned helm module below).
set -uo pipefail

config=".kube-linter.yaml"
kube_linter_version="v0.8.3" # golang.stackrox.io/kube-linter, module-pinned

die() {
  printf 'kube-linter: ERROR: %s\n' "$1"
  exit 1
}

case "${KUBE_LINTER_FAIL_ON_FINDINGS-true}" in
  true) findings_level=ERROR ;;
  false) findings_level=WARNING ;;
  *) die "KUBE_LINTER_FAIL_ON_FINDINGS must be 'true' or 'false'" ;;
esac

if grep -qE '__PLACEHOLDER_[A-Z]' "${BASH_SOURCE[0]}"; then
  die "specialize the lint template before running it"
fi
cd "$(dirname "${BASH_SOURCE[0]}")/.." || die "cannot enter the repository root"
[ -f "$config" ] || die "lint configuration file is missing"
command -v go >/dev/null || die "Go is required"
command -v jq >/dev/null || die "jq is required"

umask 077
sarif_dir="${KUBE_LINTER_SARIF_DIR:-}"
if [ -n "$sarif_dir" ]; then
  mkdir -- "$sarif_dir" || die "cannot create the SARIF output directory"
  scratch="$sarif_dir/work"
  mkdir -- "$scratch" || die "cannot create temporary scratch"
else
  scratch="$(mktemp -d "${TMPDIR:-/tmp}/kube-linter.XXXXXX")" || die "cannot create temporary scratch"
fi
trap 'rm -rf -- "$scratch" 2>/dev/null || printf "%s\n" "kube-linter: WARNING: scratch cleanup failed"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
scratch_path="$(cd "$scratch" && pwd -P)" || die "cannot locate temporary scratch"
case "$scratch_path/" in "$(pwd -P)"/*) die "temporary scratch must be outside the repository" ;; esac

failed=0
incomplete=0
profiles=0

tool_log() {
  # Prefix tool text and neutralize legacy Actions command syntax.
  sed 's/[[:cntrl:]]/ /g; s/##\[/# #[/g; s/^/kube-linter:   /' "$1"
}

lint_profile() {
  local name="$1" entry="$2" status summary operational count known=true
  local rendered="$scratch_path/$1.yaml" report="$scratch_path/$1.sarif"
  local diagnostics="$scratch_path/stderr" text="$scratch_path/report.txt"
  shift 2
  case "$name" in ''|.*|*[!A-Za-z0-9._-]*) die "invalid lint profile name" ;; esac
  [ ! -e "$rendered" ] || die "duplicate lint profile name: $name"
  profiles=$((profiles + 1))
  if ! env GOFLAGS= GOWORK=off go run "$@" > "$rendered" 2> "$diagnostics"; then
    printf 'kube-linter: ERROR [%s] render failed (%s)\n' "$name" "$entry"
    tool_log "$diagnostics"
    failed=1 incomplete=1
    return
  fi
  if ! grep -Eq '^[[:space:]]*[^[:space:]#-]' "$rendered"; then
    printf 'kube-linter: ERROR [%s] render is empty (%s)\n' "$name" "$entry"
    failed=1 incomplete=1
    return
  fi
  # Drop comment-only documents. helm emits a "---\n# Source: <file>" header
  # per source file, so a file beginning with "---" (controller-gen CRDs, e.g.
  # dashboard-operator/charts/dashboard/crds/) yields a null document that
  # --fail-on-invalid-resource rejects. Such a document holds no object; the
  # filter changes which objects are linted for no renderer.
  if ! awk '
    function flushdoc() {
      if (content) printf "---\n%s", doc
      doc = ""; content = 0
    }
    BEGIN { doc = ""; content = 0 }
    /^---[[:space:]]*$/ { flushdoc(); next }
    {
      doc = doc $0 "\n"
      if ($0 !~ /^[[:space:]]*#/ && $0 !~ /^[[:space:]]*$/) content = 1
    }
    END { flushdoc() }
  ' "$rendered" > "$rendered.filtered"; then
    die "cannot filter the render for profile $name"
  fi
  mv -- "$rendered.filtered" "$rendered" || die "cannot replace the render for profile $name"
  tool_log "$diagnostics" || failed=1

  : > "$text" || die "cannot write the temporary text report"
  env GOFLAGS= GOWORK=off go run "golang.stackrox.io/kube-linter/cmd/kube-linter@$kube_linter_version" lint \
    --config "$config" --format plain --output "$text" --format sarif --output "$report" \
    --fail-if-no-objects-found --fail-on-invalid-resource "$rendered" > "$diagnostics" 2>&1
  status=$?
  if [ ! -s "$text" ] || ! IFS=$'\t' read -r summary operational count < <(jq -ers '
    select(length == 1) | .[0]
    | select(.version == "2.1.0" and (.runs | type == "array" and length == 1))
    | .runs[0]
    | select((.tool.driver.rules | type == "array" and length > 0)
        and all(.tool.driver.rules[]; .id | type == "string" and length > 0)
        and (.invocations[0].executionSuccessful | type == "boolean")
        and (.results == null or (.results | type == "array")))
    | (.tool.driver.rules | map(.id)) as $rules
    | (.results // []) as $results
    | select(all($results[]; (.message.text | type == "string")
        and (.ruleId as $id | $id == "failed-to-load-object" or ($rules | index($id) != null))))
    | [.invocations[0].executionSuccessful,
       ([$results[] | select(.ruleId == "failed-to-load-object" or
           (.message.text | startswith("error evaluating CEL check expression:")
                          or startswith("error while processing resource:")))] | length),
       ($results | length)] | @tsv
  ' "$report" 2>/dev/null); then
    printf 'kube-linter: ERROR [%s] missing or invalid lint report (%s)\n' "$name" "$entry"
    tool_log "$text"
    tool_log "$diagnostics"
    failed=1 incomplete=1
    return
  fi

  # go run can return 1 for both findings and tool failures. Check stderr
  # against the messages expected from pinned kube-linter v0.8.3.
  if ! awk -v status="$status" -v count="$count" '
    !NF || /^go: downloading / || /^go: toolchain / || /^Wrote (plain|sarif) output to / { next }
    /^Flag --fail-on-invalid-resource has been deprecated, Use \047schema-validation\047 builtin check or kubeconform template for better schema validation\.$/ { next }
    /^Error: found [0-9]+ lint errors?$/ && status == 1 && $3 == count && count > 0 { next }
    /^exit status 1$/ && status == 1 && count > 0 { next }
    { bad=1 }
    END { exit bad }
  ' "$diagnostics"; then
    known=false
    tool_log "$diagnostics"
  fi

  case "$known:$status:$summary:$operational:$count" in
    true:0:true:0:0) printf 'kube-linter: [%s] clean (%s)\n' "$name" "$entry" || failed=1 ;;
    true:1:false:0:[1-9]*)
      printf 'kube-linter: %s [%s] %s finding(s) (%s)\n' "$findings_level" "$name" "$count" "$entry" || failed=1
      if [ "$findings_level" = ERROR ]; then failed=1; fi
      ;;
    *)
      printf 'kube-linter: ERROR [%s] lint could not complete (%s, exit %s)\n' "$name" "$entry" "$status"
      failed=1 incomplete=1
      ;;
  esac
  tool_log "$text" || failed=1
}

# One lint_profile call per deployment profile. Kustomize pins match the
# repository's own CI pin (.github/workflows/validate-kustomize.yml); the helm
# pin matches the repository's documented chart render (dashboard-operator
# Makefile chart-template).
lint_profile odh manifests/odh \
  sigs.k8s.io/kustomize/kustomize/v5@v5.4.1 build --enable-helm manifests/odh

lint_profile rhoai manifests/rhoai \
  sigs.k8s.io/kustomize/kustomize/v5@v5.4.1 build --enable-helm manifests/rhoai

lint_profile modules manifests/modules \
  sigs.k8s.io/kustomize/kustomize/v5@v5.4.1 build --enable-helm manifests/modules

lint_profile maas-portal manifests/distributions/maas-portal \
  sigs.k8s.io/kustomize/kustomize/v5@v5.4.1 build --enable-helm manifests/distributions/maas-portal

lint_profile operator-default dashboard-operator/config/default \
  sigs.k8s.io/kustomize/kustomize/v5@v5.4.1 build --enable-helm dashboard-operator/config/default

lint_profile operator-chart dashboard-operator/charts/dashboard \
  helm.sh/helm/v4/cmd/helm@v4.3.2 template dashboard dashboard-operator/charts/dashboard \
  --namespace opendatahub --include-crds

if [ "$profiles" -eq 0 ]; then die "configure at least one lint profile"; fi
if [ "$incomplete" -eq 0 ] && [ -n "$sarif_dir" ]; then
  # Each profile gets a stable Code Scanning category within the upload.
  jq -n '
    [inputs | (input_filename | split("/") | last | rtrimstr(".sarif")) as $profile
            | .runs[0].automationDetails.id = "kube-linter/\($profile)/"]
    | .[0] + {runs: map(.runs[0])}
  ' \
    "$scratch_path"/*.sarif > "$sarif_dir/report.sarif" || die "cannot write the combined SARIF report"
  if [ -n "${GITHUB_OUTPUT:-}" ]; then
    printf 'sarif-ready=true\n' >> "$GITHUB_OUTPUT" || die "cannot publish the SARIF step output"
  fi
fi
exit "$failed"
