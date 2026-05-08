# Kubernetes Integration Layer Analysis

## Executive Summary

This document analyzes the Kubernetes integration code in `automl` and `autorag` packages to determine what should remain in `integrations/kubernetes/` (low-level K8s wrappers) versus what should move to `repositories/` (business logic). The analysis follows the **Separation of Concerns (SoC)** principle where integrations provide thin wrappers around the K8s client library, and repositories implement domain-specific business logic.

## Current Structure

Both `automl` and `autorag` share nearly identical Kubernetes integration implementations:

```
packages/{automl,autorag}/bff/internal/integrations/kubernetes/
├── client.go                      # KubernetesClientInterface definition
├── types.go                       # Data structures (RequestIdentity, BearerToken, ServiceDetails)
├── factory.go                     # Factory for creating K8s clients based on auth method
├── shared_k8s_client.go          # Common client logic shared between implementations
├── internal_k8s_client.go        # Service account-based client with impersonation
├── token_k8s_client.go           # User token-based client
├── portforward.go                # Port forwarding manager (automl only)
├── errors.go                     # K8s error types (autorag only)
└── k8mocks/                      # Mock implementations for testing
```

## Classification Matrix

| File/Component | Classification | Rationale |
|----------------|----------------|-----------|
| **client.go** | ✅ **STAY** | Defines the interface contract for K8s operations. Pure abstraction with no business logic. |
| **types.go** | ✅ **STAY** | DTOs and value objects for K8s integration. Infrastructure-level types. |
| **factory.go** | ✅ **STAY** | Infrastructure concern: creates appropriate client based on auth configuration. No business logic. |
| **shared_k8s_client.go** | ✅ **STAY** | Thin wrapper around `kubernetes.Interface`. Provides access to underlying client. |
| **errors.go** | ✅ **STAY** | K8s-specific error types and helpers. Infrastructure-level error handling. |
| **portforward.go** | ✅ **STAY** | Low-level K8s port forwarding implementation. Dev-only infrastructure component. |
| **k8mocks/** | ✅ **STAY** | Test infrastructure for integration layer. |

### Files with Mixed Concerns (Require Refactoring)

| File/Function | Current Location | Should Be | Issue | Recommendation |
|--------------|------------------|-----------|-------|----------------|
| **internal_k8s_client.go::GetNamespaces** | integrations/kubernetes | ❌ **MOVE TO REPOSITORY** | Contains complex business logic: worker pools, optimization strategies, fallback logic, cluster admin checks | Extract to `NamespaceRepository.ListAccessibleNamespaces()` |
| **internal_k8s_client.go::GetSecrets** | integrations/kubernetes | ❌ **MOVE TO REPOSITORY** | Business validation (namespace existence check), authorization logic, custom error construction | Extract to `SecretRepository.ListSecrets()` |
| **internal_k8s_client.go::GetSecret** | integrations/kubernetes | ❌ **MOVE TO REPOSITORY** | Authorization checks, namespace validation, permission logic | Extract to `SecretRepository.GetSecret()` |
| **internal_k8s_client.go::IsClusterAdmin** | integrations/kubernetes | ⚠️ **BORDERLINE** | Authorization decision logic, but tightly coupled to K8s RBAC | Consider moving to `UserRepository.IsClusterAdmin()` or leave as thin wrapper |
| **internal_k8s_client.go::CanListDSPipelineApplications** | integrations/kubernetes | ❌ **MOVE TO REPOSITORY** | Domain-specific permission check for DSPipeline resources | Extract to `PipelineRepository.CanListPipelines()` or `PermissionRepository` |
| **token_k8s_client.go::IsClusterAdmin** | integrations/kubernetes | ⚠️ **BORDERLINE** | Uses SelfSubjectAccessReview - thin wrapper, but still authorization logic | Same as internal_k8s_client version |
| **token_k8s_client.go::GetNamespaces** | integrations/kubernetes | ❌ **MOVE TO REPOSITORY** | Fallback logic to Projects API, error handling strategies, decision-making | Extract to `NamespaceRepository` |
| **token_k8s_client.go::GetUser** | integrations/kubernetes | ⚠️ **BORDERLINE** | User identity extraction logic, service account parsing | Consider extracting user identity logic to `UserRepository` |
| **token_k8s_client.go::Can* methods** | integrations/kubernetes | ❌ **MOVE TO REPOSITORY** | Permission checking is business logic | Extract to `PermissionRepository` or domain repositories |

## Detailed Analysis

### ✅ What Should STAY in integrations/kubernetes/

These components are **legitimate low-level K8s wrappers**:

#### 1. **client.go - Interface Definition**
```go
type KubernetesClientInterface interface {
    GetNamespaces(ctx context.Context, identity *RequestIdentity) ([]corev1.Namespace, error)
    GetSecrets(ctx context.Context, namespace string, identity *RequestIdentity) ([]corev1.Secret, error)
    // ...
}
```
**Why STAY**: Pure interface definition. No implementation, no business logic.

#### 2. **types.go - Data Structures**
```go
type RequestIdentity struct {
    UserID string
    Groups []string
    Token  string
}

type BearerToken struct {
    raw string
}
```
**Why STAY**: Infrastructure-level DTOs. These types represent K8s authentication primitives, not business concepts.

#### 3. **factory.go - Client Factory**
```go
func NewKubernetesClientFactory(cfg config.EnvConfig, logger *slog.Logger) (KubernetesClientFactory, error) {
    switch cfg.AuthMethod {
    case config.AuthMethodInternal:
        return NewStaticClientFactory(logger)
    case config.AuthMethodUser:
        return NewTokenClientFactory(logger, cfg)
    }
}
```
**Why STAY**: Infrastructure bootstrapping based on configuration. No business rules, just wiring.

#### 4. **shared_k8s_client.go - Common Client Logic**
```go
type SharedClientLogic struct {
    Client     kubernetes.Interface
    Logger     *slog.Logger
    Token      BearerToken
    RestConfig *rest.Config
}

func (kc *SharedClientLogic) GetClientset() interface{} { 
    return kc.Client 
}
```
**Why STAY**: Thin wrapper providing access to underlying K8s client. No business logic.

#### 5. **errors.go - K8s Error Types**
```go
type K8sError struct {
    Code       string
    Message    string
    Namespace  string
    StatusCode int
}

func NewForbiddenError(message string) *K8sError {
    return NewK8sError(ErrCodeForbidden, message, 403)
}
```
**Why STAY**: Infrastructure-level error representation. Maps K8s API errors to internal error types.

#### 6. **portforward.go - Port Forward Manager**
```go
type PortForwardManager struct {
    mu         sync.Mutex
    forwards   map[string]*activeForward
    restConfig *rest.Config
    clientset  kubernetes.Interface
}

func (m *PortForwardManager) ForwardURL(ctx context.Context, rawURL string) (string, error) {
    // Low-level K8s port forwarding via SPDY
}
```
**Why STAY**: 
- Pure infrastructure component for local development
- Direct K8s API interaction (SPDY, port forwarding)
- No business logic, just networking primitives
- Never instantiated in production (guarded by DevMode flag)

---

### ❌ What Should MOVE OUT to repositories/

These components contain **business logic** that violates SoC:

#### 1. **internal_k8s_client.go::GetNamespaces** - MOVE TO REPOSITORY

**Current Implementation (273 lines!)**:
```go
func (kc *InternalKubernetesClient) GetNamespaces(ctx context.Context, identity *RequestIdentity) ([]corev1.Namespace, error) {
    // ❌ BUSINESS LOGIC: Cluster admin optimization
    isAdmin, err := kc.IsClusterAdmin(identity)
    if isAdmin {
        // Return all namespaces
    }
    
    // ❌ BUSINESS LOGIC: Worker pool for parallel SAR processing
    const numWorkers = 10
    type sarJob struct { namespace corev1.Namespace }
    
    // ❌ BUSINESS LOGIC: Complex fallback strategy
    if k8serrors.IsForbidden(err) {
        return kc.getNamespacesViaProjectsAPI(ctx, identity)
    }
    
    // ❌ BUSINESS LOGIC: Filtering namespaces by user permissions
    for processed < len(namespaceList.Items) {
        // SAR checks for each namespace
    }
}
```

**Violations**:
- **Performance optimization decisions** (worker pools, parallelization)
- **Fallback strategies** (Projects API vs Namespaces API)
- **Authorization logic** (cluster admin checks, per-namespace SAR)
- **Business rules** (what namespaces a user can see)

**Recommended Refactor**:
```go
// integrations/kubernetes/client.go - THIN WRAPPER
func (kc *InternalKubernetesClient) ListNamespaces(ctx context.Context) ([]corev1.Namespace, error) {
    return kc.Client.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
}

func (kc *InternalKubernetesClient) CreateSubjectAccessReview(ctx context.Context, sar *authv1.SubjectAccessReview) (*authv1.SubjectAccessReview, error) {
    return kc.Client.AuthorizationV1().SubjectAccessReviews().Create(ctx, sar, metav1.CreateOptions{})
}

// repositories/namespace.go - BUSINESS LOGIC
type NamespaceRepository struct {
    k8sClient k8s.KubernetesClientInterface
}

func (r *NamespaceRepository) ListAccessibleNamespaces(ctx context.Context, identity *k8s.RequestIdentity) ([]corev1.Namespace, error) {
    // All the business logic: admin checks, worker pools, filtering, fallbacks
}
```

#### 2. **internal_k8s_client.go::GetSecrets** - MOVE TO REPOSITORY

**Current Implementation**:
```go
func (kc *InternalKubernetesClient) GetSecrets(ctx context.Context, namespace string, identity *RequestIdentity) ([]corev1.Secret, error) {
    // ❌ BUSINESS VALIDATION: Namespace existence check
    _, err := kc.Client.CoreV1().Namespaces().Get(ctx, namespace, metav1.GetOptions{})
    if err != nil {
        return nil, fmt.Errorf("namespace %s does not exist or is not accessible: %w", namespace, err)
    }
    
    // ❌ AUTHORIZATION LOGIC: Permission check
    sar := &authv1.SubjectAccessReview{
        Spec: authv1.SubjectAccessReviewSpec{
            User:   identity.UserID,
            Groups: identity.Groups,
            ResourceAttributes: &authv1.ResourceAttributes{
                Verb:      "list",
                Resource:  "secrets",
                Namespace: namespace,
            },
        },
    }
    
    response, err := kc.Client.AuthorizationV1().SubjectAccessReviews().Create(ctx, sar, metav1.CreateOptions{})
    
    // ❌ BUSINESS LOGIC: Custom error construction
    if !response.Status.Allowed {
        status := metav1.Status{
            Status:  metav1.StatusFailure,
            Reason:  metav1.StatusReasonForbidden,
            Message: fmt.Sprintf("user %s does not have permission...", identity.UserID, namespace),
            Code:    403,
        }
        return nil, &k8serrors.StatusError{ErrStatus: status}
    }
}
```

**Violations**:
- **Business validation** (namespace must exist before permission check)
- **Authorization logic** (constructing and evaluating SAR)
- **Error formatting** (custom error messages with business context)
- **Decision-making** (when to check namespace vs permissions)

**Recommended Refactor**:
```go
// integrations/kubernetes/ - THIN WRAPPERS
func (kc *InternalKubernetesClient) ListSecrets(ctx context.Context, namespace string) ([]corev1.Secret, error) {
    secretList, err := kc.Client.CoreV1().Secrets(namespace).List(ctx, metav1.ListOptions{})
    return secretList.Items, err
}

// repositories/secret.go - BUSINESS LOGIC
type SecretRepository struct {
    k8sClient k8s.KubernetesClientInterface
    authSvc   *AuthorizationService
}

func (r *SecretRepository) ListSecrets(ctx context.Context, namespace string, identity *k8s.RequestIdentity) ([]corev1.Secret, error) {
    // Validate namespace exists
    if err := r.validateNamespaceExists(ctx, namespace); err != nil {
        return nil, err
    }
    
    // Check permissions
    if !r.authSvc.CanListSecretsInNamespace(ctx, identity, namespace) {
        return nil, r.authSvc.ForbiddenError(identity.UserID, namespace, "list secrets")
    }
    
    return r.k8sClient.ListSecrets(ctx, namespace)
}
```

#### 3. **token_k8s_client.go::GetUser** - MOVE TO REPOSITORY

**Current Implementation**:
```go
func (kc *TokenKubernetesClient) GetUser(_ *RequestIdentity) (string, error) {
    ssr := &authnv1.SelfSubjectReview{
        TypeMeta: metav1.TypeMeta{
            Kind:       "SelfSubjectReview",
            APIVersion: "authentication.k8s.io/v1",
        },
    }
    
    resp, err := kc.Client.AuthenticationV1().SelfSubjectReviews().Create(ctx, ssr, metav1.CreateOptions{})
    
    // ❌ BUSINESS LOGIC: Service account name extraction
    const saPrefix = "system:serviceaccount:"
    if strings.HasPrefix(username, saPrefix) {
        parts := strings.SplitN(strings.TrimPrefix(username, saPrefix), ":", 2)
        if len(parts) == 2 {
            return parts[1], nil // Return just the service account name
        }
        kc.Logger.Warn("malformed service account username", "username", username)
    }
    
    return username, nil
}
```

**Violations**:
- **Business logic** for extracting service account names
- **String parsing rules** (service account prefix handling)
- **Decision-making** (what format to return usernames in)

**Recommended Refactor**:
```go
// integrations/kubernetes/ - THIN WRAPPER
func (kc *TokenKubernetesClient) CreateSelfSubjectReview(ctx context.Context) (*authnv1.SelfSubjectReview, error) {
    ssr := &authnv1.SelfSubjectReview{...}
    return kc.Client.AuthenticationV1().SelfSubjectReviews().Create(ctx, ssr, metav1.CreateOptions{})
}

// repositories/user.go - BUSINESS LOGIC
type UserRepository struct {
    k8sClient k8s.KubernetesClientInterface
}

func (r *UserRepository) GetCurrentUser(ctx context.Context) (string, error) {
    ssr, err := r.k8sClient.CreateSelfSubjectReview(ctx)
    username := ssr.Status.UserInfo.Username
    
    // Business logic: extract service account name
    if strings.HasPrefix(username, "system:serviceaccount:") {
        return r.extractServiceAccountName(username)
    }
    return username, nil
}
```

#### 4. **Can* Permission Methods** - MOVE TO REPOSITORY

**Current Implementation in Both Clients**:
```go
func (kc *InternalKubernetesClient) CanListDSPipelineApplications(ctx context.Context, identity *RequestIdentity, namespace string) (bool, error) {
    sar := &authv1.SubjectAccessReview{
        Spec: authv1.SubjectAccessReviewSpec{
            ResourceAttributes: &authv1.ResourceAttributes{
                Verb:      "list",
                Group:     "datasciencepipelinesapplications.opendatahub.io",
                Resource:  "datasciencepipelinesapplications",
                Namespace: namespace,
            },
            User:   identity.UserID,
            Groups: identity.Groups,
        },
    }
    // ...
}

func (kc *TokenKubernetesClient) CanListServicesInNamespace(ctx context.Context, _ *RequestIdentity, namespace string) (bool, error) {
    // Similar SAR logic
}
```

**Violations**:
- **Domain-specific permission checks** (`DSPipelineApplications` is a business domain concept)
- **Authorization business rules** (what permissions are required for what operations)
- **Should be in repositories** where domain logic lives

**Recommended Refactor**:
```go
// integrations/kubernetes/ - GENERIC WRAPPER
func (kc *InternalKubernetesClient) CheckAccess(ctx context.Context, sar *authv1.SubjectAccessReview) (bool, error) {
    response, err := kc.Client.AuthorizationV1().SubjectAccessReviews().Create(ctx, sar, metav1.CreateOptions{})
    if err != nil {
        return false, err
    }
    return response.Status.Allowed, nil
}

// repositories/pipeline.go - DOMAIN-SPECIFIC LOGIC
type PipelineRepository struct {
    k8sClient k8s.KubernetesClientInterface
}

func (r *PipelineRepository) CanListPipelines(ctx context.Context, identity *k8s.RequestIdentity, namespace string) (bool, error) {
    sar := &authv1.SubjectAccessReview{
        Spec: authv1.SubjectAccessReviewSpec{
            ResourceAttributes: &authv1.ResourceAttributes{
                Verb:      "list",
                Group:     "datasciencepipelinesapplications.opendatahub.io",
                Resource:  "datasciencepipelinesapplications",
                Namespace: namespace,
            },
            User:   identity.UserID,
            Groups: identity.Groups,
        },
    }
    return r.k8sClient.CheckAccess(ctx, sar)
}
```

---

## Patterns that Violate Separation of Concerns

### 1. **Complex Orchestration in Integration Layer**

**Antipattern**: Worker pools, parallel processing, optimization strategies
```go
// ❌ BAD: In integrations/kubernetes/
const numWorkers = 10
type sarJob struct { namespace corev1.Namespace }
jobs := make(chan sarJob, len(namespaceList.Items))

for w := 0; w < numWorkers; w++ {
    go func() { /* worker logic */ }()
}
```

**Correct**: Orchestration belongs in repositories
```go
// ✅ GOOD: In repositories/namespace.go
func (r *NamespaceRepository) ListAccessibleNamespaces(ctx context.Context, identity *k8s.RequestIdentity) ([]corev1.Namespace, error) {
    // Worker pool logic here
}
```

### 2. **Business Validation in Integration Layer**

**Antipattern**: Pre-checking namespace existence before permission checks
```go
// ❌ BAD: In integrations/kubernetes/
_, err := kc.Client.CoreV1().Namespaces().Get(ctx, namespace, metav1.GetOptions{})
if err != nil {
    return nil, fmt.Errorf("namespace %s does not exist or is not accessible: %w", namespace, err)
}
```

**Correct**: Validation belongs in repositories
```go
// ✅ GOOD: In repositories/secret.go
func (r *SecretRepository) ListSecrets(ctx context.Context, namespace string, identity *k8s.RequestIdentity) ([]corev1.Secret, error) {
    if err := r.validateNamespaceExists(ctx, namespace); err != nil {
        return nil, err
    }
    // ...
}
```

### 3. **Authorization Decision-Making in Integration Layer**

**Antipattern**: Checking cluster admin status to short-circuit permission checks
```go
// ❌ BAD: In integrations/kubernetes/
isAdmin, err := kc.IsClusterAdmin(identity)
if isAdmin {
    namespaceList, err := kc.Client.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
    return namespaceList.Items, nil
}
```

**Correct**: Authorization logic belongs in repositories
```go
// ✅ GOOD: In repositories/namespace.go
func (r *NamespaceRepository) ListAccessibleNamespaces(ctx context.Context, identity *k8s.RequestIdentity) ([]corev1.Namespace, error) {
    if r.authSvc.IsClusterAdmin(ctx, identity) {
        return r.k8sClient.ListAllNamespaces(ctx)
    }
    return r.filterNamespacesByPermissions(ctx, identity)
}
```

### 4. **Domain-Specific Knowledge in Integration Layer**

**Antipattern**: Hard-coding knowledge about `DSPipelineApplications`
```go
// ❌ BAD: In integrations/kubernetes/
func CanListDSPipelineApplications(ctx context.Context, identity *RequestIdentity, namespace string) (bool, error) {
    // DSPipelineApplications is a domain concept, not infrastructure
}
```

**Correct**: Domain knowledge belongs in domain repositories
```go
// ✅ GOOD: In repositories/pipeline.go
func (r *PipelineRepository) CanListPipelines(ctx context.Context, identity *k8s.RequestIdentity, namespace string) (bool, error) {
    // Domain-specific permission check
}
```

### 5. **Custom Error Construction with Business Context**

**Antipattern**: Building detailed error messages with business semantics
```go
// ❌ BAD: In integrations/kubernetes/
status := metav1.Status{
    Status:  metav1.StatusFailure,
    Reason:  metav1.StatusReasonForbidden,
    Message: fmt.Sprintf("user %s does not have permission to list secrets in namespace %s", identity.UserID, namespace),
    Code:    403,
}
return nil, &k8serrors.StatusError{ErrStatus: status}
```

**Correct**: Business error formatting belongs in repositories
```go
// ✅ GOOD: In repositories/secret.go
if !allowed {
    return nil, r.authSvc.ForbiddenError(identity.UserID, namespace, "list secrets")
}
```

---

## Comparison: Current vs Recommended Structure

### Current Structure (Violates SoC)

```
integrations/kubernetes/
├── client.go                    ✅ Interface definition
├── types.go                     ✅ Infrastructure types
├── factory.go                   ✅ Client factory
├── shared_k8s_client.go        ✅ Thin wrapper
├── internal_k8s_client.go      ❌ Contains business logic (273 lines)
│   ├── GetNamespaces()         ❌ Worker pools, optimization, fallbacks
│   ├── GetSecrets()            ❌ Validation, authorization, error construction
│   ├── IsClusterAdmin()        ❌ Authorization logic
│   └── CanListDSPipeline...()  ❌ Domain-specific permissions
├── token_k8s_client.go         ❌ Contains business logic
│   ├── GetNamespaces()         ❌ Fallback strategies
│   ├── GetUser()               ❌ Service account parsing
│   └── Can* methods            ❌ Permission checks
└── errors.go                    ✅ K8s error types
```

### Recommended Structure (Follows SoC)

```
integrations/kubernetes/
├── client.go                    ✅ KubernetesClientInterface
├── types.go                     ✅ RequestIdentity, BearerToken, etc.
├── factory.go                   ✅ Client factory
├── shared_k8s_client.go        ✅ SharedClientLogic
├── internal_k8s_client.go      ✅ Thin wrapper (50 lines)
│   ├── ListNamespaces()        ✅ Direct K8s API call
│   ├── ListSecrets()           ✅ Direct K8s API call
│   ├── CreateSAR()             ✅ Direct K8s API call
│   └── GetClientset()          ✅ Access to underlying client
├── token_k8s_client.go         ✅ Thin wrapper (50 lines)
│   ├── ListNamespaces()        ✅ Direct K8s API call
│   ├── CreateSSAR()            ✅ Direct K8s API call
│   └── CreateSSR()             ✅ Direct K8s API call
└── errors.go                    ✅ K8s error types

repositories/
├── namespace.go                 ✅ Business logic
│   ├── ListAccessibleNamespaces()  ✅ Admin checks, worker pools, filtering
│   └── validateNamespaceExists()   ✅ Validation logic
├── secret.go                    ✅ Business logic
│   ├── ListSecrets()           ✅ Validation + authorization
│   └── GetSecret()             ✅ Permission checking
├── user.go                      ✅ Business logic
│   ├── GetCurrentUser()        ✅ Service account parsing
│   └── IsClusterAdmin()        ✅ Admin detection
├── pipeline.go                  ✅ Domain logic
│   └── CanListPipelines()      ✅ Domain-specific permissions
└── authorization.go             ✅ Authorization service
    ├── CanListSecretsInNamespace() ✅ Permission checking
    └── ForbiddenError()        ✅ Business error formatting
```

---

## Migration Strategy

### Phase 1: Extract Authorization Service
1. Create `repositories/authorization.go`
2. Move all SAR/SSAR creation logic
3. Move permission checking methods (`Can*`)
4. Update integration layer to use thin SAR/SSAR wrappers

### Phase 2: Extract Namespace Repository
1. Create `repositories/namespace.go`
2. Move `GetNamespaces()` business logic
3. Extract worker pool parallelization
4. Extract fallback to Projects API
5. Update handlers to use repository

### Phase 3: Extract Secret Repository
1. Create `repositories/secret.go`
2. Move `GetSecrets()` and `GetSecret()` logic
3. Extract namespace validation
4. Extract permission checking
5. Update handlers to use repository

### Phase 4: Extract User Repository
1. Enhance existing `repositories/user.go`
2. Move `GetUser()` logic
3. Move service account parsing
4. Move `IsClusterAdmin()` logic
5. Update handlers to use repository

### Phase 5: Extract Pipeline Repository
1. Create `repositories/pipeline.go`
2. Move `CanListDSPipelineApplications()` logic
3. Consolidate with existing pipeline repository methods
4. Update handlers to use repository

---

## Benefits of Refactoring

### 1. **Clear Separation of Concerns**
- Integration layer: thin K8s API wrappers
- Repository layer: business logic, validation, orchestration

### 2. **Testability**
- Integration layer: simple unit tests of K8s API calls
- Repository layer: comprehensive business logic tests with mocked K8s client

### 3. **Reusability**
- Generic K8s operations can be reused across repositories
- Business logic is centralized and not duplicated

### 4. **Maintainability**
- Changes to business rules don't require touching integration layer
- Changes to K8s API interactions are isolated

### 5. **Clarity**
- Developers know where to find business logic (repositories)
- Developers know where to find K8s wrappers (integrations)

---

## Current Issues

### 1. **Duplicate Code Between automl and autorag**
Both packages have nearly identical K8s integration implementations. This suggests:
- Common code should be extracted to a shared library (`autox-core`)
- Differences are minimal and could be parameterized

### 2. **Integration Layer is Too Fat**
Files like `internal_k8s_client.go` are 437 lines with complex business logic:
- Worker pools for parallel processing
- Optimization strategies (cluster admin short-circuit)
- Fallback mechanisms (Projects API)
- Custom error construction
- Namespace validation

### 3. **No Clear Authorization Service**
Permission checking logic is scattered across:
- `IsClusterAdmin()` in both client implementations
- `Can*` methods in both client implementations
- Manual SAR construction in `GetSecrets()` and `GetSecret()`

Should be consolidated into `AuthorizationRepository` or `AuthorizationService`.

### 4. **Missing Abstraction for SAR/SSAR**
Every permission check manually constructs `SubjectAccessReview` or `SelfSubjectAccessReview`:
```go
sar := &authv1.SubjectAccessReview{
    Spec: authv1.SubjectAccessReviewSpec{
        User:   identity.UserID,
        Groups: identity.Groups,
        ResourceAttributes: &authv1.ResourceAttributes{...},
    },
}
```

Should be extracted to `AuthorizationService.CheckAccess()` helper.

---

## Recommendations

### Immediate Actions

1. **Create `repositories/authorization.go`** to centralize all permission checking
2. **Extract `GetNamespaces()` business logic** to `NamespaceRepository`
3. **Extract `GetSecrets()`/`GetSecret()` logic** to `SecretRepository`
4. **Move domain-specific permission checks** (`CanListDSPipelineApplications`) to domain repositories

### Medium-Term Actions

1. **Consolidate automl and autorag K8s integration** into shared `autox-core` package
2. **Reduce integration layer to thin wrappers** (50-100 lines per client)
3. **Create comprehensive repository layer** with clear domain boundaries

### Long-Term Actions

1. **Implement shared authorization patterns** across all repositories
2. **Extract common K8s patterns** (list, get, create, update, delete) to base repository
3. **Standardize error handling** between integration and repository layers

---

## Examples of Correct Layering

### ✅ GOOD: Thin Integration Layer

```go
// integrations/kubernetes/internal_k8s_client.go
type InternalKubernetesClient struct {
    SharedClientLogic
}

// Thin wrapper - just call K8s API
func (kc *InternalKubernetesClient) ListNamespaces(ctx context.Context) ([]corev1.Namespace, error) {
    nsList, err := kc.Client.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
    if err != nil {
        return nil, err
    }
    return nsList.Items, nil
}

// Generic permission check wrapper
func (kc *InternalKubernetesClient) CheckSubjectAccess(ctx context.Context, sar *authv1.SubjectAccessReview) (bool, error) {
    response, err := kc.Client.AuthorizationV1().SubjectAccessReviews().Create(ctx, sar, metav1.CreateOptions{})
    if err != nil {
        return false, err
    }
    return response.Status.Allowed, nil
}
```

### ✅ GOOD: Business Logic in Repository

```go
// repositories/namespace.go
type NamespaceRepository struct {
    k8sClient k8s.KubernetesClientInterface
    authSvc   *AuthorizationService
    logger    *slog.Logger
}

// All business logic lives here
func (r *NamespaceRepository) ListAccessibleNamespaces(ctx context.Context, identity *k8s.RequestIdentity) ([]corev1.Namespace, error) {
    // Optimization: cluster admin gets all namespaces
    if r.authSvc.IsClusterAdmin(ctx, identity) {
        return r.k8sClient.ListNamespaces(ctx)
    }
    
    // Try cluster-wide list first
    allNamespaces, err := r.k8sClient.ListNamespaces(ctx)
    if err == nil {
        return r.filterByPermissions(ctx, allNamespaces, identity)
    }
    
    // Fallback to Projects API
    if k8serrors.IsForbidden(err) {
        return r.listViaProjectsAPI(ctx, identity)
    }
    
    return nil, err
}

// Worker pool for parallel permission checks
func (r *NamespaceRepository) filterByPermissions(ctx context.Context, namespaces []corev1.Namespace, identity *k8s.RequestIdentity) ([]corev1.Namespace, error) {
    const numWorkers = 10
    // ... worker pool logic
}
```

---

## Conclusion

The current Kubernetes integration layer in both `automl` and `autorag` **violates Separation of Concerns** by embedding significant business logic, authorization decisions, optimization strategies, and validation rules within what should be thin K8s API wrappers.

### Key Findings:
- ✅ **KEEP**: Interface definitions, DTOs, factories, error types, port forwarding
- ❌ **MOVE**: Business logic, authorization, validation, orchestration, domain-specific knowledge

### Priority Refactorings:
1. Extract `GetNamespaces()` business logic → `NamespaceRepository`
2. Extract `GetSecrets()`/`GetSecret()` logic → `SecretRepository`
3. Extract authorization logic → `AuthorizationService`
4. Extract domain permissions → Domain repositories (e.g., `PipelineRepository`)

### Ultimate Goal:
```
integrations/kubernetes/ → Thin wrappers (50-100 lines per client)
repositories/           → Business logic (all orchestration, validation, authorization)
```

This refactoring will improve testability, maintainability, reusability, and clarity while following proper layered architecture principles.
