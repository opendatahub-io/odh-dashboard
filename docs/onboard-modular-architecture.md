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

Each module needs a **unique** local dev port so that multiple federated modules can run simultaneously. Pick an unused port from the registry below and update both `Makefile` and `package.json`.

#### Port Registry

| Port | Module | Package |
| ---- | ----------------- | -------------------------------- |
| 4000 | Dashboard Backend | `backend` |
| 4010 | Dashboard Frontend| `frontend` |
| 9005 | Observability | `@odh-dashboard/observability` |
| 9100 | Model Registry | `@odh-dashboard/model-registry` |
| 9102 | Gen AI | `@odh-dashboard/gen-ai` |
| 9104 | MaaS | `@odh-dashboard/maas` |
| 9105 | Notebooks | `@odh-dashboard/notebooks` |
| 9106 | Eval Hub | `@odh-dashboard/eval-hub` |
| 9107 | AutoRAG | `@odh-dashboard/autorag` |
| 9108 | AutoML | `@odh-dashboard/automl` |
| 9110 | MLflow | `@odh-dashboard/mlflow` |
| 9300 | MLflow Embedded | `@odh-dashboard/mlflow-embedded` |

> **Convention**: Frontend federation ports use the 9100–9399 range. BFF ports use the 4000–4099 range. Pick the next available number in the appropriate range.

#### Steps

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

Now that your project is configured, you can run the entire stack (backend, frontend, and your new module).

From the root of the repository, run:

```bash
npm run dev:frontend
```

And in other terminal

```bash
npm run dev:backend
```

And once you have that in another terminal run

```bash
cd packages/<your-module>
make dev-start-federated
```

This command will start:

- The Dashboard Backend
- The Dashboard Frontend (Shell)
- Your new Modular Architecture Module (Federated)

Access the dashboard in your browser (usually at `http://localhost:4000` or the port configured for the shell) and verify that your module is loaded.
