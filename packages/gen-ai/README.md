# Gen AI

A modern web application with a modular architecture, featuring a React frontend and Go backend for frontend (BFF).

## Contributing

Interested in contributing? See our [Contributing Guide](CONTRIBUTING.md) for:
- Development setup and quick start
- Testing requirements and workflows
- Coding standards and conventions
- PR process and checklist

For general ODH contribution guidelines, see the main [ODH CONTRIBUTING.md](/CONTRIBUTING.md).

## Project Overview

This project is a web application built with a modular architecture. It consists of:

- **Frontend**: A React application built with TypeScript and PatternFly components
- **Backend for Frontend (BFF)**: A Go service that serves the frontend static assets and provides API endpoints

## Prerequisites

- [Node.js](https://nodejs.org/) (v20 or later)
- [Go](https://golang.org/) (v1.23.5 or later)
- [Docker](https://www.docker.com/) (for containerized deployment)

## Project Structure

```
.
├── bff/                # Backend for Frontend (Go)
│   ├── cmd/            # Application entry point
│   ├── internal/       # Internal packages
│   └── static/         # Static files served by the BFF
├── frontend/           # React frontend application
│   ├── src/            # Source code
│   └── dist/           # Build output (generated)
└── Dockerfile          # Multi-stage Docker build file
```

## Development Setup

### Environment Configuration

For local development, you need to create `.env.local` files in `/packages/gen-ai` and in repo root. For both files there's an accompanying `.env.local.example` reference which you can copy from. For example:

1. Copy the example file:

   ```bash
   cp .env.local.example .env.local
   ```

2. You can then update values in the `.env.local` according to your local setup needs.

Note that `.env.local` is gitignored and should never be committed. Use `.env.local.example` as a reference for required variables.

### Frontend

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm ci

# Start development server
npm run start:dev
```

### Backend (BFF)

The Go backend includes a Makefile with several useful targets to simplify development.

> **Note:** For the easiest development experience, simply use `make run` in the BFF directory. This single command handles formatting, static analysis, dependency management, and starts the server.

```bash
# Navigate to the BFF directory
cd bff

# Display available Makefile targets and their descriptions
make help

# Run the BFF (this will also format code, run static analysis, and download dependencies)
make run

# Build the BFF binary
make build

# Run tests
make test

# Format code
make fmt

# Run linting checks
make lint

# Run linting checks and fix issues where possible
make lint-fix

# Clean up build artifacts
make clean
```

You can also pass custom parameters to the Makefile targets:

```bash
# Run the BFF on a custom port
make run PORT=9000

# Run with custom log level
make run LOG_LEVEL=info

# Run with custom static assets directory
make run STATIC_ASSETS_DIR=../frontend/dist

# Run with custom CORS allowed origins
make run ALLOWED_ORIGINS="http://localhost:3000,http://localhost:8080"
```

## Running the BFF with mock clients

In order for easy development it is possible to run the BFF in such a way that it will return mock data from endpoints that call out to external services in production.

```bash
# Run the BFF with mock llama stack client
make run MOCK_LS_CLIENT=true

# Run the BFF with mock MaaS client
make run MOCK_MAAS_CLIENT=true

# Run the BFF with all mock clients for full offline development
make dev-bff-mock
```

## Running Frontend and BFF Together

For convenience, you can start both the frontend and BFF simultaneously using these Makefile targets from the root of the gen-ai package:

```bash
# Start frontend, bff, and port-forwarding
make dev-start

# Start frontend and bff without port-forwarding
make dev-start-no-portforward
```

These commands will run both services in parallel, making it easier to start your development environment with a single command.

## Debugging the bff

If you want to be able to set breakpoints in vscode, you must first ensure the following debug config is added to your .vscode/launch.json file.

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Attach to Delve (make dev-start-debug)",
      "type": "go",
      "request": "attach",
      "mode": "remote",
      "remotePath": "${workspaceFolder}/packages/gen-ai/bff",
      "port": 2345,
      "host": "localhost",
      "showLog": true,
      "trace": "verbose"
    },
  ]
}
```

The debug approach will use the 'debug' command defined in packages/gen-ai/bff/Makefile, which uses 'dlv' (short for Delve, a debugger for the Go programming language, more at [github repo](https://github.com/go-delve/delve/tree/master)), which will need to be installed locally first.

You can install the latest version with:

```bash
  go install github.com/go-delve/delve/cmd/dlv@latest
```

Check if dlv is installed:

```bash
dlv
```

If this returns: "dlv: command not found" the go binary directory might not be included in your path.

Try running

```bash
export PATH=$PATH:$(go env GOPATH)/bin
```

and then

```bash
dlv
```

again to confirm.

To make this persistent you will have to add it to your .bash_profile or .bashrc or .zshrc:

```bash
echo 'export PATH=$PATH:$(go env GOPATH)/bin' >> ~/.bash_profile
```

or

```bash
echo 'export PATH=$PATH:$(go env GOPATH)/bin' >> ~/.bashrc
```

or

```bash
echo 'export PATH=$PATH:$(go env GOPATH)/bin' >> ~/.zshrc
```


Then run the below, which will start the gen-ai frontend, bff with debugger, and port-forwarding (VSCode can attach on port 2345).

```bash
cd packages/gen-ai
make dev-start-debug
```

Once everything is running and ready, you can click on the 'Run and Debug' tab in left navbar, and in the top dropdown, select and run 'Attach to Delve (make dev-start-debug)'. Now you should be able to set breakpoints in order to debug code inside packages/gen-ai/bff.

## Building and Running with Docker

The project includes a multi-stage Dockerfile that builds both the frontend and backend components and creates a minimal production image.

### Building the Docker Image

```bash
# Build the Docker image
docker build -t gen-ai .
```

### Running the Docker Container

```bash
# Run the container
docker run -p 8080:8080 gen-ai
```

The application will be available at http://localhost:8080

### Docker Build Arguments

The Dockerfile supports the following build arguments:

- `UI_SOURCE_CODE`: Path to the frontend source code (default: `./frontend`)
- `BFF_SOURCE_CODE`: Path to the BFF source code (default: `./bff`)
- `NODE_BASE_IMAGE`: Base image for Node.js build (default: `node:20`)
- `GOLANG_BASE_IMAGE`: Base image for Go build (default: `golang:1.24.3`)
- `DISTROLESS_BASE_IMAGE`: Base image for the final stage (default: `gcr.io/distroless/static:nonroot`)
- `TARGETOS`: Target OS for Go build
- `TARGETARCH`: Target architecture for Go build

Example with custom build arguments:

```bash
docker build \
  --build-arg NODE_BASE_IMAGE=node:20-alpine \
  --build-arg GOLANG_BASE_IMAGE=golang:1.24.3-alpine \
  -t gen-ai:custom .
```

## Configuration

The BFF supports the following configuration options:

- `PORT`: HTTP server port (default: 8080)
- `STATIC_ASSETS_DIR`: Directory for static assets (default: "./static")
- `LOG_LEVEL`: Logging level (default: "DEBUG")
- `ALLOWED_ORIGINS`: CORS allowed origins (default: none)
- `LLAMA_STACK_URL`: **Base URL for the Llama Stack API.** All requests to `/api/llama-stack/*` will be proxied to this URL. Example: `http://llama-stack-service:8080`
- `MAAS_URL`: **Base URL for the MaaS (Model as a Service) API.** Used for MaaS model and token management. Example: `http://maas-service:8080`

These can be set as environment variables when running the container:

```bash
docker run -p 8080:8080 \
  -e PORT=9000 \
  -e LOG_LEVEL=INFO \
  -e ALLOWED_ORIGINS="*" \
  -e LLAMA_STACK_URL=http://llama-stack-service:8080 \
  -e MAAS_URL=http://maas-service:8080 \
  gen-ai
```

### Running the Standalone GenAI Playground on OpenShift

A complimentary script is provided to build and run GenAI Studio as standalone application
in OpenShift by using the build and deploy capacities of OpenShift through the `oc new-app` command.

Prerequisites:

- Logged into OpenShift (`oc login`) and a target project selected (`oc project <name>`)
- Current git branch tracks a remote and the remote fetch URL uses HTTPS
- A browser extension that allows "Autorization: Bearer <oc whoami -t >" token

Run from the repository root:

```bash
./packages/gen-ai/build.openshift.sh
```

What the script does (high level):

- Detects repo URL and current branch; validates HTTPS fetch URL
- Creates a Docker BuildConfig via `oc new-app` (scoped to `packages/gen-ai`)
- Patches the BuildConfig to use `packages/gen-ai/Dockerfile`
- Cancels the auto-triggered first build and starts a new one
- Waits for the Service and creates an edge Route on port 8080
- Prints the public Route URL when ready

Cleanup (optional): use your usual `oc delete` flow, or run the companion cleanup script if available:

```bash
./packages/gen-ai/clean.openshift.sh
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
