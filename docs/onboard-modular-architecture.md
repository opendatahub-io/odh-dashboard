# Onboarding a New Modular Architecture Module

This guide outlines the steps to create and onboard a new modular architecture module into the ODH Dashboard.

## Prerequisites

- Node.js >= 22.18.0.
- pnpm 11.22.0 (the version pinned in the repository root).
- Access to the ODH Dashboard repository.

> **Recommended**: Use the `/module-onboarding` Claude Code skill to automate this entire process (port allocation, scaffolding, host registration and verification). After module scaffolding, use `/konflux-onboarding` for CI/CD pipeline setup, standalone manifests and dashboard-operator registration. These skills are the recommended method for onboarding new modules.

## Steps

### 1. Pick Unique Ports

Each module needs **unique** ports so that multiple federated modules can run simultaneously. From the repository root, list the ports already in use:

```bash
pnpm run validate:ports
```

This prints every `module-federation.local.port` in the workspace (including `distributions/`) and every production service port registered in the dashboard-operator (`dashboard-operator/internal/controller/modules.go`).

Modules that are scaffolded but not yet registered in the operator (registration happens in `/konflux-onboarding`) already claim a production port in `module-federation.service.port`. List those too, and pick a service port that is free in both lists:

```bash
node -e 'const fs = require("fs"); for (const f of fs.readdirSync("packages")) { const m = "./packages/" + f + "/package.json"; if (!fs.existsSync(m)) continue; try { const p = require(m)["module-federation"]?.service?.port; if (p) console.log(p); } catch (e) { console.error("packages/" + f + ": " + e.message); } }' | sort -n
```

`validate:ports` does not cover BFF ports. List the BFF ports already in use separately, and pick a BFF port that does not appear in this list. Ports `4000` (the dashboard backend and the default dev setup) and `4010` (the dashboard shell) are always reserved, even if the list does not show them:

```bash
grep -hoE '(PROXY_)?PORT=40[0-9]{2}' packages/*/Makefile packages/*/package.json distributions/*/Makefile distributions/*/package.json 2>/dev/null | grep -oE '[0-9]+' | sort -n | uniq
```

> **Convention**: Frontend federation ports use the 9100–9399 range. BFF (local dev) ports use the 4000–4099 range, excluding the reserved `4000` and `4010`. Production service ports step by 100 (`8043`, `8143`, …). Pick the next available number in each range.

### 2. Initialize the Module

From the `packages` folder, scaffold the module with the installer, passing the ports you picked. Replace `<your-module-name>` with the kebab-case module name:

```bash
cd packages
pnpm dlx mod-arch-installer@1.23.0 -n <your-module-name> --port <frontend-port> --bff-port <bff-port> --service-port <service-port>
cd ..
```

The installer writes the ports into the module's `package.json`, `Makefile` and frontend scripts, uses `OdhFederationPlugin` for Module Federation, and `workspace:*` for internal `@odh-dashboard/*` dependencies.

### 3. Register the Module in the Workspace

Add the module frontend to the root `pnpm-workspace.yaml` (`packages/*` does not match nested packages):

```yaml
packages:
  # ...
  - packages/<your-module-name>/frontend
```

Then install from the repository root and validate:

```bash
pnpm install
pnpm run validate:ports
pnpm run validate:cypress-mock
```

`validate:ports` also runs automatically in CI and the pre-commit hook.

### 4. Add the Area and Feature Flag

To enable your module in the main dashboard, register a `SupportedArea` and a feature flag:

1. `packages/plugin-core/src/areas/types.ts` — add `PLUGIN_<YOUR_MODULE> = 'plugin-<your-module-name>'` under `/* Plugins */`.
2. `packages/k8s-core/src/k8sTypes.ts` — add `<yourModuleName>?: boolean;` to `DashboardCommonConfig`.
3. `frontend/src/concepts/areas/const.ts` — add the flag default to `techPreviewFlags` and an entry to `SupportedAreasStateMap`:

   ```typescript
   export const techPreviewFlags = {
     // ... existing flags
     yourModuleName: false,
   } satisfies Partial<DashboardCommonConfig>;

   export const SupportedAreasStateMap: SupportedAreasState = {
     // ... existing entries
     [SupportedArea.PLUGIN_YOUR_MODULE]: {
       featureFlags: ['yourModuleName'],
     },
   };
   ```

4. `manifests/base/crd/odhdashboardconfigs.opendatahub.io.crd.yaml` — add the flag as a `boolean` property under `dashboardConfig` so it can be set on a cluster.

The scaffolded `frontend/src/odh/extensions.ts` already references `SupportedArea.PLUGIN_<YOUR_MODULE>` and the `yourModuleName` flag.

### 5. Run the Application

Now that your project is configured, you can run the entire stack (backend, frontend, and your new module) locally.

From the root of the repository, run:

```bash
pnpm run dev:frontend
```

And in another terminal:

```bash
pnpm run dev:backend
```

And once you have that, in another terminal run:

```bash
cd packages/<your-module>
make dev-start-federated
```

These three commands collectively start:

- The Dashboard Backend
- The Dashboard Frontend (Shell)
- Your new Modular Architecture Module (Federated)

The `yourModuleName` flag defaults to `false`, so the module's navigation and route stay hidden until you enable it locally. Set `yourModuleName: true` under `dashboardConfig` in your dev cluster's `OdhDashboardConfig`, or open the dashboard with `?devFeatureFlags=yourModuleName=true` for this browser session.

Access the dashboard in your browser (usually at `http://localhost:4000` or the port configured for the shell) and verify that your module is loaded.

> **Note**: In production, the Dashboard Module Controller (operator) handles all deployment and configuration automatically. The local development workflow described above is only for development purposes. See the sections below for production deployment details.

## Standalone Deployment

In production, each module is deployed as an **independent Kubernetes Deployment** with its own Service, ServiceAccount, NetworkPolicy, and RBAC resources.

The Dashboard Module Controller (operator in `dashboard-operator/`) manages the full lifecycle of each module based on the `Dashboard` custom resource (CR). Modules are enabled or disabled based on:

- **DSC component gates**: Each module can declare required DataScienceCluster components (e.g., `modelregistry`, `mlflowoperator`, `trustyai`). If the required component is not available, the module is disabled.
- **Explicit CR overrides**: The `Dashboard` CR spec allows explicit enable/disable overrides per module.
- **Inter-module dependencies**: A module can depend on other modules (e.g., `autorag` depends on `genAi`). If a dependency is disabled, the dependent module is also disabled.

Each enabled module gets its own set of Kubernetes resources:

| Resource | Purpose |
|----------|---------|
| **Deployment** (2 replicas) | Runs the module's container (frontend + BFF) |
| **Service** | Exposes the module within the cluster (e.g., `odh-dashboard-<slug>-ui`) |
| **NetworkPolicy** | Controls ingress/egress for the module's pods |
| **ServiceAccount** (`service-account.yaml`) | Identity for the module's pods |
| **ClusterRole** (`cluster-role.yaml`) | RBAC permissions the module needs |
| **ClusterRoleBinding** (`cluster-role-binding.yaml`) | Binds the ClusterRole to the ServiceAccount |

These manifests live in `manifests/modules/<slug>/` (see [Module Manifests](#module-manifests) below).

## Operator Integration

For the operator to manage your module, it must be registered in the **module registry** at `dashboard-operator/internal/controller/modules.go`.

Each entry in `moduleRegistry` specifies:

```go
type ModuleDefinition struct {
    Name                    string   // Logical name (e.g., "genAi")
    ContainerName           string   // Container name in the Deployment (e.g., "gen-ai-ui")
    Port                    int32    // Container port (e.g., 8143)
    ImageEnvVar             string   // Env var for the container image (e.g., "RELATED_IMAGE_ODH_MOD_ARCH_GEN_AI_IMAGE")
    RequiredDSCComponents   []string // DSC components that must be present (e.g., ["modelregistry"])
    InterModuleDependencies []string // Other modules this module depends on (e.g., ["genAi"])
    ManifestSlug            string   // Directory name under manifests/modules/ (e.g., "gen-ai")
    TLS                     bool     // Serve the module over TLS (true for all current modules)
    ProxyPaths              []proxyRoute         // Optional; defaults to /<ManifestSlug>/api -> /api
    InterBFFDeps            []interBFFDependency // Optional; service-discovery env vars for calling other BFFs
    RequiredByMaaSPortal    bool     // Required when the MaaS Portal operand is managed independently
}
```

The operator uses this registry to:

1. **Resolve module status** via a three-pass algorithm (DSC gate check, dependency resolution, unknown module detection).
2. **Render manifests** from `manifests/modules/<slug>/` using Kustomize.
3. **Deploy resources** via Server-Side Apply (SSA).
4. **Build the `federation-config` ConfigMap** dynamically, pointing to each module's standalone Service so the Fastify backend knows how to proxy requests and load `remoteEntry.js`.

When modules are enabled or disabled, the operator updates the `federation-config` ConfigMap and triggers a rolling restart of the main dashboard deployment via a content hash annotation.

## Module Manifests

Each module's Kubernetes manifests live in `manifests/modules/<slug>/`. For example, `manifests/modules/gen-ai/` contains:

| File | Purpose |
|------|---------|
| `deployment.yaml` | Pod spec with the module's container, environment variables, probes, and resource limits |
| `service.yaml` | ClusterIP Service exposing the module's port (e.g., `odh-dashboard-gen-ai-ui`) |
| `networkpolicy.yaml` | Ingress rules (from main dashboard) and egress rules (to Kubernetes API, external services, other BFFs) |
| `service-account.yaml` | ServiceAccount for the module's pods |
| `cluster-role.yaml` | RBAC permissions (e.g., access to specific CRDs, secrets, configmaps) |
| `cluster-role-binding.yaml` | Binds the ClusterRole to the module's ServiceAccount |
| `params.env` | Kustomize parameters for image references and namespace |
| `kustomization.yaml` | Kustomize configuration referencing all the above resources |

When creating manifests for a new module, reference an existing module (e.g., `manifests/modules/gen-ai/`) as a pattern. Key things to customize:

- **Container port** must match the port in the module registry
- **Service name** should follow the convention `odh-dashboard-<slug>-ui`
- **NetworkPolicy** should allow ingress from the main dashboard and egress to required backends
- **ClusterRole** should include only the RBAC permissions your module actually needs
- **Environment variables** in the deployment should include `POD_NAMESPACE` (via downward API) and any inter-BFF service discovery variables

## Release and Security Readiness

These steps happen after scaffolding, through `/konflux-onboarding`, but a module must not ship without them:

- **Downstream base images**: `Dockerfile.konflux.<name>` in `red-hat-data-services/odh-dashboard` is copied from a module that already ships on the target branch, so it starts with the base-image digests MintMaker keeps current (including security rebuilds such as the eMudhra CA remediation, RHSB-2026-012). The runtime is `registry.redhat.io/ubi9/ubi-minimal-pqc`. Review and merge the digest-update PRs MintMaker opens.
- **ProdSec registration**: the image (`rhoai/odh-mod-arch-<name>-rhel9`) must be registered as a ProdSec `pscomponent` before its first release. Request it in `#forum-aipcc` and get ProdSec's confirmation before release. CVE tracking tickets are only generated for registered images; once a CVE affecting the image has been processed, its tickets show up under the Jira query `labels = "pscomponent:rhoai/odh-mod-arch-<name>-rhel9"`.

## Related Documentation

- [Module Federation](./module-federation.md) - How Module Federation connects the frontend modules
- [Inter-BFF Communication](./inter-bff-communication.md) - How BFF services communicate with each other
- [Dashboard Operator Architecture](./dashboard-operator.md) - Full details on the operator controller
- [Architecture Overview](./architecture.md) - Overall system architecture
- `/module-onboarding` skill -- Automated port allocation, scaffolding, host registration and verification
- `/konflux-onboarding` skill -- CI/CD pipelines, standalone manifests and dashboard-operator registration
