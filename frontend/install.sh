#!/usr/bin/env bash
# Installs, upgrades or rolls back the RHOAI Nightly Updater on OpenShift.
# The single implementation behind `make deploy`, `make upgrade`,
# `make rollback` and `make resolve-image`, and the install.sh attached to
# every release.
#
# A release's install.sh embeds that release's deploy/template.yaml and
# installs exactly that release: it needs only `oc` (logged in as
# cluster-admin) and `curl`, no clone. In a clone (this file), the template
# is read from the working tree and the version from the checkout.
#
# Usage: install.sh [ACTION] [OPTIONS]
#   Actions:
#     install          deploy when the app is not installed, else upgrade (default)
#     deploy           first install (re-applies when installed)
#     upgrade          re-apply the template and the image of this version
#     rollback         clone only: an older build with its own commit's
#                      template (--version <release or commit>)
#     resolve-image    print the digest reference that would be applied
#     cleanup-legacy   remove this install's objects from before namespaced names
#     uninstall        remove the app, its RBAC, ConsoleLink and namespace
#   Options (each also has an environment variable):
#     --dry-run              validate with the API server only        DRY_RUN=1
#     --namespace NAME       default rhoai-nightly-updater            NAMESPACE
#     --app-name NAME        default rhoai-nightly-updater            APP_NAME
#     --image-repo REPO      image repository, without a tag          IMAGE
#     --version TAG          vX.Y.Z, main or an 8-character commit    TAG
#     --print-template       print the template this script applies
#     --print-version        print the version this script installs
#   More environment: OAUTH_PROXY_IMAGE (default: from the cluster version),
#   PLATFORM (linux/amd64), ROLLOUT_TIMEOUT (20m), RELEASES_URL,
#   ALLOW_TEMPLATE_MISMATCH=1 (skip the image/template commit check),
#   ALLOW_MUTABLE_TAG=1 (apply the tag when no digest can be resolved).
#
# Why digests and the commit check: an image only works with the template
# of its own commit (ports, probes, environment, RBAC), and a mutable tag
# can move between the check and the pod's pull. Applying the checked digest
# pairs the checked template with exactly that code.
set -euo pipefail

# The release this file installs; scripts/release.sh installer fills this
# block in for release assets. Empty in a clone.
# @@EMBEDDED-RELEASE-BEGIN@@
EMBEDDED_VERSION='v2.3.2'
EMBEDDED_COMMIT='3938a262ee74141bdcae91792d2f2e1f6f5e483c'
EMBEDDED_IMAGE='quay.io/juntao_wang/rhoai-nightly-updater'
embedded_template() {
	cat <<'RHOAI_NIGHTLY_UPDATER_TEMPLATE_EOF'
apiVersion: template.openshift.io/v1
kind: Template
metadata:
  name: rhoai-nightly-updater
  annotations:
    description: >-
      RHOAI Nightly Updater. Requires cluster-admin to apply. Before the first
      apply, create the oauth-proxy session secret once (it is kept across
      re-applies, so sessions survive upgrades):
      oc create secret generic <APP_NAME>-proxy -n <NAMESPACE>
      --from-literal=session_secret="$(head -c 64 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 32)".
      `make deploy` / `make upgrade` do this for you.
parameters:
  - name: IMAGE
    required: true
  - name: NAMESPACE
    value: rhoai-nightly-updater
  - name: APP_NAME
    value: rhoai-nightly-updater
  # Namespaces of the cluster pull secret and of the CatalogSources. They are
  # parameters because `oc process` drops a hard-coded metadata.namespace
  # from template objects (it keeps only parameterised ones), which would
  # create these Roles in the current project instead.
  - name: PULL_SECRET_NAMESPACE
    value: kube-system
  - name: MARKETPLACE_NAMESPACE
    value: openshift-marketplace
  - name: OAUTH_PROXY_IMAGE
    # Match the tag to your cluster's OCP minor version (e.g., v4.17 for OCP 4.17.x).
    # Find available tags: oc image info registry.redhat.io/openshift4/ose-oauth-proxy-rhel9 --filter-by-os=linux/amd64
    value: registry.redhat.io/openshift4/ose-oauth-proxy-rhel9:v4.17
  # The image repository (no tag) the app reads release tags from to show
  # "vX.Y.Z is available"; empty turns the check off. install.sh passes the
  # repository it installs from.
  - name: IMAGE_REPOSITORY
    value: quay.io/juntao_wang/rhoai-nightly-updater
  # Release notes are linked as <RELEASES_URL>/<tag>.
  - name: RELEASES_URL
    value: https://gitlab.com/redhat/ai/rhoai-dashboard-team/rhoai-nightly-updater/-/releases
  # How the updater is installed, for the wording of its upgrade notices:
  # empty for install.sh and make, "gitops" when Argo CD renders the Helm
  # chart (deploy/chart sets it), so the notices say to change Git instead
  # of running install.sh.
  - name: INSTALL_METHOD
    value: ""
  # What the updater may do (docs/GITOPS.md, "Profiles"): empty or "full"
  # for every feature; "gitops" where Argo CD manages RHOAI: only Update's
  # Argo CD path and the Status, Components and Diagnostics reads (for
  # cluster-admins). The gitops profile's reduced RBAC is
  # deploy/rbac-gitops.yaml, which the Helm chart renders instead of this
  # Template's RBAC; with this Template the RBAC stays the full one. Any
  # other value stops the updater at startup.
  - name: PROFILE
    value: ""
  # The gitops profile only: the comma-separated names of the environment
  # variables a Subscription's spec.config may set (its admission policy
  # and Update check the same list; docs/GITOPS.md, section 11). The Helm
  # chart sets it from gitops.subscriptionEnvAllowlist.
  - name: SUBSCRIPTION_ENV_ALLOWLIST
    value: DISABLE_DSC_CONFIG
objects:

  - apiVersion: v1
    kind: ServiceAccount
    metadata:
      name: ${APP_NAME}
      namespace: ${NAMESPACE}
      annotations:
        serviceaccounts.openshift.io/oauth-redirectreference.primary: '{"kind":"OAuthRedirectReference","apiVersion":"v1","reference":{"kind":"Route","name":"${APP_NAME}"}}'

  # RBAC: exactly the requests the backend makes with this ServiceAccount,
  # including the restore, revert and cleanup paths (webhook deletes, CRD
  # conversion patches, finalizer removal, dashboard-operator scaling,
  # Subscription/CatalogSource restore). pkg/cluster/rbac_coverage_test.go
  # derives every API call from the code and fails when a rule is missing or
  # unused. Rules are namespaced Roles where the namespace always exists when
  # the template is applied; operator namespaces (redhat-ods-*, minio) are
  # created later by RHOAI or by this tool, so their rules are cluster-wide
  # but limited to fixed object names where the API allows it. "create"
  # cannot be limited by name
  # (https://kubernetes.io/docs/reference/access-authn-authz/rbac/#referring-to-resources).
  # Cluster-scoped names carry the namespace so two installs do not collide.
  - apiVersion: rbac.authorization.k8s.io/v1
    kind: ClusterRole
    metadata:
      name: ${APP_NAME}-${NAMESPACE}
      labels:
        app.kubernetes.io/instance: ${APP_NAME}-${NAMESPACE}
    rules:
      # Cluster information and capacity diagnostics
      - apiGroups: ["config.openshift.io"]
        resources: ["clusterversions"]
        resourceNames: ["version"]
        verbs: ["get"]
      - apiGroups: ["config.openshift.io"]
        resources: ["consoles"]
        resourceNames: ["cluster"]
        verbs: ["get"]
      - apiGroups: ["config.openshift.io"]
        resources: ["imagedigestmirrorsets"]
        verbs: ["list"]
      - apiGroups: [""]
        resources: ["nodes"]
        verbs: ["list"]
      # Diagnostics: pod events (the FailedMount cause of a stuck pod) in the
      # RHOAI namespaces and the module namespaces labelled
      # platform.opendatahub.io/part-of
      - apiGroups: [""]
        resources: ["events"]
        verbs: ["list"]
      # Namespaces: list DS projects; create redhat-ods-operator, minio and
      # pipeline projects. None is ever deleted: MinIO teardown removes only
      # the tool's own objects and keeps the minio namespace.
      - apiGroups: [""]
        resources: ["namespaces"]
        verbs: ["get", "list", "create"]
      - apiGroups: [""]
        resources: ["namespaces"]
        resourceNames: ["redhat-ods-operator", "minio"]
        verbs: ["patch"]
      # Secrets: no list and no general read. MinIO credentials and the
      # pipeline-server connection secret in user projects.
      - apiGroups: [""]
        resources: ["secrets"]
        verbs: ["create"]
      - apiGroups: [""]
        resources: ["secrets"]
        resourceNames: ["minio-secret"]
        verbs: ["get", "patch", "delete"]
      # The pipeline-server S3 secret; dashboard-dspa-secret is the name
      # older versions used, kept so their teardown still works.
      - apiGroups: [""]
        resources: ["secrets"]
        resourceNames: ["nightly-dspa-s3", "dashboard-dspa-secret"]
        verbs: ["get", "delete"]
      - apiGroups: [""]
        resources: ["secrets"]
        resourceNames: ["nightly-dspa-s3"]
        verbs: ["patch"]
      # Upgrade gates the operator waits on (redhat-ods-operator)
      - apiGroups: [""]
        resources: ["configmaps"]
        resourceNames: ["odh-upgrade-acks"]
        verbs: ["get"]
      # Webhook and CRD-conversion backing Services and their endpoints
      # (stale-webhook check), and MinIO
      - apiGroups: [""]
        resources: ["services"]
        verbs: ["get", "create"]
      - apiGroups: ["discovery.k8s.io"]
        resources: ["endpointslices"]
        verbs: ["list"]
      - apiGroups: [""]
        resources: ["services"]
        resourceNames: ["minio-service"]
        verbs: ["patch", "delete"]
      # PVCs: the S3 storage's own (SeaweedFS), the data PVC of the MinIO it
      # replaced (kept until teardown), and listing the minio and MLflow
      # namespaces to name the data a teardown deletes
      - apiGroups: [""]
        resources: ["persistentvolumeclaims"]
        verbs: ["list", "create"]
      - apiGroups: [""]
        resources: ["persistentvolumeclaims"]
        resourceNames: ["seaweedfs-pvc"]
        verbs: ["patch", "delete"]
      - apiGroups: [""]
        resources: ["persistentvolumeclaims"]
        resourceNames: ["minio-pvc"]
        verbs: ["delete"]
      # Pods in the RHOAI and module namespaces and openshift-marketplace:
      # status, debug info and diagnostics (read-only)
      - apiGroups: [""]
        resources: ["pods"]
        verbs: ["list"]
      # Deployments: dashboard image overrides, dashboard-operator pause and
      # restore, operator restart, rollout assist, the S3 storage (SeaweedFS,
      # and removing the MinIO of earlier versions it replaces)
      - apiGroups: ["apps"]
        resources: ["deployments"]
        verbs: ["get", "list", "patch", "create"]
      - apiGroups: ["apps"]
        resources: ["deployments"]
        resourceNames: ["seaweedfs", "minio"]
        verbs: ["delete"]
      - apiGroups: ["apps"]
        resources: ["replicasets"]
        verbs: ["list"]
      - apiGroups: ["route.openshift.io"]
        resources: ["routes"]
        resourceNames: ["rhods-dashboard", "mlflow", "minio-api", "minio-ui"]
        verbs: ["get"]
      - apiGroups: ["route.openshift.io"]
        resources: ["routes"]
        resourceNames: ["minio-api", "minio-ui"]
        verbs: ["patch", "delete"]
      - apiGroups: ["route.openshift.io"]
        resources: ["routes"]
        verbs: ["create"]
      # The S3 storage's ingress policy (S3 port from cluster pods, admin UI
      # from the router), created with SeaweedFS and removed by its teardown;
      # minio-ingress is the policy of the MinIO it replaces, removed by
      # setup once SeaweedFS serves
      - apiGroups: ["networking.k8s.io"]
        resources: ["networkpolicies"]
        verbs: ["create"]
      - apiGroups: ["networking.k8s.io"]
        resources: ["networkpolicies"]
        resourceNames: ["seaweedfs-ingress"]
        verbs: ["get", "patch", "delete"]
      - apiGroups: ["networking.k8s.io"]
        resources: ["networkpolicies"]
        resourceNames: ["minio-ingress"]
        verbs: ["get", "delete"]
      # The RHOAI operator (redhat-ods-operator namespace)
      - apiGroups: ["operators.coreos.com"]
        resources: ["subscriptions"]
        resourceNames: ["rhods-operator"]
        verbs: ["get", "patch", "delete"]
      - apiGroups: ["operators.coreos.com"]
        resources: ["subscriptions", "operatorgroups"]
        verbs: ["create"]
      - apiGroups: ["operators.coreos.com"]
        resources: ["operatorgroups"]
        verbs: ["list"]
      - apiGroups: ["operators.coreos.com"]
        resources: ["operatorgroups"]
        resourceNames: ["rhods-operator"]
        verbs: ["patch"]
      - apiGroups: ["operators.coreos.com"]
        resources: ["clusterserviceversions"]
        verbs: ["get", "list", "delete"]
      # InstallPlans: follow the install, approve the one the tool caused
      # under Manual approval, delete Failed ones
      - apiGroups: ["operators.coreos.com"]
        resources: ["installplans"]
        verbs: ["get", "list", "patch", "delete"]
      # Stale webhooks are removed during reinstall and by diagnostics
      - apiGroups: ["admissionregistration.k8s.io"]
        resources: ["validatingwebhookconfigurations", "mutatingwebhookconfigurations"]
        verbs: ["list", "delete"]
      # DSC schema check, conversion-webhook removal while the operator is
      # down, and the CRD conversion scans (diagnostics, namespace guard)
      - apiGroups: ["apiextensions.k8s.io"]
        resources: ["customresourcedefinitions"]
        verbs: ["list"]
      - apiGroups: ["apiextensions.k8s.io"]
        resources: ["customresourcedefinitions"]
        resourceNames: ["datascienceclusters.datasciencecluster.opendatahub.io", "dscinitializations.dscinitialization.opendatahub.io"]
        verbs: ["get"]
      - apiGroups: ["apiextensions.k8s.io"]
        resources: ["customresourcedefinitions"]
        resourceNames: ["datascienceclusters.datasciencecluster.opendatahub.io", "dscinitializations.dscinitialization.opendatahub.io"]
        verbs: ["patch"]
      - apiGroups: ["datasciencecluster.opendatahub.io"]
        resources: ["datascienceclusters"]
        verbs: ["get", "list", "patch", "create"]
      - apiGroups: ["dscinitialization.opendatahub.io"]
        resources: ["dscinitializations"]
        verbs: ["list"]
      # Platform CR: upgrade gates (AdminAckRequired) and module readiness
      - apiGroups: ["config.opendatahub.io"]
        resources: ["platforms"]
        verbs: ["list"]
      - apiGroups: ["config.opendatahub.io"]
        resources: ["platforms"]
        resourceNames: ["default"]
        verbs: ["get"]
      # Module CRs: stuck-deletion and webhook-owner checks, disable-component
      # preconditions, and finalizer removal for a CR whose operator is gone.
      # The group holds only RHOAI module CRs and its kinds change with the
      # operator version (3.6 added aihubs, aipipelines,
      # mcplifecycleoperators), so the code discovers them; a fixed list
      # would silently miss new kinds.
      - apiGroups: ["components.platform.opendatahub.io"]
        resources: ["*"]
        verbs: ["list", "patch"]
      # Pipeline servers: only the names the tool creates (dspa is the name
      # older versions used)
      - apiGroups: ["datasciencepipelinesapplications.opendatahub.io"]
        resources: ["datasciencepipelinesapplications"]
        verbs: ["list", "create"]
      - apiGroups: ["datasciencepipelinesapplications.opendatahub.io"]
        resources: ["datasciencepipelinesapplications"]
        resourceNames: ["nightly-dspa", "dspa"]
        verbs: ["get", "delete"]
      - apiGroups: ["datasciencepipelinesapplications.opendatahub.io"]
        resources: ["datasciencepipelinesapplications"]
        resourceNames: ["nightly-dspa"]
        verbs: ["patch"]
      - apiGroups: ["mlflow.opendatahub.io"]
        resources: ["mlflows"]
        resourceNames: ["mlflow"]
        verbs: ["get", "patch", "delete"]
      - apiGroups: ["mlflow.opendatahub.io"]
        resources: ["mlflows"]
        verbs: ["create"]
      # Diagnostics, prerequisite operators: whether an installed operator's
      # singleton operand (<Kind>/cluster, e.g. JobSetOperator/cluster) exists.
      # The kind comes from the operator's CSV, so the resource is "*";
      # only objects named "cluster" can be read, and only read.
      - apiGroups: ["operator.openshift.io"]
        resources: ["*"]
        resourceNames: ["cluster"]
        verbs: ["get"]
      # Diagnostics: RHOAI Certificates cert-manager has not issued
      # (Certificates hold no key material; the Secrets they produce are not
      # readable)
      - apiGroups: ["cert-manager.io"]
        resources: ["certificates"]
        verbs: ["list"]

  - apiVersion: rbac.authorization.k8s.io/v1
    kind: ClusterRoleBinding
    metadata:
      name: ${APP_NAME}-${NAMESPACE}
      labels:
        app.kubernetes.io/instance: ${APP_NAME}-${NAMESPACE}
    roleRef:
      apiGroup: rbac.authorization.k8s.io
      kind: ClusterRole
      name: ${APP_NAME}-${NAMESPACE}
    subjects:
      - kind: ServiceAccount
        name: ${APP_NAME}
        namespace: ${NAMESPACE}

  # The app's own state: activity log, deployment snapshot, running operation
  - apiVersion: rbac.authorization.k8s.io/v1
    kind: Role
    metadata:
      name: ${APP_NAME}
      namespace: ${NAMESPACE}
    rules:
      - apiGroups: [""]
        resources: ["configmaps"]
        verbs: ["create"]
      - apiGroups: [""]
        resources: ["configmaps"]
        resourceNames: ["rhoai-nightly-updater-activity", "rhoai-nightly-updater-snapshot", "rhoai-nightly-updater-operation"]
        verbs: ["get"]
      - apiGroups: [""]
        resources: ["configmaps"]
        resourceNames: ["rhoai-nightly-updater-activity"]
        verbs: ["update"]
      - apiGroups: [""]
        resources: ["configmaps"]
        resourceNames: ["rhoai-nightly-updater-snapshot", "rhoai-nightly-updater-operation"]
        verbs: ["patch"]
  - apiVersion: rbac.authorization.k8s.io/v1
    kind: RoleBinding
    metadata:
      name: ${APP_NAME}
      namespace: ${NAMESPACE}
    roleRef:
      apiGroup: rbac.authorization.k8s.io
      kind: Role
      name: ${APP_NAME}
    subjects:
      - kind: ServiceAccount
        name: ${APP_NAME}
        namespace: ${NAMESPACE}

  # The cluster pull secret for quay.io/rhoai (kube-system)
  - apiVersion: rbac.authorization.k8s.io/v1
    kind: Role
    metadata:
      name: ${APP_NAME}-${NAMESPACE}
      namespace: ${PULL_SECRET_NAMESPACE}
      labels:
        app.kubernetes.io/instance: ${APP_NAME}-${NAMESPACE}
    rules:
      - apiGroups: [""]
        resources: ["secrets"]
        resourceNames: ["additional-pull-secret"]
        verbs: ["get", "patch"]
  - apiVersion: rbac.authorization.k8s.io/v1
    kind: RoleBinding
    metadata:
      name: ${APP_NAME}-${NAMESPACE}
      namespace: ${PULL_SECRET_NAMESPACE}
      labels:
        app.kubernetes.io/instance: ${APP_NAME}-${NAMESPACE}
    roleRef:
      apiGroup: rbac.authorization.k8s.io
      kind: Role
      name: ${APP_NAME}-${NAMESPACE}
    subjects:
      - kind: ServiceAccount
        name: ${APP_NAME}
        namespace: ${NAMESPACE}

  # Nightly CatalogSources and package lookups (openshift-marketplace)
  - apiVersion: rbac.authorization.k8s.io/v1
    kind: Role
    metadata:
      name: ${APP_NAME}-${NAMESPACE}
      namespace: ${MARKETPLACE_NAMESPACE}
      labels:
        app.kubernetes.io/instance: ${APP_NAME}-${NAMESPACE}
    rules:
      - apiGroups: ["operators.coreos.com"]
        resources: ["catalogsources"]
        verbs: ["get", "list", "create", "patch", "delete"]
      - apiGroups: ["packages.operators.coreos.com"]
        resources: ["packagemanifests"]
        verbs: ["list"]
  - apiVersion: rbac.authorization.k8s.io/v1
    kind: RoleBinding
    metadata:
      name: ${APP_NAME}-${NAMESPACE}
      namespace: ${MARKETPLACE_NAMESPACE}
      labels:
        app.kubernetes.io/instance: ${APP_NAME}-${NAMESPACE}
    roleRef:
      apiGroup: rbac.authorization.k8s.io
      kind: Role
      name: ${APP_NAME}-${NAMESPACE}
    subjects:
      - kind: ServiceAccount
        name: ${APP_NAME}
        namespace: ${NAMESPACE}

  - apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: ${APP_NAME}
      namespace: ${NAMESPACE}
      labels:
        app.kubernetes.io/name: ${APP_NAME}
        app.kubernetes.io/component: web
        app.kubernetes.io/part-of: ${APP_NAME}
    spec:
      replicas: 1
      # Old ReplicaSets keep their pod template, including the COOKIE_SECRET
      # env of installs from before the cookie Secret, readable with
      # namespace view. Keep few; `make rollback` does not need them.
      revisionHistoryLimit: 2
      # Recreate keeps a single updater pod: operation locks are in-process,
      # so an old and a new pod must never run cluster changes concurrently.
      strategy:
        type: Recreate
      selector:
        matchLabels:
          app: ${APP_NAME}
      template:
        metadata:
          labels:
            app: ${APP_NAME}
            app.kubernetes.io/name: ${APP_NAME}
        spec:
          serviceAccountName: ${APP_NAME}
          automountServiceAccountToken: true
          # On shutdown the server waits for running cluster operations (their
          # 15-minute deadline, automatic recovery and bookkeeping), then up to
          # 20 seconds for connections and 10 for the operation marker.
          # pkg/cluster/budget_test.go checks that the total stays below this
          # value with a margin, so operations are not killed mid-way.
          terminationGracePeriodSeconds: 1020
          affinity:
            podAntiAffinity:
              preferredDuringSchedulingIgnoredDuringExecution:
                - weight: 100
                  podAffinityTerm:
                    labelSelector:
                      matchLabels:
                        app: ${APP_NAME}
                    topologyKey: kubernetes.io/hostname
          containers:
            - name: app
              image: ${IMAGE}
              env:
                # The API listens on localhost only: oauth-proxy (same pod)
                # is its only client. Probes and /metrics use METRICS_PORT.
                - name: BIND_ADDRESS
                  value: 127.0.0.1
                - name: METRICS_PORT
                  value: "9090"
                # Must match api.ExpectedTemplateRevision; bump both when a
                # template change matters to the running code.
                - name: TEMPLATE_REVISION
                  value: "4"
                # The update check (GET /api/update-check).
                - name: IMAGE_REPOSITORY
                  value: ${IMAGE_REPOSITORY}
                - name: RELEASES_URL
                  value: ${RELEASES_URL}
                - name: INSTALL_METHOD
                  value: ${INSTALL_METHOD}
                - name: PROFILE
                  value: ${PROFILE}
                # The gitops profile only: Update runs while this
                # ValidatingAdmissionPolicy and its binding (both named so
                # by deploy/rbac-gitops.yaml) are in place, and checks the
                # Subscription against the same allowlist.
                - name: GITOPS_ADMISSION_POLICY
                  value: ${APP_NAME}-${NAMESPACE}-gitops
                - name: SUBSCRIPTION_ENV_ALLOWLIST
                  value: ${SUBSCRIPTION_ENV_ALLOWLIST}
              ports:
                - containerPort: 9090
                  name: metrics
              startupProbe:
                httpGet:
                  path: /api/health
                  port: 9090
                failureThreshold: 10
                periodSeconds: 3
              readinessProbe:
                httpGet:
                  path: /api/health/ready
                  port: 9090
                initialDelaySeconds: 2
                periodSeconds: 10
                timeoutSeconds: 5
              livenessProbe:
                httpGet:
                  path: /api/health
                  port: 9090
                initialDelaySeconds: 5
                periodSeconds: 30
                timeoutSeconds: 3
              resources:
                requests:
                  cpu: 50m
                  memory: 64Mi
                limits:
                  cpu: 200m
                  memory: 128Mi
              securityContext:
                allowPrivilegeEscalation: false
                readOnlyRootFilesystem: true
                runAsNonRoot: true
                capabilities:
                  drop: ["ALL"]
                seccompProfile:
                  type: RuntimeDefault

            - name: oauth-proxy
              image: ${OAUTH_PROXY_IMAGE}
              args:
                - --https-address=:8443
                - --provider=openshift
                - --openshift-service-account=${APP_NAME}
                - --upstream=http://127.0.0.1:8080
                - --upstream-timeout=960s
                - --upstream-flush=200ms
                - --tls-cert=/etc/tls/private/tls.crt
                - --tls-key=/etc/tls/private/tls.key
                # Kept in a Secret that re-applies do not change.
                - --cookie-secret-file=/etc/proxy/secrets/session_secret
                # Below the OAuth access token lifetime (OAuth
                # accessTokenMaxAgeSeconds, 86400s by default), so the session
                # ends before the token it carries stops working.
                - --cookie-expire=23h
                - --cookie-samesite=strict
                # The app trusts only the token of this proxy's own OAuth
                # session (X-Forwarded-Access-Token) and refuses bearer
                # tokens. Do not add --openshift-delegate-urls or
                # --pass-user-bearer-token, which accept client tokens.
                - --pass-access-token=true
                - --pass-user-headers=true
                - --openshift-sar={"resource":"pods","verb":"list","namespace":"redhat-ods-operator"}
              ports:
                - containerPort: 8443
                  name: https
              # oauth-proxy answers /oauth/healthz before authentication.
              readinessProbe:
                httpGet:
                  path: /oauth/healthz
                  port: 8443
                  scheme: HTTPS
                initialDelaySeconds: 3
                periodSeconds: 10
                timeoutSeconds: 3
              livenessProbe:
                httpGet:
                  path: /oauth/healthz
                  port: 8443
                  scheme: HTTPS
                initialDelaySeconds: 10
                periodSeconds: 30
                timeoutSeconds: 3
              volumeMounts:
                - name: tls
                  mountPath: /etc/tls/private
                  readOnly: true
                - name: proxy-secret
                  mountPath: /etc/proxy/secrets
                  readOnly: true
              resources:
                requests:
                  cpu: 10m
                  memory: 32Mi
                limits:
                  cpu: 100m
                  memory: 64Mi
              securityContext:
                allowPrivilegeEscalation: false
                runAsNonRoot: true
                capabilities:
                  drop: ["ALL"]
                seccompProfile:
                  type: RuntimeDefault

          volumes:
            - name: tls
              secret:
                secretName: ${APP_NAME}-tls
            - name: proxy-secret
              secret:
                secretName: ${APP_NAME}-proxy

  - apiVersion: v1
    kind: Service
    metadata:
      name: ${APP_NAME}
      namespace: ${NAMESPACE}
      annotations:
        service.beta.openshift.io/serving-cert-secret-name: ${APP_NAME}-tls
      labels:
        app.kubernetes.io/name: ${APP_NAME}
    spec:
      selector:
        app: ${APP_NAME}
      ports:
        - name: https
          port: 8443
          targetPort: 8443
        # Serves only /metrics and the health probes, never the API.
        - name: metrics
          port: 9090
          targetPort: 9090
          protocol: TCP

  - apiVersion: networking.k8s.io/v1
    kind: NetworkPolicy
    metadata:
      name: ${APP_NAME}
      namespace: ${NAMESPACE}
    spec:
      podSelector:
        matchLabels:
          app: ${APP_NAME}
      policyTypes:
        - Ingress
      ingress:
        - from:
            - namespaceSelector:
                matchLabels:
                  network.openshift.io/policy-group: ingress
          ports:
            - port: 8443
              protocol: TCP
        - from:
            - namespaceSelector:
                matchLabels:
                  kubernetes.io/metadata.name: openshift-monitoring
            - namespaceSelector:
                matchLabels:
                  kubernetes.io/metadata.name: openshift-user-workload-monitoring
          ports:
            - port: 9090
              protocol: TCP

  - apiVersion: route.openshift.io/v1
    kind: Route
    metadata:
      name: ${APP_NAME}
      namespace: ${NAMESPACE}
      annotations:
        haproxy.router.openshift.io/timeout: 960s
    spec:
      to:
        kind: Service
        name: ${APP_NAME}
      port:
        targetPort: https
      tls:
        termination: reencrypt

  # Metrics and alerts take effect only when user workload monitoring is
  # enabled on the cluster (it is off by default; see the OpenShift docs
  # "Enabling monitoring for user-defined projects"). Without it these two
  # objects are inert.
  - apiVersion: monitoring.coreos.com/v1
    kind: ServiceMonitor
    metadata:
      name: ${APP_NAME}
      namespace: ${NAMESPACE}
      labels:
        app.kubernetes.io/name: ${APP_NAME}
    spec:
      selector:
        matchLabels:
          app.kubernetes.io/name: ${APP_NAME}
      endpoints:
        - port: metrics
          path: /metrics
          interval: 60s

  - apiVersion: monitoring.coreos.com/v1
    kind: PrometheusRule
    metadata:
      name: ${APP_NAME}
      namespace: ${NAMESPACE}
      labels:
        app.kubernetes.io/name: ${APP_NAME}
    spec:
      groups:
        - name: ${APP_NAME}.rules
          rules:
            - alert: NightlyUpdaterDown
              # absent() also fires when the target is gone entirely.
              expr: up{job="${APP_NAME}", namespace="${NAMESPACE}"} == 0 or absent(up{job="${APP_NAME}", namespace="${NAMESPACE}"})
              for: 5m
              labels:
                severity: warning
              annotations:
                summary: RHOAI Nightly Updater is down
                description: "The ${APP_NAME} target has been unreachable for 5 minutes."

            - alert: NightlyUpdateFailed
              expr: increase(rhoai_nightly_updater_updates_failed_total[1h]) > 0
              labels:
                severity: warning
              annotations:
                summary: A nightly update has failed
                description: "At least one nightly update has failed in the last hour."

            - alert: NightlyUpdaterHighErrorRate
              expr: >-
                (
                  increase(rhoai_nightly_updater_updates_failed_total[10m])
                  /
                  clamp_min(increase(rhoai_nightly_updater_updates_total[10m]), 1)
                ) > 0.5
              for: 10m
              labels:
                severity: critical
              annotations:
                summary: RHOAI Nightly Updater has a high error rate
                description: "More than 50% of updates have failed over the last 10 minutes."

            - alert: NightlyUpdaterPodRestarting
              expr: increase(kube_pod_container_status_restarts_total{namespace="${NAMESPACE}", container="app"}[1h]) > 3
              labels:
                severity: warning
              annotations:
                summary: RHOAI Nightly Updater pod is restarting frequently
                description: "The nightly updater container has restarted more than 3 times in the last hour."
RHOAI_NIGHTLY_UPDATER_TEMPLATE_EOF
}
# @@EMBEDDED-RELEASE-END@@

DEFAULT_IMAGE=quay.io/juntao_wang/rhoai-nightly-updater

err() { printf '%s\n' "$*" >&2; }
die() {
	err "$@"
	exit 1
}
usage() {
	sed -n '2,/^set -euo pipefail/p' "$0" | sed -e '$d' -e 's/^# \{0,1\}//'
	exit "${1:-0}"
}

# --- Arguments ------------------------------------------------------------------

ACTION=""
TAG_EXPLICIT=""
[ -z "${TAG:-}" ] || TAG_EXPLICIT=1
need_value() { [ $# -ge 2 ] && [ -n "$2" ] || die "$1 needs a value (see --help)."; }
while [ $# -gt 0 ]; do
	case "$1" in
	install | deploy | upgrade | rollback | resolve-image | cleanup-legacy | uninstall) ACTION=$1 ;;
	--dry-run) DRY_RUN=1 ;;
	--namespace | --app-name | --image-repo | --version)
		need_value "$@"
		case "$1" in
		--namespace) NAMESPACE=$2 ;;
		--app-name) APP_NAME=$2 ;;
		--image-repo) IMAGE=$2 ;;
		--version) TAG=$2 TAG_EXPLICIT=1 ;;
		esac
		shift
		;;
	--namespace=* | --app-name=* | --image-repo=* | --version=*)
		value=${1#*=}
		[ -n "$value" ] || die "${1%%=*} needs a value (see --help)."
		case "$1" in
		--namespace=*) NAMESPACE=$value ;;
		--app-name=*) APP_NAME=$value ;;
		--image-repo=*) IMAGE=$value ;;
		--version=*) TAG=$value TAG_EXPLICIT=1 ;;
		esac
		;;
	--print-template | --print-version) ACTION=${1#--} ;;
	-h | --help) usage 0 ;;
	*) die "Unknown argument: $1 (see --help)" ;;
	esac
	shift
done
ACTION=${ACTION:-install}

NAMESPACE=${NAMESPACE:-rhoai-nightly-updater}
APP_NAME=${APP_NAME:-rhoai-nightly-updater}
PLATFORM=${PLATFORM:-linux/amd64}
ROLLOUT_TIMEOUT=${ROLLOUT_TIMEOUT:-20m}
case "${DRY_RUN:-}" in "" | 0 | false | no) DRY="" ;; *) DRY=1 ;; esac
DRY_FLAG=${DRY:+--dry-run=server}
INSTANCE="$APP_NAME-$NAMESPACE"
PROXY_SECRET="$APP_NAME-proxy"

is_release() { [[ $1 =~ ^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]; }

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
umask 077

if [ -n "$EMBEDDED_VERSION" ]; then
	MODE=release
	IMAGE=${IMAGE:-$EMBEDDED_IMAGE}
	if [ -n "${TAG:-}" ] && [ "$TAG" != "$EMBEDDED_VERSION" ]; then
		die "This installer installs $EMBEDDED_VERSION only. For $TAG, download the install.sh of that release."
	fi
	TAG=$EMBEDDED_VERSION
	TEMPLATE="$TMP/template.yaml"
	embedded_template >"$TEMPLATE"
else
	MODE=checkout
	ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
	cd "$ROOT"
	IMAGE=${IMAGE:-$DEFAULT_IMAGE}
	TEMPLATE="$ROOT/deploy/template.yaml"
	if [ -z "${TAG:-}" ] && [ "$ACTION" != rollback ]; then
		TAG=$(git describe --tags --exact-match --match 'v[0-9]*' HEAD 2>/dev/null || true)
		is_release "$TAG" || TAG=""
	fi
fi
TAG=${TAG:-}
case "$IMAGE" in *@* | */*:*) die "IMAGE must be a repository without a tag or digest, not $IMAGE." ;; esac

case "$ACTION" in
print-template)
	cat "$TEMPLATE"
	exit 0
	;;
print-version)
	printf '%s\n' "${TAG:-none}"
	exit 0
	;;
esac

# --- Cluster ------------------------------------------------------------------

preflight() {
	command -v oc >/dev/null 2>&1 || die "oc is not installed: https://docs.openshift.com/container-platform/latest/cli_reference/openshift_cli/getting-started-cli.html"
	command -v curl >/dev/null 2>&1 || die "curl is not installed."
	local user
	user=$(oc whoami 2>/dev/null) || die "Not logged in to a cluster; run 'oc login' first."
	[ "$(oc auth can-i '*' '*' --all-namespaces 2>/dev/null || true)" = yes ] ||
		die "$user is not cluster-admin; installing needs the cluster-admin role (it creates ClusterRoles and a ConsoleLink)."
	err "Cluster $(oc whoami --show-server 2>/dev/null || echo '?'), user $user, namespace $NAMESPACE, app $APP_NAME."
}

# The oauth-proxy tag must match the cluster's OCP minor version.
detect_oauth_proxy_image() {
	[ -z "${OAUTH_PROXY_IMAGE:-}" ] || return 0
	local minor
	minor=$(oc version -o json 2>/dev/null | sed -n 's/.*"openshiftVersion": *"\([0-9]*\.[0-9]*\).*/\1/p' | head -1)
	[ -n "$minor" ] || die "Cannot detect the OCP version; set OAUTH_PROXY_IMAGE=registry.redhat.io/openshift4/ose-oauth-proxy-rhel9:v4.<minor>"
	OAUTH_PROXY_IMAGE=registry.redhat.io/openshift4/ose-oauth-proxy-rhel9:v$minor
}

# --- Image ----------------------------------------------------------------------

# registry_digest REPO TAG: the manifest (list) digest from the registry's v2
# API, anonymously (a bearer token from the registry's token service when it
# asks for one). Prints nothing when the registry does not answer.
registry_digest() {
	local repo=$1 tag=$2 host path scheme=https url headers status www realm realm_host service token
	host=${repo%%/*}
	path=${repo#*/}
	case "$host" in
	*.* | *:* | localhost) ;;
	*) host=docker.io path=$repo ;;
	esac
	if [ "$host" = docker.io ]; then
		host=registry-1.docker.io
		[[ $path == */* ]] || path=library/$path
	fi
	case "$host" in localhost | localhost:* | 127.0.0.1:*) scheme=http ;; esac
	url="$scheme://$host/v2/$path/manifests/$tag"
	local accept="application/vnd.oci.image.index.v1+json,application/vnd.docker.distribution.manifest.list.v2+json,application/vnd.oci.image.manifest.v1+json,application/vnd.docker.distribution.manifest.v2+json"
	headers=$(curl -sS -I --max-time 20 -H "Accept: $accept" "$url" 2>/dev/null | tr -d '\r') || return 0
	status=$(printf '%s\n' "$headers" | sed -n '1s/^HTTP[^ ]* \([0-9]*\).*/\1/p')
	if [ "$status" = 401 ]; then
		www=$(printf '%s\n' "$headers" | grep -i '^www-authenticate: *bearer' | head -1 || true)
		realm=$(printf '%s\n' "$www" | sed -n 's/.*realm="\([^"]*\)".*/\1/p')
		service=$(printf '%s\n' "$www" | sed -n 's/.*service="\([^"]*\)".*/\1/p')
		[ -n "$realm" ] || return 0
		# The token service must be https on the registry host (or Docker
		# Hub's known token host), so a registry answer cannot send the
		# request elsewhere.
		realm_host=${realm#https://}
		realm_host=${realm_host%%/*}
		if [[ $realm != https://* ]] ||
			{ [ "$realm_host" != "$host" ] && ! { [ "$host" = registry-1.docker.io ] && [ "$realm_host" = auth.docker.io ]; }; }; then
			err "WARNING: ignoring the token service $realm of $host (not https on the registry host)."
			return 0
		fi
		token=$(curl -sS --max-time 20 --max-filesize 1048576 -G "$realm" --data-urlencode "service=$service" \
			--data-urlencode "scope=repository:$path:pull" 2>/dev/null |
			sed -nE 's/.*"(token|access_token)" *: *"([^"]*)".*/\2/p' | head -1) || return 0
		[ -n "$token" ] || return 0
		headers=$(curl -sS -I --max-time 20 -H "Accept: $accept" -H "Authorization: Bearer $token" "$url" 2>/dev/null | tr -d '\r') || return 0
		status=$(printf '%s\n' "$headers" | sed -n '1s/^HTTP[^ ]* \([0-9]*\).*/\1/p')
	fi
	[ "$status" = 200 ] || return 0
	printf '%s\n' "$headers" | sed -n 's/^[Dd]ocker-[Cc]ontent-[Dd]igest: *\(sha256:[0-9a-f]\{64\}\).*/\1/p' | head -1
}

# image_revision REF: the org.opencontainers.image.revision label (a full
# commit) of the image, read with oc and the local pull credentials.
image_revision() {
	oc image info "$1" --filter-by-os="$PLATFORM" -o json 2>/dev/null |
		sed -n 's/^ *"org.opencontainers.image.revision": *"\([0-9a-f]\{40\}\)".*/\1/p' | head -1 || true
}

# resolve_image: sets REF to IMAGE@sha256:... for IMAGE:TAG and checks that
# the image was built from the commit of the template that will be applied.
# pin_image TAG: sets REF to IMAGE@sha256:... for IMAGE:TAG, from the
# registry's v2 API, else oc with the local pull credentials. Without a
# digest it stops, unless ALLOW_MUTABLE_TAG=1 (REF is then the tag).
pin_image() {
	local tag=$1 digest info
	digest=$(registry_digest "$IMAGE" "$tag")
	if [ -z "$digest" ]; then
		info=$(oc image info "$IMAGE:$tag" --filter-by-os="$PLATFORM" -o json 2>/dev/null || true)
		digest=$(printf '%s\n' "$info" | sed -n 's/^  "listDigest": *"\(sha256:[0-9a-f]\{64\}\)".*/\1/p' | head -1)
		[ -n "$digest" ] || digest=$(printf '%s\n' "$info" | sed -n 's/^  "digest": *"\(sha256:[0-9a-f]\{64\}\)".*/\1/p' | head -1)
	fi
	if [ -n "$digest" ]; then
		REF="$IMAGE@$digest"
		err "Resolved $IMAGE:$tag to $REF"
	elif [ "${ALLOW_MUTABLE_TAG:-}" = 1 ]; then
		REF="$IMAGE:$tag"
		err "WARNING: ALLOW_MUTABLE_TAG=1: cannot resolve $IMAGE:$tag to a digest; deploying the tag, which may move before the pod pulls it."
	else
		err "ERROR: cannot resolve $IMAGE:$tag to a digest (no such tag, or the registry is unreachable). Nothing was changed."
		err "  Image tags are releases (vX.Y.Z, vN), main, latest or an 8-character commit. Set ALLOW_MUTABLE_TAG=1 to deploy the tag itself."
		exit 1
	fi
}

require_tag() {
	[ -z "$TAG" ] || return 0
	if [ "$MODE" = checkout ]; then
		die "HEAD is not on a release tag. Check out a release (git checkout vX.Y.Z), or pass TAG=main / TAG=<commit> to test a build."
	fi
	die "No version to install."
}

resolve_image() {
	require_tag
	if [ "$TAG" = latest ]; then
		err "WARNING: :latest is the newest release of one major version only and moves without notice; prefer a release (git checkout vX.Y.Z)."
	fi

	# 1. The digest.
	pin_image "$TAG"

	if [ "${ALLOW_TEMPLATE_MISMATCH:-}" = 1 ]; then
		err "WARNING: ALLOW_TEMPLATE_MISMATCH=1: not checking that $REF matches the template."
		return 0
	fi

	# 2. The commit the image was built from: its revision label (set by the
	#    Containerfile).
	local label
	label=$(image_revision "$REF")
	if [ "$MODE" = release ]; then
		if [ "$label" != "$EMBEDDED_COMMIT" ]; then
			err "ERROR: $REF reports revision ${label:-<none>}, not $EMBEDDED_COMMIT, the commit of $EMBEDDED_VERSION whose template this installer holds."
			err "  Set ALLOW_TEMPLATE_MISMATCH=1 to apply this template anyway."
			exit 1
		fi
		err "OK: $REF was built from $label, the commit of $EMBEDDED_VERSION."
		return 0
	fi

	# A label naming a commit that is not in this repository (builds older
	# than the label inherit the base image's) is unknown. A tag that is a
	# commit or a release names its commit too; main, latest and vN move.
	if [ -n "$label" ] && ! git cat-file -e "$label^{commit}" 2>/dev/null; then
		label=""
	fi
	local tagrev=""
	if [[ $TAG =~ ^[0-9a-f]{7,40}$ ]] || is_release "$TAG"; then
		tagrev=$(git rev-parse --verify --quiet "$TAG^{commit}" || true)
	fi
	if [ -n "$label" ] && [ -n "$tagrev" ] && [ "$label" != "$tagrev" ]; then
		err "ERROR: $IMAGE:$TAG reports revision $label, not commit $tagrev that its tag names."
		err "  Set ALLOW_TEMPLATE_MISMATCH=1 to apply this checkout's template anyway."
		exit 1
	fi
	local rev=${label:-$tagrev}
	if [ -z "$rev" ]; then
		err "ERROR: cannot tell which commit $REF was built from (no revision label of this repository; run 'git fetch origin' if it is newer than this clone)."
		err "  Set ALLOW_TEMPLATE_MISMATCH=1 to apply this checkout's template anyway."
		exit 1
	fi

	# 3. The template: the working tree (uncommitted edits included) against
	#    the image's commit, also when that commit is HEAD.
	if ! git diff --quiet "$rev" -- deploy/template.yaml; then
		if [ "$rev" = "$(git rev-parse HEAD)" ]; then
			err "ERROR: deploy/template.yaml has uncommitted changes, so it is not the template $REF was built with."
		else
			err "ERROR: deploy/template.yaml in this checkout differs from the template of commit $rev, which $REF was built from."
			err "  Check out the release you install (git checkout vX.Y.Z), or for an older build use its own template:  make rollback TAG=<release or commit>"
		fi
		err "  Set ALLOW_TEMPLATE_MISMATCH=1 to apply this checkout's template anyway."
		exit 1
	fi
	err "OK: $REF was built from $rev, whose template matches this checkout."
}

# --- Apply ----------------------------------------------------------------------

# The oauth-proxy cookie secret lives in a Secret that the template only
# references, so re-applying keeps everyone's session. An existing install
# keeps the value it had in its Deployment env (COOKIE_SECRET).
ensure_proxy_secret() {
	if oc get secret "$PROXY_SECRET" -n "$NAMESPACE" >/dev/null 2>&1; then
		err "Secret $PROXY_SECRET exists; keeping it."
		return 0
	fi
	local secret
	secret=$(oc get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[?(@.name=="oauth-proxy")].env[?(@.name=="COOKIE_SECRET")].value}' 2>/dev/null || true)
	if [ -z "$secret" ]; then
		secret=$(head -c 64 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 32)
	fi
	[ ${#secret} -eq 32 ] || die "Could not produce a 32-character cookie secret"
	printf 'session_secret=%s' "$secret" >"$TMP/secret.env"
	oc create secret generic "$PROXY_SECRET" -n "$NAMESPACE" --from-env-file="$TMP/secret.env" >/dev/null
	rm -f "$TMP/secret.env"
	err "Created Secret $PROXY_SECRET. Old ReplicaSets, which still hold the cookie secret in their pod template, are removed after the rollout."
}

# apply_template TEMPLATE IMAGE_REF: oc process | oc apply. The template is
# processed locally (--local), so it does not depend on the current project,
# which may not exist. Parameters go
# through a private file. A template that still takes a COOKIE_SECRET
# parameter (older releases) gets the value of the current Secret.
apply_template() {
	local template=$1 image_ref=$2 secret
	printf '%s\n' "IMAGE=$image_ref" "NAMESPACE=$NAMESPACE" "APP_NAME=$APP_NAME" \
		"OAUTH_PROXY_IMAGE=$OAUTH_PROXY_IMAGE" "IMAGE_REPOSITORY=$IMAGE" >"$TMP/params"
	[ -z "${RELEASES_URL:-}" ] || printf 'RELEASES_URL=%s\n' "$RELEASES_URL" >>"$TMP/params"
	if oc process -f "$template" --parameters --local | awk 'NR > 1 {print $1}' | grep -qx COOKIE_SECRET; then
		secret=$(oc get secret "$PROXY_SECRET" -n "$NAMESPACE" -o jsonpath='{.data.session_secret}' 2>/dev/null | base64 -d 2>/dev/null || true)
		[ -n "$secret" ] || secret=$(oc get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[?(@.name=="oauth-proxy")].env[?(@.name=="COOKIE_SECRET")].value}' 2>/dev/null || true)
		[ ${#secret} -eq 32 ] || die "Could not read the current 32-character cookie secret (Secret $PROXY_SECRET)."
		printf 'COOKIE_SECRET=%s\n' "$secret" >>"$TMP/params"
	fi
	oc process -f "$template" --param-file="$TMP/params" --ignore-unknown-parameters --local >"$TMP/objects.json"
	rm -f "$TMP/params"
	if [ -z "$DRY" ]; then
		oc apply -f "$TMP/objects.json"
		return
	fi
	# Server-side dry run. Before the first install the namespace does not
	# exist, so the server cannot validate the objects in it; every other
	# object still is.
	local out rc=0 errors missing
	out=$(oc apply --dry-run=server -f "$TMP/objects.json" 2>&1) || rc=$?
	if [ "$rc" -ne 0 ] && ! oc get namespace "$NAMESPACE" >/dev/null 2>&1; then
		errors=$(printf '%s\n' "$out" | grep -c '^Error' || true)
		missing=$(printf '%s\n' "$out" | grep '^Error' | grep -c "namespaces \"$NAMESPACE\" not found" || true)
		if [ "$errors" -gt 0 ] && [ "$errors" = "$missing" ]; then
			printf '%s\n' "$out" | grep -v '^Error' || true
			err "Note: namespace $NAMESPACE does not exist yet (deploy creates it), so the server could not validate the $missing objects in it; all other objects passed."
			return 0
		fi
	fi
	printf '%s\n' "$out"
	return "$rc"
}

# The ConsoleLink needs the Route host, which the router assigns.
consolelink() {
	local host
	host=$(oc get route "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.host}')
	[ -n "$host" ] || die "Route $APP_NAME has no host yet"
	err "App URL: https://$host"
	printf '%s\n' \
		'apiVersion: console.openshift.io/v1' \
		'kind: ConsoleLink' \
		'metadata:' \
		"  name: $INSTANCE" \
		'  labels:' \
		"    app.kubernetes.io/instance: $INSTANCE" \
		'spec:' \
		'  applicationMenu:' \
		'    section: Red Hat Applications' \
		'    imageURL: data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI0VFMDAwMCI+PHBhdGggZD0iTTEyIDJMMyA3djEwbDkgNSA5LTVWN2wtOS01em0wIDIuMThMMTggNy4yN3Y3LjQ2TDEyIDE5LjgyIDYgMTQuNzNWNy4yN0wxMiA0LjE4eiIvPjwvc3ZnPg==' \
		"  href: https://$host" \
		'  location: ApplicationMenu' \
		'  text: RHOAI Nightly Updater' | oc apply -f -
}

# Installs from before the namespace-suffixed names used a ClusterRole,
# ClusterRoleBinding and ConsoleLink named APP_NAME. Remove them only when
# they belong to this install (bound to this namespace's ServiceAccount or
# linking to this Route), after the new RBAC is in place.
cleanup_legacy() {
	local subject host href
	subject=$(oc get clusterrolebinding "$APP_NAME" -o jsonpath='{.subjects[0].namespace}/{.subjects[0].name}' 2>/dev/null || true)
	# A dry run only validates the deletes with the server.
	# shellcheck disable=SC2086 # DRY_FLAG is one word or nothing
	if [ "$subject" = "$NAMESPACE/$APP_NAME" ]; then
		oc delete clusterrolebinding "$APP_NAME" $DRY_FLAG
		oc delete clusterrole "$APP_NAME" --ignore-not-found $DRY_FLAG
	fi
	host=$(oc get route "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.host}' 2>/dev/null || true)
	href=$(oc get consolelink "$APP_NAME" -o jsonpath='{.spec.href}' 2>/dev/null || true)
	# shellcheck disable=SC2086
	if [ -n "$href" ] && { [ "$href" = "https://$host" ] || [ "$href" = "https://placeholder.apps.example.com" ]; }; then
		oc delete consolelink "$APP_NAME" $DRY_FLAG
	fi
}

# After a successful rollout, delete the Deployment's old ReplicaSets
# (selected by its label and owner, scaled to 0, other revision). Their pod
# templates keep whatever the old pods had, for example the plaintext
# COOKIE_SECRET env of installs from before the proxy Secret, which would
# otherwise stay readable. Rolling back uses `make rollback`, not the
# ReplicaSet history.
prune_replicasets() {
	local current uid old
	current=$(oc get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.metadata.annotations.deployment\.kubernetes\.io/revision}')
	uid=$(oc get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.metadata.uid}')
	[ -n "$current" ] && [ -n "$uid" ] || die "Cannot read the revision of deployment/$APP_NAME; old ReplicaSets were kept."
	old=$(oc get rs -n "$NAMESPACE" -l "app=$APP_NAME" -o jsonpath='{range .items[*]}{.metadata.name}{" "}{.metadata.annotations.deployment\.kubernetes\.io/revision}{" "}{.metadata.ownerReferences[0].uid}{" "}{.spec.replicas}{" "}{.status.replicas}{"\n"}{end}' |
		awk -v cur="$current" -v uid="$uid" '$2 != cur && $3 == uid && $4 == "0" && ($5 == "0" || $5 == "") {print $1}')
	if [ -z "$old" ]; then
		err "No old ReplicaSets to remove."
		return 0
	fi
	err "Removing old ReplicaSets (their pod templates may hold old secrets): $(printf '%s\n' "$old" | tr '\n' ' ')"
	# shellcheck disable=SC2086 # one name per word
	oc delete rs -n "$NAMESPACE" $old
}

wait_rollout() {
	oc rollout status "deployment/$APP_NAME" -n "$NAMESPACE" --timeout="$ROLLOUT_TIMEOUT"
}

# --- Actions --------------------------------------------------------------------

installed() {
	oc get deployment "$APP_NAME" -n "$NAMESPACE" >/dev/null 2>&1
}

# deploy_or_upgrade deploy|upgrade
deploy_or_upgrade() {
	local action=$1
	require_tag
	preflight
	detect_oauth_proxy_image
	if [ "$action" = upgrade ] && ! installed; then
		die "No deployment $APP_NAME in $NAMESPACE; install it first (make deploy, or install.sh deploy)."
	fi
	resolve_image
	if [ -z "$DRY" ]; then
		if [ "$action" = deploy ]; then
			oc get project "$NAMESPACE" >/dev/null 2>&1 || oc new-project "$NAMESPACE" >/dev/null
		else
			err "Note: a running cluster operation delays the restart until it finishes (up to ~17 minutes)."
		fi
		ensure_proxy_secret
	fi
	err "$([ -n "$DRY" ] && echo Validating || echo Applying) $REF with the template of ${TAG}..."
	apply_template "$TEMPLATE" "$REF"
	if [ -n "$DRY" ]; then
		err "Dry run only; nothing was changed."
		return 0
	fi
	wait_rollout
	consolelink
	cleanup_legacy
	prune_replicasets
	if [ "$action" = deploy ]; then
		err "Deployed $REF."
	elif [ "$MODE" = checkout ]; then
		err "Upgraded to $REF. Verify with ./scripts/smoke-test.sh $NAMESPACE $APP_NAME"
	else
		err "Upgraded to $REF."
	fi
}

# Rolls back (or pins) to the build of an older commit with that commit's
# own deploy/template.yaml, so ports, probes and RBAC match its code. The
# cookie secret is kept, so sessions survive. Legacy cluster objects that an
# old template creates are left alone here (the old build needs them); the
# next upgrade removes them again.
rollback() {
	[ "$MODE" = checkout ] ||
		die "Rollback needs a clone. Without one, run the install.sh of the release you want: bash install.sh upgrade"
	case "$TAG" in latest | "") die "Usage: make rollback TAG=<release or commit> (for example TAG=v1.0.0, an image tag such as 4503bb7d, or any commit in this clone)" ;; esac
	[ -n "$TAG_EXPLICIT" ] || die "Usage: make rollback TAG=<release or commit>"
	preflight
	detect_oauth_proxy_image
	installed || die "No deployment $APP_NAME in $NAMESPACE; run 'make deploy' first."
	[ -n "$DRY" ] || ensure_proxy_secret
	local rev short8 short7 img_tag="" t label
	rev=$(git rev-parse --verify --quiet "$TAG^{commit}") || die "Commit $TAG is not in this clone; run 'git fetch origin --tags' and retry."
	git cat-file -e "$rev:deploy/template.yaml" 2>/dev/null || die "Commit $rev has no deploy/template.yaml."
	short8=${rev:0:8}
	short7=${rev:0:7}
	for t in "$TAG" "$short8" "$short7"; do
		if oc image info "$IMAGE:$t" --filter-by-os="$PLATFORM" >/dev/null 2>&1; then
			img_tag=$t
			break
		fi
	done
	[ -n "$img_tag" ] || die "No image $IMAGE for commit $rev (tried the tags $TAG, $short8 and $short7)."
	# By digest, like deploy and upgrade: the checked image is the one applied.
	pin_image "$img_tag"
	label=$(image_revision "$REF")
	if [ -n "$label" ] && [ "$label" != "$rev" ] && git cat-file -e "$label^{commit}" 2>/dev/null; then
		if [ "${ALLOW_TEMPLATE_MISMATCH:-}" = 1 ]; then
			err "WARNING: ALLOW_TEMPLATE_MISMATCH=1: $IMAGE:$img_tag reports revision $label, not $rev; applying the template of $rev anyway."
		else
			err "ERROR: $IMAGE:$img_tag reports revision $label, not $rev, so the template of $rev may not fit it. Nothing was changed."
			die "  Use TAG=$label, or set ALLOW_TEMPLATE_MISMATCH=1 to apply the template of $rev anyway."
		fi
	fi
	git show "$rev:deploy/template.yaml" >"$TMP/rollback-template.yaml"
	err "$([ -n "$DRY" ] && echo Validating || echo Applying) $REF with the template of commit $rev..."
	apply_template "$TMP/rollback-template.yaml" "$REF"
	if [ -n "$DRY" ]; then
		err "Dry run only; nothing was changed."
		return 0
	fi
	err "Note: a running cluster operation delays the restart until it finishes (up to ~17 minutes)."
	wait_rollout
	err "Rolled back. Roll forward again with: make upgrade"
}

# Removes the app, its cluster-wide RBAC, its Roles in other namespaces, the
# ConsoleLink and the namespace. RHOAI and everything the app created on the
# cluster (catalog, pull secret, IDMS, test resources) stay.
uninstall() {
	preflight
	local ns
	# shellcheck disable=SC2086 # DRY_FLAG is one word or nothing
	oc delete consolelink,clusterrolebinding,clusterrole -l "app.kubernetes.io/instance=$INSTANCE" --ignore-not-found $DRY_FLAG
	for ns in kube-system openshift-marketplace openshift-ingress; do
		# shellcheck disable=SC2086
		oc delete rolebinding,role -n "$ns" -l "app.kubernetes.io/instance=$INSTANCE" --ignore-not-found $DRY_FLAG
	done
	cleanup_legacy
	# shellcheck disable=SC2086
	oc delete project "$NAMESPACE" --ignore-not-found $DRY_FLAG
	if [ -n "$DRY" ]; then err "Dry run only; nothing was changed."; else err "Removed $APP_NAME from $NAMESPACE."; fi
}

case "$ACTION" in
install)
	require_tag
	if command -v oc >/dev/null 2>&1 && installed; then deploy_or_upgrade upgrade; else deploy_or_upgrade deploy; fi
	;;
deploy | upgrade) deploy_or_upgrade "$ACTION" ;;
rollback) rollback ;;
resolve-image)
	resolve_image
	printf '%s\n' "$REF"
	;;
cleanup-legacy) cleanup_legacy ;;
uninstall) uninstall ;;
esac
