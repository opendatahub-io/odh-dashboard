## Model Serving
`packages/model-serving` provides a generic UI and extension points for different model-serving platforms to implement. See [the overview](docs/overview.md) for more details.

There are currently three platforms:

### kserve
Provides extensions for creating and managing predictive and generative models using `InferenceServices` with `ServingRuntimes` in a project. Global `Templates` provide out-of-the-box `ServingRuntimes`.

### llmd-serving
Provides extensions for creating and managing generative model deployments using `LLMInferenceServices`. Each deployment can use multiple `LLMInferenceServiceConfigs` and includes out-of-the-box vLLM accelerator configurations and topology templates.

### nim-serving
The package requires an NVIDIA NIM API key to enable NIM as a valid model location when creating new model deployments. It extends the existing `kserve` package to create and manage modified `InferenceServices` with an NIM-specific `ServingRuntime`.

An experimental `NIMService` is possible too.

## Cluster setup
Using the `packages/llmd-serving` package requires an `openshift-ai-inference` Gateway:
```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: openshift-default
  namespace: openshift-ingress
spec:
  controllerName: openshift.io/gateway-controller/v1
---
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  labels:
    istio.io/rev: openshift-gateway
  name: openshift-ai-inference
  namespace: openshift-ingress
spec:
  gatewayClassName: openshift-default
  listeners:
  - allowedRoutes:
      namespaces:
        from: All
    name: http
    port: 80
    protocol: HTTP
```

## Local dev setup
For most cases, run the following in the `frontend/` directory:
```bash
pnpm run start:dev:ext
```

If you have non-UI changes or need to run with other local package servers, run the following from the repository root:
```bash
pnpm run dev
```

If you use `pnpm run dev` with the Gateway field in `packages/llmd-serving`, run one of the following commands in a separate terminal:
```bash
kubectl port-forward -n opendatahub svc/model-serving-api 8443:443
```
or:

```bash
kubectl port-forward -n redhat-ods-applications svc/model-serving-api 8443:443
```

## High-level design
The `model-serving` package works with generic `Deployment` types with a main `Deployment.model` object and an optional template config `Deployment.server` object.
```typescript
export type Deployment<
  ModelResource extends K8sResourceCommon,
  ServerResource extends K8sResourceCommon,
> = {
  modelServingPlatformId: string;  // 'llmd-serving' or 'kserve' 
  model: ModelResource;  // InferenceServiceKind or LLMInferenceServiceKind
  server?: ServerResource;
  status?: DeploymentStatus;
  endpoints?: DeploymentEndpoint[];
  apiProtocol?: string;
  resources?: ModelServingPodSpecOptionsState;
};
```

If you can accomplish everything you need for a deployment using the generic `K8sResourceCommon` types here, the code can live in `model-serving` (for example reading and setting annotations or other metadata properties).

If you need to read / write from the `model.spec`, this will need to be done using extensions and implemented in the specific model serving platform packages.