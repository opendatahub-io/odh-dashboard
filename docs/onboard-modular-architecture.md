# Onboarding a New Modular Architecture Module

This guide outlines the steps to create and onboard a new modular architecture module into the ODH Dashboard.

## Prerequisites

- Node.js and npm installed.
- Access to the ODH Dashboard repository.

## Steps

### 1. Navigate to the Packages Directory

Open your terminal and navigate to the `packages` folder within the repository:

```bash
cd packages
```

### 2. Initialize the Module

Start a new modular architecture project using the installer. Replace `<your-module-name>` with the desired name for your module.

```bash
npx mod-arch-installer -n <your-module-name>
```

### 3. Configure the Port

Each module needs a **unique** local dev port so that multiple federated modules can run simultaneously. To see which ports are already in use, run the validation script:

```bash
npm run validate:ports
```

This prints a complete list of all current port assignments, sourced directly from the workspace `package.json` files and `federation-configmap.yaml`.

> **Convention**: Frontend federation ports use the 9100–9399 range. BFF ports use the 4000–4099 range. Pick the next available number in the appropriate range.

Pick an unused port and update both `Makefile` and `package.json`:

1. **Update `Makefile`**:
   Open `packages/<your-module-name>/Makefile` and find the `dev-frontend-federated` target. Update the `PORT` variable:

   ```makefile
   dev-frontend-federated:
       cd frontend && AUTH_METHOD=user_token DEPLOYMENT_MODE=federated STYLE_THEME=patternfly PORT=<your-port> npm run start:dev
   ```

2. **Update `package.json`**:
   Open `packages/<your-module-name>/package.json` and update the `module-federation` configuration:

   ```json
   "module-federation": {
     "local": {
       "port": <your-port>
     }
   }
   ```

3. **Validate uniqueness**:
   Run the port validation script to confirm there are no conflicts:

   ```bash
   node scripts/validate-module-ports.js
   ```

   This check also runs automatically in CI and the pre-commit hook.

### 4. Add Feature Flag

To enable your module in the main dashboard, you need to add a feature flag.

1. Open `frontend/src/concepts/areas/const.ts` in the root of the repository.
2. Search for existing flags (e.g., search for `disable` or `techPreviewFlags`).
3. Add your new feature flag to the appropriate group (e.g., `techPreviewFlags`):

   ```typescript
   export const techPreviewFlags = {
     // ... existing flags
     // yourModuleName: true, // Set to true to enable by default in tech preview, or false otherwise
   } satisfies Partial<DashboardCommonConfig>;
   ```

### 5. Run the Application

Now that your project is configured, you can run the entire stack (backend, frontend, and your new module) locally.

From the root of the repository, run:

```bash
npm run dev:frontend
```

And in another terminal:

```bash
npm run dev:backend
```

And once you have that, in another terminal run:

```bash
cd packages/<your-module>
make dev-start-federated
```

This command will start:

- The Dashboard Backend
- The Dashboard Frontend (Shell)
- Your new Modular Architecture Module (Federated)

Access the dashboard in your browser (usually at `http://localhost:4000` or the port configured for the shell) and verify that your module is loaded.

> **Note**: In production, the Dashboard Module Controller (operator) handles all deployment and configuration automatically. The local development workflow described above is only for development purposes. See the sections below for production deployment details.

## Standalone Deployment

In production, each module is deployed as an **independent Kubernetes Deployment** rather than a sidecar container in the main dashboard pod. This is the primary deployment mode for all modular architecture modules.

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
| **ServiceAccount** | Identity for the module's pods |
| **ClusterRole** | RBAC permissions the module needs |
| **ClusterRoleBinding** | Binds the ClusterRole to the ServiceAccount |

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
| `serviceaccount.yaml` | ServiceAccount for the module's pods |
| `clusterrole.yaml` | RBAC permissions (e.g., access to specific CRDs, secrets, configmaps) |
| `clusterrolebinding.yaml` | Binds the ClusterRole to the module's ServiceAccount |
| `params.yaml` | Kustomize parameters for image references and namespace |
| `kustomization.yaml` | Kustomize configuration referencing all the above resources |

When creating manifests for a new module, reference an existing module (e.g., `manifests/modules/gen-ai/`) as a pattern. Key things to customize:

- **Container port** must match the port in the module registry
- **Service name** should follow the convention `odh-dashboard-<slug>-ui`
- **NetworkPolicy** should allow ingress from the main dashboard and egress to required backends
- **ClusterRole** should include only the RBAC permissions your module actually needs
- **Environment variables** in the deployment should include `POD_NAMESPACE` (via downward API) and any inter-BFF service discovery variables

## Related Documentation

- [Module Federation](./module-federation.md) - How Module Federation connects the frontend modules
- [Inter-BFF Communication](./inter-bff-communication.md) - How BFF services communicate with each other
- [Dashboard Operator Architecture](./dashboard-operator.md) - Full details on the operator controller
- [Architecture Overview](./architecture.md) - Overall system architecture
