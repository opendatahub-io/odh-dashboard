# RBAC Reference — ODH Dashboard

## User Model

The dashboard does **not** maintain internal user tiers with assumed capabilities. Every operation is gated by an explicit SSAR check against the specific K8s verb+resource.

| Concept | Meaning | Implication |
|---------|---------|-------------|
| **Cluster admin** | Has `*` verbs on all resources (cluster-wide). All SSAR pass. | Developers test with this — hides access bugs. Never assume code works because it passed in this persona. |
| **`isAdmin` (deprecated)** | Can `patch` the `auths/default-auth` singleton. Stored in Redux. | Does NOT mean the user can do anything else. Must not be used to assume capabilities. |
| **`isAllowed`** | Can `get` the `auths/default-auth` singleton. | Means "allowed to use the dashboard at all." Nothing more. |

**Core rule:** Dashboard admins and regular users must be treated identically. Both need explicit SSAR checks (`useAccessAllowed` with `verbModelAccess`) for every operation they attempt. The `isAdmin` flag is deprecated precisely because it creates a false assumption that "admins can do X" — in reality, a "dashboard admin" may lack permissions for specific resources depending on their cluster Role/RoleBindings.

**The bug pattern:** Developer tests as cluster-admin → everything works → ships code → limited user navigates to the page → GET fails with 403 → page breaks with an unhandled error or shows data the user shouldn't see in a loading flash.

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

### Legacy: Non-cached SSAR (valid but avoid for new code)

```typescript
import { useAccessReview, checkAccess } from '#~/api/useAccessReview';
```

`useAccessReview` is a **valid SSAR mechanism** — it performs the same K8s SelfSubjectAccessReview as `useAccessAllowed`. Avoid for new code because it does not use the context cache and creates duplicate requests. However, existing code using `useAccessReview` **is correctly gated** — do not flag it as missing a permission check.

### Deprecated: Redux isAdmin

```typescript
// DEPRECATED — do not use for new features
const { isAdmin } = useUser();
```

`UserState.isAdmin` only means "can patch auths/default-auth". It does NOT grant any other capability. Code that uses this to decide whether to fetch data or show UI is **wrong** — the user may be a "dashboard admin" who still lacks permission for that specific resource. Always check the actual verb+resource via SSAR.

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

### Route-level feature-flag gating (deprecated but functional)

Routes with `flags: { required: [ADMIN_USER] }` in the extension system are protected at the plugin layer — only users with the dashboard admin flag can reach them. This is a **deprecated-but-functional** mechanism: it works but should migrate to `accessAllowedRouteHoC` with a proper SSAR check. When reviewing existing code that uses this pattern, flag as **Info** (not Critical) since the route is still gated, just not via fine-grained SSAR.

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

- `secureRoute(fastify)` — Validates namespace scoping and resource ownership **only for parameterized requests** (i.e., routes with `:namespace` or resource-identifying params). Un-parameterized POST/PUT/PATCH/DELETE routes wrapped in `secureRoute` are only **logged**, not blocked — they still execute. **Caveat:** Un-parameterized mutating endpoints require stronger protection: use `secureAdminRoute`, add explicit parameterized namespace/resource validation, or perform a backend SSAR via `createSelfSubjectAccessReview`.
- `secureAdminRoute(fastify)` — Same as `secureRoute` but additionally verifies the caller is a dashboard admin before proceeding. Use for admin-owned operations (e.g., `auths/default-auth` management) and as the minimum guard for un-parameterized mutating endpoints that cannot be parameterized. Not a generic substitute for resource-specific SSAR checks.
- `createSelfSubjectAccessReview(fastify, request, attrs)` — Backend SSAR helper for fine-grained permission checks on specific verb+resource combinations.

**Location:** `backend/src/utils/route-security.ts`, `backend/src/utils/adminUtils.ts`

### Namespace validation

Routes that accept a namespace parameter (via `secureRoute`) validate it against `dashboardNamespace` and `workbenchNamespace`, rejecting other namespaces with 403. This protection only applies to parameterized requests — un-parameterized mutating endpoints are **not** automatically namespace-scoped. Those routes must use `secureAdminRoute` or add explicit namespace enforcement (e.g., hard-code the target namespace or reject requests that omit one) to prevent cross-namespace mutations.

### BFF (Go) patterns

Go BFF services in `packages/*/bff/` use middleware equivalents of the Node.js security utilities:

- `InjectRequestIdentity` — Go equivalent of `secureRoute`; extracts and validates the user's identity from the request token
- `RequireAccessToService` — Validates the user has access to the specific BFF service
- `AttachNamespace` — Go equivalent of namespace validation; binds and validates the target namespace parameter

Go BFF services must:
- Forward the user's auth token on upstream K8s API calls
- Validate namespace parameters (via `AttachNamespace`)
- Not assume the calling user is an admin
- Use `InjectRequestIdentity` on all routes that perform operations on behalf of the user

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

### 3. Using isAdmin as a capability assumption

```typescript
// BAD: Assumes "admin" means the user can manage settings — wrong!
// A dashboard admin may lack RoleBindings for SettingsModel.
const { isAdmin } = useUser();
if (isAdmin) { showAdminPanel(); }

// GOOD: Check the specific permission needed — works for any user
const [canManage, loaded] = useAccessAllowed(verbModelAccess('patch', SettingsModel));
if (!loaded) return <Spinner />;
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

### 7. No graceful degradation when access is denied

```typescript
// BAD: Fetches unconditionally; if the user lacks 'list' on bars,
// the request 403s and the page shows an unhandled error.
const data = useFetchBars(namespace);
return <BarTable data={data} />;

// GOOD: Check access first; hide/degrade if denied.
const [canList, loaded] = useAccessAllowed(verbModelAccess('list', BarModel, namespace));
if (!loaded) return <Spinner />;
if (!canList) return <EmptyState>You don't have access to view bars.</EmptyState>;
const data = useFetchBars(namespace);
return <BarTable data={data} />;
```

## Testing RBAC Changes

**The #1 rule:** Never only test with cluster-admin. Cluster-admin passes all SSAR checks, so everything appears to work even when permission gates are missing.

- Use `DEV_IMPERSONATE_USER` / `DEV_IMPERSONATE_PASSWORD` env vars to test as a limited user
- Create minimal Roles/RoleBindings per the `frontend/src/concepts/userSSAR/README.md` guide — grant only the permissions the feature explicitly needs
- Verify: navigate to the page as a user who **lacks** the required permission. Does the page degrade gracefully (empty state, hidden nav item, disabled button)? Or does it crash / show a raw 403 error?
- Test the "just-allowed" case too: user has exactly the permissions needed, nothing more
