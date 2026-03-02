# AutoML

Automated machine learning model generation for Red Hat OpenShift AI.

## What is AutoML?

AutoML is an intelligent system that automatically discovers optimal configurations for machine learning models. Instead of manually tuning training parameters through trial and error, AutoML:

- **Automates parameter exploration** using the AutoGluon library
- **Orchestrates experiments** through Kubeflow Pipelines
- **Evaluates configurations** against your test datasets using quality metrics
- **Generates deployable artifacts** (machine learning models) ready for production use

This systematic approach helps data scientists and ML engineers build higher-quality machine learning models faster.

## About This Project

This repository contains the **web interface and backend service** for AutoML within the ODH Dashboard ecosystem. It provides:

- **React Frontend**: PatternFly v6-based UI for managing AutoML workflows (currently placeholder implementation)
- **Go BFF (Backend-for-Frontend)**: API gateway that serves static assets, handles authentication, and facilitates cluster integration

**Current Maturity**: This is an early-stage project with functional infrastructure but limited UI features. The architecture supports three deployment modes (standalone, kubeflow, federated), with the BFF currently providing essential authentication and cluster access capabilities.

## Contributing

See the [Contributing Guide](CONTRIBUTING.md) for development workflows, setup instructions, and contribution guidelines.

For general ODH Dashboard contribution guidelines, refer to [ODH CONTRIBUTING.md](/CONTRIBUTING.md).

## Prerequisites

- **[Node.js](https://nodejs.org/)**: v22.0.0 or later
- **[Go](https://go.dev/)**: v1.24.3 or later
- **[Docker](https://www.docker.com/)**/**[Podman](https://podman.io/)**: For containerized deployment

## Project Structure

```text
packages/automl/
├── api/openapi/
│   └── automl.yaml         # OpenAPI 3.0 specification
├── bff/                     # Go Backend-for-Frontend
│   ├── cmd/main.go          # Application entry point
│   ├── internal/            # BFF implementation
│   ├── go.mod               # Go dependencies
│   └── Makefile             # BFF build commands
├── frontend/                # React Frontend application
│   ├── src/                 # Source code
│   ├── config/              # Webpack & Module Federation
│   └── package.json         # Frontend dependencies
├── docs/                    # Documentation
├── Dockerfile               # Multi-stage container build
├── Makefile                 # Build and development commands
└── package.json             # Module Federation config
```

## Quick Start

### Environment Configuration

For local development, make sure to create a `.env.local` file in `/packages/automl` using the accompanying `.env.local.example` to customize environment variables:

```bash
# Copy the example environment file to create your local configuration
cp .env.local.example .env.local
```

Environment variables can be updated in the `.env.local` file based on your local setup requirements.
The `.env.local` file is gitignored and should never be committed.

### Frontend Development

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run start:dev
```

The standalone frontend will be available at **http://localhost:9000**

### Backend (BFF) Development

```bash
# Navigate to the BFF directory
cd bff

# Start BFF with mocked Kubernetes and HTTP clients
make run
```

**Without Mocks** (requires Kubernetes cluster access):

```bash
cd bff && make run PORT=4000 MOCK_K8S_CLIENT=false MOCK_HTTP_CLIENT=false DEV_MODE=true DEPLOYMENT_MODE=standalone
```

### Running Both Together

**Standalone Mode (Recommended for local development):**

```bash
# From the automl package root, start both frontend and BFF in mocked mode
make dev-start
```

Then access the app at **http://localhost:9000**

**Federated Mode (for testing ODH Dashboard integration):**

```bash
# From the automl package root, start AutoML as a micro-frontend
make dev-start-federated
```

**Important:** You must also run the main ODH Dashboard separately (from repo root: `npm run dev`). Then access AutoML through the ODH Dashboard UI at **http://localhost:4010** - look for the AutoML option in the side navigation.

### Deployment Modes

AutoML supports three deployment configurations:

1. **Standalone**: Local development with BFF serving UI and APIs (default)
2. **Kubeflow**: Integration with Kubeflow Dashboard (Material UI theme)
3. **Federated**: Micro-frontend loaded by ODH/RHOAI dashboard (PatternFly theme)

```bash
# Start in standalone mode
make dev-start

# Start in Kubeflow mode
make dev-start-kubeflow

# Start in federated mode
make dev-start-federated
```

## Docker Deployment

Docker deployment documentation is coming soon. For now, please use the local development setup described above in the Quick Start section.

## Configuration

Key environment variables for the BFF:

| Variable            | Description                              | Default    |
|---------------------|------------------------------------------|------------|
| `PORT`              | HTTP server port                         | 4000       |
| `DEPLOYMENT_MODE`   | `standalone`, `kubeflow`, or `federated` | standalone |
| `DEV_MODE`          | Enables development features             | false      |
| `MOCK_K8S_CLIENT`   | Use in-memory mock for Kubernetes        | false      |
| `MOCK_HTTP_CLIENT`  | Use in-memory mock for HTTP client       | false      |
| `STATIC_ASSETS_DIR` | Directory for frontend assets            | ./static   |
| `LOG_LEVEL`         | Logging level (ERROR, WARN, INFO, DEBUG) | INFO       |

## License

This project is licensed under the Apache License 2.0 - see the LICENSE file in the repository root for details.
