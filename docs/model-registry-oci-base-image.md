# Model Registry OCI Upload Base Image

Set the optional `Dashboard.spec.modelRegistryOCIBaseImage` field when Model Registry upload Jobs need a base image from a registry reachable by the Job pod. The Job pulls this image while preparing an OCI upload. It is separate from the async-upload Job container image and the destination repository that receives the model.

The dashboard-operator copies this field to `model-registry-ui-config.data.images-oci-base-image` on every reconcile. The Model Registry BFF reads that ConfigMap entry and passes the selected image and its diagnostic source to newly created or retried Jobs. This path requires a BFF build that includes the ConfigMap reader; the vendored BFF is updated through the normal Model Registry upstream sync.

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

Use a registry-qualified reference. The controller checks its syntax without pulling it or testing network access. A disconnected cluster needs an image that the Job pod can pull from its internal registry. An invalid value sets the Dashboard `ProvisioningSucceeded` condition to `False` with the validation error in its message; the existing ConfigMap keeps its last successfully applied value.

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

The generated ConfigMap is managed by dashboard-operator. Edit the CR for operator-managed deployments. Independent Kustomize deployments can set `images-oci-base-image` in the selected overlay's `params.env` before rendering; that path has no Dashboard CR controller.
