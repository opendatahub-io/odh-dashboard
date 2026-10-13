# Model Registry OCI Upload Base Image

For Operator-managed deployments, `Dashboard.spec.modelRegistryOCIBaseImage` is the supported administrator configuration entry point for the Model Registry OCI upload base image. Set this optional field to an image in a registry reachable by the Job pod. The Job pulls this image while preparing an OCI upload. It is separate from the async-upload Job container image and the destination repository that receives the model.

The dashboard-operator copies this field to `model-registry-ui-config.data.images-oci-base-image` on every reconcile. The Model Registry BFF reads that ConfigMap entry and passes the selected image and its diagnostic source to newly created or retried Jobs. This path requires a BFF build that includes the ConfigMap reader; the vendored BFF is updated through the normal Model Registry upstream sync.

The ConfigMap is controller-managed output. Configure the Dashboard CR rather than editing the ConfigMap or the Operator's `params.env`. The OCI upload base image is administrator-owned and has no `RELATED_IMAGE_*` mapping; the async-upload Job container image continues to use the normal related-image configuration.

## Configure the Dashboard CR

The Dashboard CR is cluster-scoped and its permitted name is `default-dashboard`. The platform operator supplies a `dashboard-editor-role` ClusterRole with `get`, `patch`, and `update` on Dashboard CRs; an administrator needs that role bound to their identity or equivalent permissions. Check that the CR exists and that your identity can update it:

```bash
oc get dashboards.components.platform.opendatahub.io
oc auth can-i patch dashboards.components.platform.opendatahub.io/default-dashboard
```

Set or change the image reference:

```yaml
spec:
  modelRegistryOCIBaseImage: mirror.example.com/library/busybox:1.0
```

For an existing CR, apply the same change with:

```bash
oc patch dashboards.components.platform.opendatahub.io default-dashboard --type=merge \
  -p '{"spec":{"modelRegistryOCIBaseImage":"mirror.example.com/library/busybox:1.0"}}'
```

Use a registry-qualified reference. The API server rejects non-empty values without a registry host and repository, or containing whitespace, so an invalid `oc patch` fails without changing the saved configuration. The controller performs additional image-reference syntax checks without pulling the image or testing network access. A disconnected cluster needs an image that the Job pod can pull from its internal registry.

A value that passes admission but fails the controller's syntax check adds an informational `ModelRegistryConfigValid=False` condition with reason `InvalidOCIBaseImage` and the validation error in its message. This condition is excluded from the `Ready` rollup: the Dashboard remains `Ready=True` when its other resources are healthy. Invalid OCI input alone does not return a reconcile error or trigger failure backoff; editing the Dashboard CR triggers reconciliation, and normal periodic reconciliation continues. Correcting or removing the field clears the informational condition.

The controller preserves the upload ConfigMap's existing OCI base-image value, or uses an empty value if none exists, while continuing to apply other rendered configuration, including the async-upload Job container image. If the ConfigMap does not yet exist, it is created with an empty OCI base-image value. Unrelated resource updates and disabled-module cleanup continue. Failures to read or apply the ConfigMap still return an error for retry; these operational failures can make the Dashboard `NotReady`.

Remove the field to return to the BFF default:

```bash
oc patch dashboards.components.platform.opendatahub.io default-dashboard --type=json \
  -p='[{"op":"remove","path":"/spec/modelRegistryOCIBaseImage"}]'
```

When the field is absent, the generated ConfigMap value is empty and the BFF uses `quay.io/quay/busybox:latest`. Jobs created outside the BFF retain their own `public.ecr.aws/docker/library/busybox:latest` default when their base-image env is omitted. No cluster connectivity mode is inferred.

## Verify the Applied Value

Find the namespace containing `model-registry-ui-config`, then inspect the value and Dashboard condition:

```bash
oc get configmap --all-namespaces --field-selector metadata.name=model-registry-ui-config
# Set DASHBOARD_NAMESPACE to the namespace shown above.
oc -n "$DASHBOARD_NAMESPACE" get configmap model-registry-ui-config \
  -o go-template='{{index .data "images-oci-base-image"}}'
oc get dashboard default-dashboard -o yaml
```

After creating or retrying an upload from Dashboard, inspect the new Job's `MODEL_SYNC_DESTINATION_OCI_BASE_IMAGE` and `MODEL_SYNC_DESTINATION_OCI_BASE_IMAGE_SOURCE` env entries:

```bash
oc -n "$JOB_NAMESPACE" get job "$JOB_NAME" -o yaml
```

A configured CR value has source `deployment-config`; a blank ConfigMap value makes the BFF inject its default with source `bff-default`. Updating the CR does not change Jobs already running.

The generated ConfigMap is managed by dashboard-operator while the core Dashboard is enabled, including when the Model Registry module is disabled. The controller restores it from the CR if it is edited or deleted. Setting the core Dashboard's `managementState` to `Removed` deletes this ConfigMap without validating the OCI base image. Edit the CR for operator-managed deployments. Independent Kustomize deployments can set `images-oci-base-image` in the selected overlay's `params.env` before rendering; that path has no Dashboard CR controller.
