# RBAC Reference — ODH Dashboard

## User Types

The dashboard recognizes three effective permission levels, all derived from Kubernetes RBAC:

| User Type | How Determined | Scope |
|-----------|---------------|-------|
| **Cluster admin** | Has `*` verbs on all resources (cluster-wide). SSAR always passes. | Full access to everything |
| **Dashboard admin** | Can `patch` the `auths/default-auth` singleton (group `services.platform.opendatahub.io`). Stored as `isAdmin` in Redux (deprecated). | Admin UI features, manage other users' resources |
| **Regular user** | Can `get` the `auths/default-auth` singleton (i.e., `isAllowed`). Cannot patch. | Own resources only; admin features hidden |

**Key insight:** There is no explicit "cluster admin" boolean in the main dashboard. Cluster admins simply pass all SSAR checks. The distinction matters when code checks a *specific* permission and a dashboard admin might fail it.

## Frontend Permission Infrastructure

### Preferred: Cached SSAR via AccessReviewProvider

```typescript
// Context-cached SSAR — preferred for all new code
import { useAccessAllowed } from '#~/concepts/userSSAR/useAccessAllowed';
import { verbModelAccess } from '#~/concepts/userSSAR/utils';
import { AccessAllowed } from '#~/concepts/userSSAR/AccessAllowed';
import { useKebabAccessAllowed } from '#~/concepts/userSSAR/useKebabAccessAllowed';
import { accessAllowedRouteHoC } from '#~/concepts/userSSAR/accessAllowedRouteHoC';
```

**Key files:**
- `frontend/src/concepts/userSSAR/AccessReviewContext.tsx` — Provider, caches SSAR results by key
- `frontend/src/concepts/userSSAR/useAccessAllowed.ts` — `[isAllowed, isLoaded]` hook
- `frontend/src/concepts/userSSAR/AccessAllowed.ts` — Render-prop component
- `frontend/src/concepts/userSSAR/useKebabAccessAllowed.ts` — For kebab dropdown items (returns disabled/tooltip)
- `frontend/src/concepts/userSSAR/accessAllowedRouteHoC.tsx` — HOC for route-level gating
- `frontend/src/concepts/userSSAR/utils.ts` — `verbModelAccess(verb, model, namespace?)`

### Legacy: Non-cached SSAR (avoid for new code)

```typescript
import { useAccessReview, checkAccess } from '#~/api/useAccessReview';
```

Avoid for new code — does not use the context cache. Still valid but creates duplicate requests.

### Deprecated: Redux isAdmin

```typescript
// DEPRECATED — do not use for new features
const { isAdmin } = useUser();
```

`UserState.isAdmin` maps to "can patch auths/default-auth". For new code, use explicit SSAR checks targeting the specific resource/verb the feature needs.

## Common Patterns

### Route-level gating

```typescript
const MyPage: React.FC = () => <Routes>...</Routes>;
const accessCheck = verbModelAccess('list', MyModel);
export default accessAllowedRouteHoC(accessCheck)(MyPage);
```

Shows spinner while loading, `NotFound` if denied.

### Button/action gating

```typescript
const [canCreate, loaded] = useAccessAllowed(verbModelAccess('create', MyModel, ns));
// Render button disabled or hidden when !canCreate
```

### Kebab menu gating

```typescript
const { kebabDisabled, kebabTooltip } = useKebabAccessAllowed(
  verbModelAccess('delete', MyModel, ns)
);
```

### Navigation filtering

Extensions declare `accessReview?: AccessReviewResourceAttributes` in their route definition. `NavSection.tsx` uses `useAccessReviewExtensions` to filter inaccessible items.

### Conditional data fetching

```typescript
const [canList] = useAccessAllowed(verbModelAccess('list', SecretModel, ns));
// Only fetch secrets if user has permission
const secrets = useSomeHook(ns, { enabled: canList });
```

## Backend Route Security

### Key utilities

- `secureRoute(fastify)` — Validates namespace scoping and resource ownership
- `secureAdminRoute(fastify)` — Same as `secureRoute` but requires dashboard admin
- `createSelfSubjectAccessReview(fastify, request, attrs)` — Backend SSAR helper

**Location:** `backend/src/utils/route-security.ts`, `backend/src/utils/adminUtils.ts`

### Namespace validation

Routes validate the target namespace against `dashboardNamespace` and `workbenchNamespace`. Requests targeting other namespaces are rejected with 403.

### BFF (Go) patterns

Go BFF services in `packages/*/bff/` must:
- Forward the user's auth token on upstream K8s API calls
- Validate namespace parameters
- Not assume the calling user is an admin

## Anti-Patterns to Flag

### 1. No permission check on new page

```typescript
// BAD: Page accessible to everyone
export const AdminSettingsPage: React.FC = () => { ... };
export default AdminSettingsPage;

// GOOD: Gated by SSAR
export default accessAllowedRouteHoC(verbModelAccess('list', AdminModel))(AdminSettingsPage);
```

### 2. Fail-open initialization

```typescript
// BAD: User sees privileged UI briefly
const [canEdit, setCanEdit] = useState(true);

// GOOD: Default to not-allowed until SSAR resolves
const [canEdit, loaded] = useAccessAllowed(verbModelAccess('update', Model, ns));
if (!loaded) return <Spinner />;
```

### 3. Using deprecated isAdmin for new features

```typescript
// BAD: Couples to the deprecated Redux property
const { isAdmin } = useUser();
if (isAdmin) { showAdminPanel(); }

// GOOD: Check the specific permission needed
const [canManage, loaded] = useAccessAllowed(verbModelAccess('patch', SettingsModel));
if (canManage) { showAdminPanel(); }
```

### 4. Unprotected backend mutation

```typescript
// BAD: No security wrapper
fastify.post('/api/my-resource', async (request, reply) => { ... });

// GOOD: Wrapped with secureRoute
fastify.post('/api/my-resource', secureRoute(fastify)(async (request, reply) => { ... }));
```

### 5. Unconditional admin-only data fetch

```typescript
// SUBOPTIMAL: Fetches even when user will be denied
const data = useAdminOnlyData(ns);

// BETTER: Gate the fetch behind permission
const [canAccess] = useAccessAllowed(verbModelAccess('list', AdminModel, ns));
const data = useAdminOnlyData(ns, { enabled: canAccess });
```

### 6. Missing namespace on SSAR check

```typescript
// AMBIGUOUS: Defaults to dashboard namespace — is that correct?
const [allowed] = useAccessAllowed(verbModelAccess('create', PipelineModel));

// EXPLICIT: Scoped to the project namespace
const [allowed] = useAccessAllowed(verbModelAccess('create', PipelineModel, projectNs));
```

### 7. Admin-only vs non-admin binary without finer distinction

```typescript
// OVERSIMPLIFIED: Doesn't account for dashboard admin vs cluster admin
if (isAllowed) { /* regular user path */ }
else { /* denied */ }

// BETTER: Check specific capability
const [canDeleteClusterWide] = useAccessAllowed({
  group: 'foo',
  resource: 'bars',
  verb: 'delete',
  // No namespace = cluster-scoped
});
```

## Testing RBAC Changes

- Use `DEV_IMPERSONATE_USER` / `DEV_IMPERSONATE_PASSWORD` env vars to test as different users
- Cluster admins pass all SSAR — don't only test with cluster-admin
- Create test Roles/RoleBindings per the `frontend/src/concepts/userSSAR/README.md` guide
- Verify disabled/hidden states for unprivileged users, not just happy-path admin flows
