# Quickstart Guide: Eval Hub UI Development

**Feature**: Eval Hub UI - Model Evaluation Orchestration
**Date**: 2026-02-12
**Audience**: Developers setting up local development environment

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Running Locally](#running-locally)
4. [Running Tests](#running-tests)
5. [Building and Deploying](#building-and-deploying)
6. [Development Workflow](#development-workflow)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Tools

- **Node.js**: v20 or later ([download](https://nodejs.org/))
- **Go**: v1.24 or later ([download](https://golang.org/))
- **Docker**: Latest version ([download](https://www.docker.com/))
- **Git**: Latest version
- **Make**: Build automation tool (usually pre-installed on Linux/macOS)

### Verify Installations

```bash
node --version  # Should be v20 or higher
go version      # Should be go1.24 or higher
docker --version
git --version
make --version
```

### Access Requirements

- Access to ODH Dashboard repository
- Kubernetes/OpenShift cluster (for integration testing)
- Access to KServe model registry (for model integration)
- Backend evaluation service endpoint (can be mocked for local development)

---

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/opendatahub-io/odh-dashboard.git
cd odh-dashboard
```

### 2. Checkout Feature Branch

```bash
git checkout 001-eval-hub-ui
```

### 3. Install Root Dependencies

```bash
npm install
```

### 4. Setup Environment Variables

#### Root-Level Configuration

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` to match your local setup.

#### Package-Level Configuration

```bash
cd packages/lm-eval
cp .env.local.example .env.local
```

Edit `packages/lm-eval/.env.local`:

```bash
# Backend evaluation service
EVAL_BACKEND_URL=http://localhost:8090  # Or mock URL for development
EVAL_BACKEND_TIMEOUT=30000

# Model registry (KServe)
MODEL_REGISTRY_ENABLED=true
# Set to false to use mocked model data during development

# Caching
CACHE_TTL_RESULTS=900        # 15 minutes (in seconds)
CACHE_TTL_STATUS=300         # 5 minutes
CACHE_MAX_ITEMS=100

# Polling configuration
POLLING_INTERVAL=5000        # 5 seconds (in milliseconds)

# Feature flags
ENABLE_TEMPLATES=true
ENABLE_COMPARISON=true
ENABLE_EXPORT=true

# Development mode
DEV_MODE=true
MOCK_BACKEND=true            # Use mocked backend for local development
```

### 5. Install Package Dependencies

#### Frontend

```bash
cd packages/lm-eval/frontend
npm ci
```

#### Backend (BFF)

```bash
cd packages/lm-eval/bff
make deps  # Downloads Go dependencies
```

---

## Running Locally

There are several ways to run the application locally depending on your development needs.

### Option 1: Integrated with ODH Dashboard (Recommended)

Run the entire ODH Dashboard with the lm-eval package:

```bash
# From repository root
npm run start:dev
```

The lm-eval package will be available at: `http://localhost:4010/lm-eval`

### Option 2: Standalone Development

Run the lm-eval package independently:

#### Terminal 1: Start BFF

```bash
cd packages/lm-eval/bff
make run
```

BFF will start on `http://localhost:9105`

#### Terminal 2: Start Frontend

```bash
cd packages/lm-eval/frontend
npm run start:dev
```

Frontend will start on `http://localhost:9105` (with webpack dev server)

### Option 3: With Mocked Backend

For frontend-only development without needing the actual backend evaluation service:

```bash
cd packages/lm-eval/bff
make run-mock  # Starts BFF with mocked backend responses
```

Then in another terminal:

```bash
cd packages/lm-eval/frontend
npm run start:dev
```

### Accessing the Application

- **Integrated**: http://localhost:4010/lm-eval
- **Standalone Frontend**: http://localhost:9105
- **Standalone BFF API**: http://localhost:9105/api

---

## Running Tests

### Frontend Tests

#### Unit Tests (Jest)

```bash
cd packages/lm-eval/frontend

# Run all unit tests
npm run test:jest

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

#### E2E Tests (Cypress)

```bash
cd packages/lm-eval

# Open Cypress test runner (interactive)
npm run cypress:open:mock

# Run Cypress tests (headless)
npm run cypress:run:mock

# Run E2E tests with live backend
npm run cypress:run:e2e
```

#### Type Checking

```bash
cd packages/lm-eval/frontend
npm run test:type-check
```

#### Linting

```bash
cd packages/lm-eval/frontend

# Check for linting errors
npm run test:lint

# Auto-fix linting errors
npm run test:fix
```

### Backend Tests (BFF)

#### Unit Tests (Ginkgo)

```bash
cd packages/lm-eval/bff

# Run all unit tests
make test

# Run tests with coverage
make test-coverage

# Run tests in watch mode
ginkgo watch -r ./internal
```

#### Integration Tests

```bash
cd packages/lm-eval/bff

# Run integration tests (requires backend service or mock)
make test-integration
```

#### Contract Tests

```bash
cd packages/lm-eval

# Run BFF consumer contract tests
npm run test:contract
```

### Run All Tests

From the package root:

```bash
cd packages/lm-eval
make test-all
```

---

## Building and Deploying

### Local Build

#### Build Frontend

```bash
cd packages/lm-eval/frontend
npm run build
```

Output will be in `frontend/dist/`

#### Build BFF

```bash
cd packages/lm-eval/bff
make build
```

Binary will be in `bff/bin/`

### Docker Build

Build the multi-stage Docker image:

```bash
cd packages/lm-eval
docker build -t lm-eval:latest .
```

The Dockerfile performs a multi-stage build:
1. Builds the frontend (static assets)
2. Builds the Go BFF binary
3. Creates a minimal runtime image with BFF serving frontend assets

### Run Docker Image Locally

```bash
docker run -p 9105:8080 \
  -e EVAL_BACKEND_URL=http://localhost:8090 \
  -e MOCK_BACKEND=true \
  lm-eval:latest
```

### Deploy to Kubernetes/OpenShift

#### Using Manifests

```bash
# Apply Kubernetes manifests
kubectl apply -f manifests/lm-eval/

# Or for OpenShift
oc apply -f manifests/lm-eval/
```

#### Using Makefile

```bash
cd packages/lm-eval
make deploy NAMESPACE=your-namespace
```

#### Verify Deployment

```bash
kubectl get pods -n your-namespace
kubectl logs -f deployment/lm-eval -n your-namespace
```

---

## Development Workflow

### Typical Development Cycle

1. **Start Services**
   ```bash
   # Terminal 1: BFF with mock backend
   cd packages/lm-eval/bff && make run-mock

   # Terminal 2: Frontend dev server
   cd packages/lm-eval/frontend && npm run start:dev
   ```

2. **Make Code Changes**
   - Frontend changes hot-reload automatically
   - BFF changes require restart (Ctrl+C and `make run` again)

3. **Run Tests**
   ```bash
   # Frontend unit tests
   cd frontend && npm run test:jest

   # BFF tests
   cd bff && make test
   ```

4. **Lint and Format**
   ```bash
   # Frontend
   cd frontend && npm run test:fix && npm run format

   # BFF
   cd bff && make lint-fix && make fmt
   ```

5. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add evaluation comparison view"
   git push origin 001-eval-hub-ui
   ```

### Code Generation

When updating API contracts:

1. Update `specs/001-eval-hub-ui/contracts/api-spec.yaml`
2. Update `specs/001-eval-hub-ui/contracts/types.ts`
3. Regenerate BFF handler stubs (if using code generation):
   ```bash
   cd packages/lm-eval/bff
   make generate
   ```

### Adding New Dependencies

#### Frontend

```bash
cd packages/lm-eval/frontend
npm install package-name
npm install --save-dev package-name  # for dev dependencies
```

#### BFF

```bash
cd packages/lm-eval/bff
go get github.com/user/package
go mod tidy
```

---

## Troubleshooting

### Frontend Issues

#### Issue: Port Already in Use

**Symptom**: `Error: listen EADDRINUSE: address already in use :::9105`

**Solution**:
```bash
# Find and kill the process using port 9105
lsof -i :9105
kill -9 <PID>

# Or use a different port
PORT=9106 npm run start:dev
```

#### Issue: Module Federation Errors

**Symptom**: `Uncaught Error: Shared module is not available for eager consumption`

**Solution**:
1. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
2. Ensure all shared dependencies match versions in root `package.json`

#### Issue: TypeScript Compilation Errors

**Symptom**: Type errors during build

**Solution**:
```bash
# Clean TypeScript cache
rm -rf frontend/dist frontend/.cache

# Rebuild
npm run build
```

### Backend Issues

#### Issue: Go Module Errors

**Symptom**: `cannot find module providing package`

**Solution**:
```bash
cd packages/lm-eval/bff
go mod tidy
go mod download
```

#### Issue: Backend Service Connection Failed

**Symptom**: `Error: connect ECONNREFUSED`

**Solution**:
1. Check if using mock mode in `.env.local`:
   ```bash
   MOCK_BACKEND=true
   ```
2. Verify backend service URL is correct
3. Check network connectivity to backend service

#### Issue: CORS Errors

**Symptom**: `Access to fetch at 'http://localhost:9105/api' has been blocked by CORS policy`

**Solution**:
1. Ensure BFF CORS middleware is configured correctly
2. Check that frontend is making requests to the correct origin
3. Verify proxy configuration in webpack dev server

### Docker Issues

#### Issue: Docker Build Fails

**Symptom**: `Error: Cannot find module` during frontend build stage

**Solution**:
```bash
# Clean Docker build cache
docker builder prune

# Rebuild with no cache
docker build --no-cache -t lm-eval:latest .
```

#### Issue: Container Immediately Exits

**Symptom**: Container starts then immediately stops

**Solution**:
```bash
# Check container logs
docker logs <container-id>

# Run with interactive mode to debug
docker run -it lm-eval:latest /bin/sh
```

### Test Issues

#### Issue: Cypress Tests Fail

**Symptom**: `Timed out waiting for the browser to connect`

**Solution**:
```bash
# Clear Cypress cache
npx cypress cache clear

# Reinstall Cypress
npm install cypress --save-dev
```

#### Issue: Ginkgo Tests Not Found

**Symptom**: `No test files found`

**Solution**:
```bash
# Install Ginkgo CLI
go install github.com/onsi/ginkgo/v2/ginkgo@latest

# Ensure tests are properly structured
cd packages/lm-eval/bff
find . -name "*_test.go"
```

### Common Gotchas

1. **Environment Variables Not Loaded**: Ensure `.env.local` exists and is in the correct directory (not `.env.local.example`)

2. **Wrong Node/Go Version**: Use `nvm` (Node Version Manager) or `gvm` (Go Version Manager) to switch versions

3. **Cache Issues**: When in doubt, clear caches:
   ```bash
   # Frontend
   rm -rf node_modules/.cache

   # Go
   go clean -cache
   ```

4. **Port Conflicts**: Check if ports 9105, 4010, 8080 are available before starting services

---

## Getting Help

- **Documentation**: See `/packages/lm-eval/docs/` for additional guides
- **ODH Dashboard Docs**: [CONTRIBUTING.md](/CONTRIBUTING.md)
- **Spec Files**: `/specs/001-eval-hub-ui/` for design documents
- **Issues**: Report bugs via GitHub Issues with `lm-eval` label

## Next Steps

- Review the [Architecture Documentation](../docs/architecture.md)
- Check the [API Documentation](../docs/api.md)
- Read the [Deployment Guide](../docs/deployment.md)
- Explore the [Data Model](./data-model.md)
- See [Task Breakdown](./tasks.md) for implementation plan
