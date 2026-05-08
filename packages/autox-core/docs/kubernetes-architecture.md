# Kubernetes Client Architecture

This package follows strict **Handler → Service → Client** layering with clear separation of concerns.

## Design Principles

### Client Layer (`client*.go`)
**Pure Kubernetes API operations only. No business logic.**

✅ **Allowed:**
- Direct K8s API calls (list, get, create, etc.)
- Error propagation
- Infrastructure concerns (OpenShift Projects API fallback)
- Generic RBAC checks (`CanAccessResource`, `IsClusterAdmin`)

❌ **Not Allowed:**
- Permission filtering or orchestration
- Data transformation (e.g., extracting service account names)
- Multi-step logic (e.g., "check admin then list all")
- Pre-call permission checks (let K8s API return 403)

### Service Layer (`service.go`)
**Business logic, orchestration, validation, and logging.**

✅ **Responsibilities:**
- Input validation (DNS-1123 format, etc.)
- Structured logging
- Orchestrating multiple client calls
- Filtering and transformation
- Permission-aware operations

### Key Methods

#### Client Methods (Pure K8s)
```go
// Returns raw username from token (e.g., "system:serviceaccount:ns:sa-name")
GetUser(identity) (string, error)

// Returns ALL namespaces (or OpenShift Projects if forbidden)
GetNamespaces(ctx, identity) ([]Namespace, error)

// Direct K8s API call - no permission pre-check
GetSecrets(ctx, identity, namespace) ([]Secret, error)
GetSecret(ctx, identity, namespace, name) (*Secret, error)
```

#### Service Methods (Business Logic)
```go
// GetAccessibleNamespaces returns namespaces filtered by user permissions
// Includes optimization: checks cluster-admin first, then filters by SAR
GetAccessibleNamespaces(ctx, identity) ([]Namespace, error)

// ExtractServiceAccountName extracts SA name from Kubernetes username
// "system:serviceaccount:ns:sa-name" → "sa-name"
// "user@example.com" → "user@example.com"
ExtractServiceAccountName(username string) string
```

## Usage Examples

### Handler Layer (AutoML/AutoRAG)
```go
// Example 1: Get user identity
func (a *App) GetCurrentUserHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
    ctx := r.Context()
    identity := ctx.Value(constants.RequestIdentityKey).(*auth.RequestIdentity)

    // Client returns raw username
    username, err := a.k8sService.GetUser(identity)
    if err != nil {
        a.serverErrorResponse(w, r, err)
        return
    }

    // Service layer transforms for presentation
    displayName := kubernetes.ExtractServiceAccountName(username)

    a.WriteJSON(w, http.StatusOK, map[string]string{"user": displayName}, nil)
}

// Example 2: Get accessible namespaces
func (a *App) GetNamespacesHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
    ctx := r.Context()
    identity := ctx.Value(constants.RequestIdentityKey).(*auth.RequestIdentity)

    // Use service method for permission-filtered namespaces
    namespaces, err := a.k8sService.GetAccessibleNamespaces(ctx, identity)
    if err != nil {
        a.serverErrorResponse(w, r, err)
        return
    }

    a.WriteJSON(w, http.StatusOK, namespaces, nil)
}

// Example 3: Get secrets (permission enforced by K8s API)
func (a *App) GetSecretsHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
    ctx := r.Context()
    identity := ctx.Value(constants.RequestIdentityKey).(*auth.RequestIdentity)
    namespace := ctx.Value(constants.NamespaceHeaderParameterKey).(string)

    // Client makes direct K8s API call
    // If user lacks permission, K8s API returns 403 Forbidden
    secrets, err := a.k8sService.GetSecrets(ctx, identity, namespace)
    if err != nil {
        // Service layer will log and propagate K8s 403 error
        a.serverErrorResponse(w, r, err)
        return
    }

    a.WriteJSON(w, http.StatusOK, secrets, nil)
}
```

## Refactoring from AutoML/AutoRAG

This implementation diverges from the original automl/autorag code in the following ways:

### What Was Removed from Client Layer
1. **Service account name extraction** (`GetUser`) - Moved to service utility
2. **Admin optimization in `GetNamespaces`** - Moved to service `GetAccessibleNamespaces`
3. **Permission filtering in `GetNamespaces`** - Moved to service `GetAccessibleNamespaces`
4. **Pre-call permission checks in `GetSecrets/GetSecret`** - Removed (K8s API enforces)

### Why These Changes Matter
- **Testability**: Client methods are simple K8s API wrappers, easy to mock
- **Reusability**: Service methods can be composed differently by products
- **Clarity**: Each layer has a single responsibility
- **Maintainability**: Business logic changes don't require client layer updates

### Migration Guide

If you're migrating from automl/autorag patterns:

```go
// OLD (automl): Client did permission filtering
namespaces := k8sClient.GetNamespaces(ctx, identity)
// Returns filtered list (business logic in client)

// NEW (autox-core): Choose your behavior
namespaces := k8sService.GetNamespaces(ctx, identity)
// Returns all namespaces (pure K8s)

namespaces := k8sService.GetAccessibleNamespaces(ctx, identity)
// Returns filtered list (business logic in service)
```

## Architecture Validation

To verify proper layering:
- **Client tests** should only mock K8s clientset/dynamic client
- **Service tests** should mock the `K8sClientInterface`
- **Handler tests** should mock the entire service

Run `go build .` to verify clean compilation.
