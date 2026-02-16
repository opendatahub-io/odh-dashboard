# Model Serving Locations

All deployments require selecting a model to use, and that requires entering the location. There are several ways to specify this using direct YAML and different support in the UI.

The deployment wizard must handle two main resource types:
- **InferenceService** (KServe) - `serving.kserve.io/v1beta1`
- **LLMInferenceService** (LLMd) - `serving.kserve.io/v1alpha1`

## How Model Locations Work

### Primary Method: Connections API (recommended)

1. **Dashboard creates a Connection** (a Secret with specific labels/annotations)
2. **Dashboard applies the `opendatahub.io/connections` annotation** to the deployment resource
3. **A webhook (external to Dashboard)** reads this annotation and populates the deployment's storage properties

The webhook handles translating the Connection into the appropriate YAML properties (`storage.key`, `storageUri`, `imagePullSecrets`, etc.).

### Alternative: Direct YAML (No Connections API)

Users could bypass the Connections API by directly applying YAML properties, but:
- Doesn't use the Dashboard's connection management
- The form must still be able to **load and edit** such deployments

### Public vs Authenticated Access

**Public model locations** are essentially **URI types** - just a URL/path with no auth:
- `s3://public-bucket/model` (public S3)
- `oci://quay.io/public/image:tag` (public registry)
- `hf://facebook/opt-125m` (public HuggingFace model)
- `https://example.com/model.tar.gz` (public URL)

**Authenticated access** requires Connections:
- **S3 Connection** - Contains AWS credentials
- **OCI Connection** - Contains Docker config JSON for registry auth

> **Note:** Private HuggingFace models requiring auth are **not supported** through the Connections API. This requires ServiceAccount configuration which the wizard doesn't support.

## Visible vs Hidden Connections

When creating a deployment, the form **always creates a Connection secret** behind the scenes.

A visible connection has the label `opendatahub.io/dashboard: 'true'` and will show up in the project's Connection list

A hidden connection has `opendatahub.io/dashboard: 'false'` and has an `ownerReference` pointing to the deployment. This automatically gets deleted alongside the deployment.


# Compatibility Matrix

| Storage Type | Auth | InferenceService | LLMInferenceService | Type |
|--------------|------|------------------|---------------------|-----------------|
| S3 | Public | ✅ `storageUri: s3://...` | ✅ `model.uri: s3://...` | URI |
| S3 | Secret Key | ✅ via webhook | ✅ via webhook | S3 Connection / Service Account |
| OCI | Public | ✅ `storageUri: oci://...` | ✅ `model.uri: oci://...` | URI |
| OCI | Pull Secret | ✅ via webhook | ✅ via webhook | OCI Connection |
| HuggingFace | Public | ✅ `storageUri: hf://...` | ✅ `model.uri: hf://...` | URI  |
| HuggingFace | Token | ❌ Not supported | ❌ Not supported | ⚠️ **Service Account** |
| HTTP/HTTPS | Public | ✅ `storageUri` | ✅ `model.uri` | URI |
| PVC | N/A | ✅ `storageUri: pvc://...` | ✅ `model.uri: pvc://...` | PVC |
| Azure | Public / Private | ❌ Not supported | ❌ Not supported | ⚠️ **Service Account** |
| GCS | Public / Private | ❌ Not supported | ❌ Not supported | ⚠️ **Service Account** |
