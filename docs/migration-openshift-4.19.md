# Migration Guide: OpenShift 4.19+ BYO OIDC Support

**Version**: 3.0  
**Date**: October 2025  
**Affects**: OpenShift Dashboard Backend & Frontend

---

## Overview

This guide explains the changes made to support OpenShift Console 4.19+ with Bring Your Own OIDC (BYO OIDC) authentication providers. The main changes affect user authentication, authorization, and workbench routing.

## What Changed

### 1. Authentication Proxy

**Before (≤4.18)**:

- OAuth Proxy handled authentication
- Injected `x-forwarded-access-token` header
- User API always available

**After (≥4.19 with BYO OIDC)**:

- Kube-RBAC-Proxy handles authentication with Envoy filter
- Injects `x-auth-request-user` and `x-auth-request-groups` headers
- Envoy Lua filter transforms `x-auth-request-access-token` to `x-forwarded-access-token` (backward compatible)
- User API may not be available
- Group API may not be available

**Envoy Filter Configuration**:

```lua
function envoy_on_request(request_handle)
  local access_token = request_handle:headers():get("x-auth-request-access-token")
  if access_token then
    request_handle:headers():add("x-forwarded-access-token", access_token)
    request_handle:headers():add("authorization", "Bearer " .. access_token)
  end
end
```

This ensures that the `x-forwarded-access-token` header remains available for backward compatibility and API calls.

### 2. User Identity Extraction

The backend now uses a multi-strategy fallback approach with token support:

```typescript
// Strategy 1: Try kube-rbac-proxy headers (primary)
const userHeader = request.headers['x-auth-request-user'];

// Strategy 2: Try User API with token (backward compatibility)
const accessToken = request.headers['x-forwarded-access-token'];
const user = await getUser(fastify, request);

// Strategy 3: Try SelfSubjectReview with token (Kubernetes standard)
const username = await getUsernameFromSelfSubjectReview(fastify, accessToken);

// Strategy 4: Parse JWT token (fallback when APIs unavailable)
const username = extractUsernameFromJWT(accessToken);

// Strategy 5: Dev mode (local development)
const username = 'dashboard-sa';
```

**Key Points**:

- The `x-forwarded-access-token` header is preserved by the Envoy filter
- User API and SelfSubjectReview both use this token to make authenticated calls
- SelfSubjectReview is equivalent to `kubectl auth whoami`
- JWT parsing is a last resort when API calls fail

### 3. Authorization Checks

**Before**:

- Used Group API to check admin/cluster-admin membership
- Required `group.user.openshift.io` API

**After**:

- Uses SelfSubjectAccessReview (SSAR) on Auth resource
- Works without Group API
- More flexible and future-proof

### 4. Workbench Routing

**Before**:

- Each workbench had individual OpenShift Route
- Frontend fetched route via `/api/route/{namespace}/{name}`
- Route polling with retry logic
- Complex error handling

**After**:

- Workbenches share Gateway route with Dashboard
- Frontend generates same-origin paths: `/notebook/{namespace}/{name}`
- No backend calls needed
- Instant link generation

## Compatibility Matrix

| Environment | Token Available | User API | Group API | Auth Strategy | Status |
|-------------|----------------|----------|-----------|---------------|--------|
| **Traditional OpenShift** | ✅ | ✅ | ✅ | Headers → User API | ✅ Supported |
| **BYO OIDC (4.19+)** | ✅ | ❌ | ❌ | Headers → SelfSubjectReview → JWT | ✅ Supported |
| **Dev-Sandbox** | ✅ | ✅ | ✅ | User API (annotations) | ✅ Supported |
| **Local Dev** | Varies | Varies | Varies | Dev mode | ✅ Supported |

**Note**: The `x-forwarded-access-token` header is available in all environments through the Envoy filter configuration.

## Required Infrastructure Changes

### 1. Operator Configuration

The operator must configure kube-rbac-proxy as the authentication sidecar:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: odh-dashboard
spec:
  template:
    spec:
      containers:
        - name: kube-rbac-proxy
          image: quay.io/openshift/kube-rbac-proxy:latest
          args:
            - --upstream=http://127.0.0.1:8080/
            - --auth-header-fields-enabled=true
            - --auth-header-user-enabled=true
            - --auth-header-groups-enabled=true
```

### 2. Gateway Configuration

Workbenches must be accessible through shared Gateway:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: notebook-gateway
spec:
  parentRefs:
    - name: dashboard-gateway
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /notebook/
      backendRefs:
        - name: workbench-service
          port: 8080
```

### 3. Service Account Permissions

The Dashboard service account needs SSAR permissions:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: odh-dashboard
rules:
  - apiGroups: ["authorization.k8s.io"]
    resources: ["selfsubjectaccessreviews"]
    verbs: ["create"]
```

## Code Migration Examples

### Frontend: Workbench Links

**Before (v2.x)**:

```typescript
import useRouteForNotebook from '#~/concepts/notebooks/apiHooks/useRouteForNotebook';

const { data: notebookLink, error } = useRouteForNotebook(
  notebookName,
  namespace,
  isRunning,
  FAST_POLL_INTERVAL,
);

<Button href={notebookLink}>Open Workbench</Button>
```

**After (v3.0)**:

```typescript
import { getRoutePathForWorkbench } from '#~/utilities/notebookControllerUtils';

const notebookLink = getRoutePathForWorkbench(namespace, notebookName);

<Button href={notebookLink}>Open Workbench</Button>
```

### Backend: User Information

**Before (v2.x)**:

```typescript
// Always relied on User API
const user = await getUser(fastify, request);
const username = user.metadata.name;
```

**After (v3.0)**:

```typescript
// Multi-strategy with fallbacks
const { userName } = await getUserInfo(fastify, request);
// Automatically tries: headers → User API → JWT → dev mode
```

### Backend: Admin Check

**Before (v2.x)**:

```typescript
// Used Group API
const groups = await getUserGroups(fastify, username);
const isAdmin = groups.some(g => 
  g.metadata.name === 'rhods-admins' || 
  g.metadata.name === 'cluster-admins'
);
```

**After (v3.0)**:

```typescript
// Uses SSAR
const isAdmin = await isUserAdmin(fastify, request);
// Checks create permission on Auth resource
```

## Testing Your Migration

### 1. Traditional OpenShift Cluster

```bash
# Should use User API strategy
# Check logs for: "Got username from User API"
oc logs -n opendatahub deployment/odh-dashboard | grep "User API"
```

### 2. BYO OIDC Cluster

```bash
# Should use kube-rbac-proxy headers or JWT strategy
# Check logs for: "Got username from kube-rbac-proxy header" or "Got username from JWT"
oc logs -n opendatahub deployment/odh-dashboard | grep -E "kube-rbac-proxy|JWT"
```

### 3. Workbench Access

```bash
# Access workbench via Dashboard
curl https://dashboard.example.com/notebook/my-project/my-workbench

# Should return 200 or redirect to login
# Should NOT return 404
```

### 4. Admin Screens

```bash
# Log in as admin user
# Navigate to "Settings" → "User Management"
# Should see list of users with notebooks
# Should NOT see Group API errors in browser console
```

## Troubleshooting

### User Authentication Issues

**Symptom**: "Unable to determine user" error

**Diagnosis**:

```bash
# Check kube-rbac-proxy logs
oc logs -n opendatahub deployment/odh-dashboard -c kube-rbac-proxy

# Check Dashboard backend logs
oc logs -n opendatahub deployment/odh-dashboard -c odh-dashboard | grep getUserInfo
```

**Solutions**:

1. Verify kube-rbac-proxy is configured correctly
2. Check that JWT tokens are being passed
3. Verify User API is accessible (if in traditional cluster)

### Admin Screen Empty

**Symptom**: Admin screens show no users

**Diagnosis**:

```bash
# Check for SSAR permissions
oc auth can-i create selfsubjectaccessreviews.authorization.k8s.io \
  --as=system:serviceaccount:opendatahub:dashboard-sa

# Should return "yes"
```

**Solutions**:

1. Add SSAR permissions to Dashboard service account
2. Verify notebooks have proper labels
3. Check notebook namespace accessibility

### Workbench Link 404

**Symptom**: Clicking workbench link returns 404

**Diagnosis**:

```bash
# Check Gateway configuration
oc get httproute notebook-gateway -n opendatahub -o yaml

# Check workbench service
oc get svc -n my-project | grep workbench
```

**Solutions**:

1. Verify Gateway HTTPRoute is configured
2. Check workbench service exists
3. Ensure Dashboard and workbench share gateway

### JWT Parsing Failures

**Symptom**: "Failed to extract username from JWT" errors

**Diagnosis**:

```bash
# Check JWT token format
oc logs -n opendatahub deployment/odh-dashboard | grep "JWT.*failed"
```

**Solutions**:

1. Verify OIDC provider issues standard JWT claims
2. Check that kube-rbac-proxy validates tokens correctly
3. Ensure tokens include one of: `preferred_username`, `username`, `sub`, or `email`

## Breaking Changes

### Removed APIs

- ❌ `GET /api/route/:namespace/:name` - Use client-side path generation
- ❌ Backend no longer returns `notebookLink` in notebook status

### Deprecated Features

- ⚠️ `useRouteForNotebook` hook - Use `getRoutePathForWorkbench` utility
- ⚠️ Route polling logic - No longer needed

### Type Changes

```typescript
// REMOVED from NotebookRunningState
type NotebookRunningState = {
  notebook: Notebook | null;
  isRunning: boolean;
  podUID: string;
  // notebookLink: string; // ❌ REMOVED
};

// REMOVED from backend types.ts
// type Route = { ... }; // ❌ REMOVED
```

## Rollback Plan

If issues occur in production:

### Quick Rollback

```bash
# Revert to previous version
oc rollout undo deployment/odh-dashboard -n opendatahub

# Or specific revision
oc rollout undo deployment/odh-dashboard -n opendatahub --to-revision=N
```

### Partial Rollback

If only user auth is problematic, you can revert just `userUtils.ts`:

```bash
git checkout HEAD~1 -- backend/src/utils/userUtils.ts
npm run build
# Redeploy
```

## Support

For issues or questions:

- **GitHub Issues**: [opendatahub-io/odh-dashboard](https://github.com/opendatahub-io/odh-dashboard/issues)
- **JIRA**: [RHOAIENG-35298](https://issues.redhat.com/browse/RHOAIENG-35298)
- **Slack**: #forum-open-data-hub

## Related Documentation

- [Architecture Documentation](./architecture.md) - Updated authentication flow
- [RFC Document](../RFC/RFC.md) - Complete technical specification
- [Implementation Summary](../RFC/IMPLEMENTATION_SUMMARY.md) - Quick reference guide
- [Code Changes](../RFC/CODE_CHANGES.md) - Detailed change tracker

---

**Last Updated**: October 15, 2025  
**Version**: 3.0  
**Status**: ✅ Complete
