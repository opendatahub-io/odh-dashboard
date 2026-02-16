
**InferenceServices:**
- ✅ connection-hidden-oci.yaml
  - Model Location | "OCI
- ⚠️ connection-hidden-s3.yaml **(Connection requires `opendatahub.io/managed: 'true'`)**
  - Model Location | "Existing Connection"
  - Connection | empty
- ✅ connection-hidden-uri.yaml
- ❌ connection-invalid-type.yaml
  - Model Location | "Existing Connection"
  - Connection | empty
- ✅ connection-visible-oci.yaml
- ⚠️ connection-visible-s3.yaml  **(Connection requires `opendatahub.io/managed: 'true'`)**
- ✅ cconnection-visible-uri.yaml
- ❌ direct-imagepullsecrets.yaml 
  - Model Location | "Existing Connection"
  - Connection | empty
- ❌ direct-storage-key.yaml
  - Model Location | "Existing Connection"
  - Connection | empty
- ❌ direct-uri-public-hf.yaml
  - Model Location | empty
  - Create connection | checked
  - Connection Name etc | empty
- ❌ direct-uri-public-http.yaml
  - same as above
- ❌ direct-uri-public-oci.yaml
  - same as above
- ❌ direct-uri-public-s3.yaml
  - same as above
- ✅ pvc-missing.yaml
- ⚠️ pvc.yaml (PVC requires label `opendatahub.io/dashboard: 'true'`)

**LLMInferenceServices**
- the rest is the same as `InferenceService`