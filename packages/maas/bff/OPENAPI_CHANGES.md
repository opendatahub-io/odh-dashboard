# BFF OpenAPI Changes

Summary of changes made to `packages/maas/bff/openapi.yaml` to align with the upstream `maas-api/openapi3.yaml`.

## Endpoints

| Change | Old BFF | New BFF (matches upstream) |
|--------|---------|---------------------------|
| **Models response** | `{data: [...]}` wrapper | `ModelListResponse` with `object` + `data` fields |
| **Tier lookup** | Full CRUD (`GET /tiers`, `POST /tier`, `GET/PUT/DELETE /tier/{name}`) | `POST /api/v1/tiers/lookup` with group-based lookup |
| **Create API key** | `POST /api/v1/api-key` | `POST /api/v1/api-keys` with `name` (required), `description`, `expiresIn` |
| **List API keys** | `GET /api/v1/api-keys` | `POST /api/v1/api-keys/search` with filters, sort, pagination |
| **Delete all keys** | `DELETE /api/v1/api-keys` | `POST /api/v1/api-keys/bulk-revoke` (revoke by username) |
| **Get API key** | `GET /api/v1/api-key/{id}` | `GET /api/v1/api-keys/{id}` |
| **Revoke API key** | (none) | `DELETE /api/v1/api-keys/{id}` (revoke, not hard delete) |

## Schemas

| Change | Old BFF | New BFF (matches upstream) |
|--------|---------|---------------------------|
| **HealthCheck** | `status` + `system_info` | `HealthResponse` with `status` only |
| **Model** | Same fields | Same + added `required` and `example` |
| **ModelListResponse** | (none) | New schema with `object` + `data` |
| **Tier schemas** | `Tier`, `TierLimits`, `RateLimit` | `TierLookupRequest`, `TierLookupResponse`, `TierErrorResponse` |
| **APIKeyMetadata** | `id`, `name`, `description`, `creationDate`, `expirationDate`, `status` (active/expired), `expiredAt` | `ApiKey` with `id`, `name`, `description`, `username`, `groups`, `creationDate`, `expirationDate`, `status` (active/revoked/expired), `lastUsedAt` |
| **APIKeyRequest** | `expiration`, `name`, `description` | Inline: `name` (required), `description`, `expiresIn` |
| **APIKeyResponse** | `token`, `expiration`, `expiresAt`, `jti`, `name`, `description` | Inline: `key`, `keyPrefix`, `id`, `name`, `createdAt`, `expiresAt` |
| **ApiKeyListResponse** | (none) | New schema with `object`, `data`, `has_more` |
| **ErrorResponse** | (none) | New schema for error responses |
