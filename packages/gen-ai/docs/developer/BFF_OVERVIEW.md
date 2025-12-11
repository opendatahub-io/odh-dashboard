# Gen AI BFF Overview

## 1. HIGH LEVEL OVERVIEW

### What is the Gen AI BFF?

**BFF = Backend for Frontend**

The Gen AI BFF is a Go-based middleware service that sits between our React frontend and external AI services, providing:

- **API Orchestration**: Simplifies complex multi-service interactions
- **Authentication & Authorization**: Handles OAuth/OIDC token validation and RBAC
- **Static Asset Serving**: Serves the React application build artifacts
- **Service Integration**: Connects to Llama Stack, MaaS, Kubernetes, and MCP servers
- **Business Logic**: Implements domain-specific operations and data transformations

**Why a BFF Pattern?**
- ✅ Centralized security and authentication
- ✅ Cleaner API contracts tailored for the frontend
- ✅ Reduced frontend complexity (no direct multi-service orchestration)
- ✅ Better testability with comprehensive mocking
- ✅ Independent deployment and scaling

---

### System Architecture (C4 Context)

```
┌─────────────────────────────────────────────────────────────┐
│                      Gen AI System                          │
│                                                             │
│  ┌──────────────┐         ┌──────────────────────────┐    │
│  │   Frontend   │ ◄─────► │      BFF (Go 1.23)       │    │
│  │  (React 18)  │  JSON/  │  • API Endpoints         │    │
│  │              │  HTTPS  │  • Auth Middleware       │    │
│  └──────────────┘         │  • Static Serving        │    │
│                            └──────────┬───────────────┘    │
└───────────────────────────────────────┼────────────────────┘
                                        │
                ┌───────────────────────┼───────────────────┐
                │                       │                   │
        ┌───────▼─────┐        ┌───────▼─────┐    ┌───────▼─────┐
        │ Llama Stack │        │    MaaS     │    │  Kubernetes │
        │   (LLMs)    │        │  (Models)   │    │  (CRDs)     │
        └─────────────┘        └─────────────┘    └─────────────┘
```

**Key Integration Points:**
1. **Llama Stack** - LLM orchestration, RAG, vector stores, model inference
2. **MaaS (Model as a Service)** - Hosted model inference, token management
3. **Kubernetes** - CRD management (LlamaStackDistribution resources)
4. **MCP (Model Context Protocol)** - External tool integration

---

### Technology Stack

**Core Technologies:**
```go
// Go 1.23.5+ (Backend)
├── julienschmidt/httprouter      // High-performance HTTP routing
├── openai/openai-go (v2.1.0)     // Official OpenAI SDK for Llama Stack
├── kubernetes client-go          // K8s API integration
└── slog                          // Structured logging (Go standard library)
```

**Key Dependencies:**
- **OpenAI Go SDK**: We use the official SDK to communicate with Llama Stack's OpenAI-compatible API
- **Controller-runtime**: For Kubernetes CRD operations
- **Envtest**: For testing with a real Kubernetes API server

**Build & Development Tools:**
- **Go toolchain**: fmt, vet, test
- **golangci-lint**: Static analysis and linting
- **Delve**: Debugging support
- **Makefile**: Simplified development commands

---

### Key Design Patterns

#### 1. **Factory Pattern** (Client Creation)
```go
// LlamaStackClientFactory creates real or mock clients
type LlamaStackClientFactory interface {
    CreateClient(url string) (LlamaStackClientInterface, error)
}

// RealClientFactory - Production
// MockClientFactory - Development/Testing
```

**Why?** Enables easy switching between real and mock implementations for development and testing.

---

#### 2. **Repository Pattern** (Business Logic Layer)
```go
// Domain-specific repositories encapsulate business logic
type ModelsRepository struct {
    client LlamaStackClientInterface
}

type VectorStoresRepository struct {
    client LlamaStackClientInterface
}
```

**Structure:**
```
Handler → Repository → Client → External Service
(HTTP)    (Logic)      (API)     (LlamaStack/MaaS/K8s)
```

**Why?** Separates HTTP handling from business logic, improving testability and maintainability.

---

#### 3. **Interface-Based Design** (Abstraction)
```go
// All clients implement this interface
type LlamaStackClientInterface interface {
    ListModels(ctx context.Context) ([]Model, error)
    CreateVectorStore(ctx context.Context, req VectorStoreRequest) (*VectorStore, error)
    // ... more methods
}
```

**Why?** Enables:
- Easy mocking in tests
- Swapping implementations without changing consumers
- Clear contracts between layers

---

#### 4. **Middleware Chain Pattern**
```go
// Request flow through middleware chain
router → authMiddleware → corsMiddleware → loggingMiddleware → handler
```

**Middleware Stack:**
1. **CORS**: Cross-origin request handling
2. **Authentication**: Token validation (OAuth/Bearer)
3. **Logging**: Request/response logging with slog
4. **Recovery**: Panic recovery and error handling
5. **Telemetry**: Metrics and tracing (future)

---

### Project Structure (Internal Architecture)

```
bff/
├── cmd/
│   └── main.go                    # Application entry point, server setup
├── internal/
│   ├── api/                       # HTTP handlers and routing
│   │   ├── app.go                 # Application initialization, middleware
│   │   ├── *_handler.go           # HTTP endpoint handlers
│   │   └── middleware.go          # Auth, CORS, logging middleware
│   ├── repositories/              # Business logic layer
│   │   ├── lsd_models.go          # Llama Stack model operations
│   │   ├── lsd_vectorstores.go    # Vector store operations
│   │   └── maas_models.go         # MaaS operations
│   ├── integrations/              # External service clients
│   │   ├── llamastack/            # Llama Stack client
│   │   ├── maas/                  # MaaS client
│   │   ├── kubernetes/            # K8s client
│   │   └── mcp/                   # MCP client
│   ├── models/                    # Data structures (DTOs)
│   ├── config/                    # Configuration management
│   ├── constants/                 # Application constants
│   └── helpers/                   # Utility functions
├── openapi/
│   └── src/gen-ai.yaml            # OpenAPI 3.0 specification
└── static/                        # Frontend build artifacts (served by BFF)
```

**Key Points:**
- **Clean architecture**: Clear separation of concerns
- **No circular dependencies**: Layered structure (handlers → repos → clients)
- **Testable**: Each layer can be tested independently
- **Well-documented**: Comprehensive OpenAPI spec

---

## 2. CONTRIBUTING CODE

### Getting Started with Go (For Non-Go Developers)

**Go is Simple by Design:**
- Strong typing with excellent tooling
- Garbage collected (no manual memory management)
- Built-in testing framework
- Fast compilation
- Easy to read and learn

**Key Go Concepts:**
```go
// 1. Interfaces (similar to TypeScript interfaces)
type Reader interface {
    Read(p []byte) (n int, err error)
}

// 2. Structs (like classes without inheritance)
type User struct {
    Name  string
    Email string
}

// 3. Methods (functions attached to types)
func (u *User) SendEmail() error {
    // implementation
}

// 4. Error Handling (explicit, no exceptions)
result, err := doSomething()
if err != nil {
    return err
}

// 5. Goroutines (lightweight concurrency)
go doSomethingAsync()
```

**Don't worry!** The codebase has clear examples and consistent patterns.

---

### Coding Standards

#### 1. **Code Formatting**
```bash
# ALWAYS format before committing
make fmt

# This runs: go fmt ./...
```

**Result:** Consistent code style across the entire codebase (no debates!)

---

#### 2. **Static Analysis**
```bash
# Check for issues
make lint

# Auto-fix when possible
make lint-fix
```

**Catches:**
- Unused variables/imports
- Potential bugs
- Performance issues
- Style violations

---

#### 3. **Naming Conventions**

**Files:**
```
lsd_models_handler.go       # Llama Stack Distribution models handler
maas_tokens_handler.go      # MaaS tokens handler
mcp_status_handler_test.go  # Test file (always ends with _test.go)
```

**Functions/Methods:**
```go
// Exported (public) - starts with uppercase
func ListModels(ctx context.Context) ([]Model, error)

// Unexported (private) - starts with lowercase
func transformModelResponse(raw RawModel) Model
```

**Constants:**
```go
const (
    APIVersion = "v1"
    DefaultTimeout = 30 * time.Second
)
```

---

#### 4. **Error Handling**
```go
// ✅ GOOD: Always handle errors
result, err := someOperation()
if err != nil {
    logger.Error("operation failed", "error", err)
    return nil, fmt.Errorf("failed to do operation: %w", err)
}

// ❌ BAD: Never ignore errors
result, _ := someOperation()  // Don't do this!
```

**Error Wrapping:**
```go
// Wrap errors to add context
return fmt.Errorf("failed to create vector store: %w", err)

// This allows checking the original error type
if errors.Is(err, ErrNotFound) {
    // handle not found
}
```

---

#### 5. **Logging**
```go
// Use structured logging with slog
logger.Info("processing request",
    "method", r.Method,
    "path", r.URL.Path,
    "user", userID)

logger.Error("failed to process",
    "error", err,
    "context", additionalInfo)

// Log levels: Debug, Info, Warn, Error
```

---

#### 6. **Testing Conventions**

**Test File Structure:**
```go
package api_test  // Note: _test package

import (
    "testing"
    "github.com/opendatahub-io/gen-ai/internal/api"
)

func TestListModels(t *testing.T) {
    // Arrange
    mockClient := setupMockClient()
    repo := NewModelsRepository(mockClient)
    
    // Act
    result, err := repo.ListModels(context.Background())
    
    // Assert
    if err != nil {
        t.Fatalf("expected no error, got %v", err)
    }
    if len(result) == 0 {
        t.Error("expected models, got empty list")
    }
}
```

**Table-Driven Tests:**
```go
func TestValidateRequest(t *testing.T) {
    tests := []struct {
        name    string
        input   Request
        wantErr bool
    }{
        {"valid request", Request{Name: "test"}, false},
        {"empty name", Request{Name: ""}, true},
        {"too long name", Request{Name: strings.Repeat("a", 300)}, true},
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := ValidateRequest(tt.input)
            if (err != nil) != tt.wantErr {
                t.Errorf("ValidateRequest() error = %v, wantErr %v", err, tt.wantErr)
            }
        })
    }
}
```

---

### Development Workflow

#### 1. **Creating a New Endpoint**

**Step 1: Define the model (DTO)**
```go
// internal/models/my_feature.go
package models

type MyFeatureRequest struct {
    Name        string `json:"name"`
    Description string `json:"description,omitempty"`
}

type MyFeatureResponse struct {
    ID      string `json:"id"`
    Status  string `json:"status"`
    Created int64  `json:"created"`
}
```

---

**Step 2: Create the repository (business logic)**
```go
// internal/repositories/my_feature.go
package repositories

type MyFeatureRepository struct {
    client integrations.ClientInterface
}

func NewMyFeatureRepository(client integrations.ClientInterface) *MyFeatureRepository {
    return &MyFeatureRepository{client: client}
}

func (r *MyFeatureRepository) CreateFeature(ctx context.Context, req models.MyFeatureRequest) (*models.MyFeatureResponse, error) {
    // Business logic here
    result, err := r.client.CreateFeature(ctx, req)
    if err != nil {
        return nil, fmt.Errorf("failed to create feature: %w", err)
    }
    
    // Transform response if needed
    return transformFeatureResponse(result), nil
}
```

---

**Step 3: Create the handler (HTTP layer)**
```go
// internal/api/my_feature_handler.go
package api

func (app *App) handleCreateFeature(w http.ResponseWriter, r *http.Request) {
    var req models.MyFeatureRequest
    
    // Parse request
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        WriteJSONError(w, http.StatusBadRequest, "invalid request body", err)
        return
    }
    
    // Call repository
    result, err := app.repos.MyFeature.CreateFeature(r.Context(), req)
    if err != nil {
        app.logger.Error("failed to create feature", "error", err)
        WriteJSONError(w, http.StatusInternalServerError, "failed to create feature", err)
        return
    }
    
    // Return response
    WriteJSON(w, http.StatusCreated, result)
}
```

---

**Step 4: Register the route**
```go
// internal/api/app.go
func (app *App) Routes() http.Handler {
    router := httprouter.New()
    
    // ... existing routes
    
    // New route
    router.POST("/gen-ai/api/v1/my-feature", app.handleCreateFeature)
    
    return router
}
```

---

**Step 5: Write tests**
```go
// internal/api/my_feature_handler_test.go
package api_test

func TestCreateFeature(t *testing.T) {
    // Setup mock environment
    app := setupTestApp()
    
    // Create request
    reqBody := `{"name":"test","description":"test feature"}`
    req := httptest.NewRequest("POST", "/gen-ai/api/v1/my-feature", strings.NewReader(reqBody))
    req.Header.Set("Content-Type", "application/json")
    
    // Execute request
    w := httptest.NewRecorder()
    app.Routes().ServeHTTP(w, req)
    
    // Assert response
    if w.Code != http.StatusCreated {
        t.Errorf("expected status 201, got %d", w.Code)
    }
    
    // Parse and validate response
    var resp models.MyFeatureResponse
    json.NewDecoder(w.Body).Decode(&resp)
    if resp.ID == "" {
        t.Error("expected non-empty ID")
    }
}
```

---

**Step 6: Update OpenAPI spec**
```yaml
# openapi/src/gen-ai.yaml
paths:
  /gen-ai/api/v1/my-feature:
    post:
      summary: Create a new feature
      tags:
        - My Feature
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/MyFeatureRequest'
      responses:
        '201':
          description: Feature created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MyFeatureResponse'
```

---

#### 2. **Code Review Checklist**

Before submitting a PR:
- [ ] Code is formatted (`make fmt`)
- [ ] Linter passes (`make lint`)
- [ ] Tests pass (`make test`)
- [ ] New code has tests (aim for >80% coverage)
- [ ] Error handling is comprehensive
- [ ] Logging is appropriate (not too verbose, not too sparse)
- [ ] OpenAPI spec is updated
- [ ] No sensitive data in logs
- [ ] Constants are used for magic values
- [ ] Comments explain "why", not "what"

---

## 3. RUNNING AND TESTING

### Local Development Setup

#### Prerequisites
```bash
# 1. Install Go 1.23.5+
brew install go

# 2. Install development tools (optional but recommended)
brew install delve  # For debugging

# 3. Verify installation
go version  # Should show go1.23.5 or higher
```

---

### Running the BFF Locally

#### Option 1: Quick Start (Most Common)
```bash
cd packages/gen-ai/bff

# Run with all mock clients (no external dependencies needed!)
make dev-bff-mock

# This is equivalent to:
# make run MOCK_LS_CLIENT=true MOCK_MAAS_CLIENT=true \
#           MOCK_K8S_CLIENT=true MOCK_MCP_CLIENT=true
```

**What this does:**
- Formats code
- Runs linter
- Downloads envtest binaries (for K8s testing)
- Starts BFF on port 8080
- Uses mock clients (no external services needed)

**When to use:** Daily development, testing new features, debugging without real services

---

#### Option 2: With Real Services
```bash
cd packages/gen-ai/bff

# Start port-forwarding to real services (in another terminal)
kubectl port-forward -n llama-stack svc/llama-stack 8321:8080
kubectl port-forward -n maas svc/maas 8322:8080

# Run BFF connected to real services
make run \
  LLAMA_STACK_URL=http://localhost:8321 \
  MAAS_URL=http://localhost:8322 \
  MOCK_LS_CLIENT=false \
  MOCK_MAAS_CLIENT=false \
  MOCK_K8S_CLIENT=false
```

**When to use:** Integration testing, testing against real AI models, debugging production issues

---

#### Option 3: Full Stack (Frontend + BFF)
```bash
# From gen-ai root directory
cd packages/gen-ai

# Start everything at once
make dev-start

# This starts:
# - Frontend dev server (port 8080)
# - BFF server (port 8043)
# - Port forwarding to K8s services
```

**When to use:** Full feature development, UI integration testing

---

### Configuration Options

**All environment variables / flags:**
```bash
# Server Configuration
PORT=8080                          # BFF server port
STATIC_ASSETS_DIR=./static         # Frontend build directory
LOG_LEVEL=debug                    # debug, info, warn, error
PATH_PREFIX=/gen-ai                # URL path prefix

# External Services
LLAMA_STACK_URL=http://...         # Llama Stack API base URL
MAAS_URL=http://...                # MaaS API base URL

# Mock Configuration
MOCK_LS_CLIENT=true                # Use mock Llama Stack client
MOCK_MAAS_CLIENT=true              # Use mock MaaS client
MOCK_K8S_CLIENT=true               # Use mock Kubernetes client
MOCK_MCP_CLIENT=true               # Use mock MCP client

# Authentication
AUTH_METHOD=user_token             # disabled | user_token
AUTH_TOKEN_HEADER=Authorization    # Header name for token
AUTH_TOKEN_PREFIX="Bearer "        # Token prefix

# CORS
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:8080"

# Model Filtering
FILTERED_MODEL_KEYWORDS="granite,llama"  # Only show models matching these keywords

# TLS Configuration
BUNDLE_PATHS="/path/to/ca.crt"     # CA bundle paths (comma-separated)
INSECURE_SKIP_VERIFY=false         # Skip TLS verification (dev only!)
```

---

### Testing Strategy

#### 1. **Unit Tests** (Recommended: >80% coverage)
```bash
# Run all tests
make test

# Run tests for specific package
go test ./internal/repositories/...

# Run tests with coverage
go test -cover ./...

# Generate coverage report
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

**What we test:**
- Repository business logic
- Request validation
- Response transformations
- Error handling
- Mock client behavior

---

#### 2. **Integration Tests** 
** Working in progress **

---

#### 3. **Mock Testing**

**Why Mock?**
- Fast (no network calls)
- Reliable (no external dependencies)
- Comprehensive (test edge cases)
- Offline development

**Mock Tokens:**
```bash
# Use this token with mock clients
export TOKEN="FAKE_BEARER_TOKEN"

# Test mock endpoints
curl -H "Authorization: Bearer FAKE_BEARER_TOKEN" \
     http://localhost:8080/gen-ai/api/v1/models
```

**Mock Data Locations:**
- `internal/integrations/llamastack/lsmocks/` - Llama Stack mocks
- `internal/integrations/maas/maasmocks/` - MaaS mocks
- `internal/integrations/kubernetes/k8smocks/` - K8s mocks
- `internal/integrations/mcp/mcpmocks/` - MCP mocks

---

#### 4. **Manual API Testing**

**Using curl:**
```bash
# Get models
curl -i -H "Authorization: Bearer $TOKEN" \
     http://localhost:8080/gen-ai/api/v1/models

# Create vector store
curl -i -X POST \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name":"test-store"}' \
     http://localhost:8080/gen-ai/api/v1/vectorstores

# Upload file
curl -i -X POST \
     -H "Authorization: Bearer $TOKEN" \
     -F "file=@test.pdf" \
     -F "vector_store_id=vs_123" \
     http://localhost:8080/gen-ai/api/v1/files/upload
```

**Using Swagger UI:**
```bash
# Start BFF
make run

# Open browser to:
http://localhost:8080/gen-ai/swagger-ui/

# Interactive API documentation with "Try it out" buttons!
```

---

### Debugging

#### 1. **Basic Logging**
```bash
# Run with debug logging
make run LOG_LEVEL=debug

# Watch logs with grep
make run LOG_LEVEL=debug 2>&1 | grep -i error
```

---

#### 2. **VSCode Debugging** (Recommended!)

**Step 1: Add debug configuration**
```json
// .vscode/launch.json
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
    }
  ]
}
```

**Step 2: Install Delve**
```bash
go install github.com/go-delve/delve/cmd/dlv@latest
```

**Step 3: Start debug session**
```bash
cd packages/gen-ai
make dev-start-debug
```

**Step 4: Attach debugger**
- Open VSCode
- Go to "Run and Debug" (Cmd+Shift+D)
- Select "Attach to Delve"
- Press F5

**Now you can:**
- Set breakpoints
- Step through code
- Inspect variables
- Evaluate expressions

---

## 📚 Additional Resources

### Essential Reading
1. **Architecture Decision Records** (`docs/adr/`)
   - ADR-0002: System Architecture
   - ADR-0003: Core User Flows

2. **README Files**
   - Main: `packages/gen-ai/README.md`
   - BFF: `packages/gen-ai/bff/README.md`

3. **OpenAPI Documentation**
   - Spec: `packages/gen-ai/bff/openapi/src/gen-ai.yaml`
   - Live UI: http://localhost:8080/gen-ai/swagger-ui/

### Go Learning Resources
- [Go Tour](https://go.dev/tour/) - Interactive tutorial
- [Effective Go](https://go.dev/doc/effective_go) - Best practices
- [Go by Example](https://gobyexample.com/) - Practical examples

### Project-Specific
- Llama Stack: https://llama-stack.readthedocs.io/
- OpenAI API: https://platform.openai.com/docs/api-reference
- Kubernetes Client-Go: https://github.com/kubernetes/client-go
- Controller Runtime: https://book.kubebuilder.io/

---

**Key Takeaways:**
1. BFF is the bridge between frontend and AI services
2. Mock clients make development easy and fast
3. Follow the patterns in the codebase
4. Write tests for everything
5. The team is here to help!

---

*Last Updated: December 2025*  
*Version: 1.0*  
*Maintainer: Gen AI Team*

