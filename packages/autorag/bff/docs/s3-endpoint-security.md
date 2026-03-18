# S3 Endpoint Security - SSRF Protection

## Overview

The AutoRAG BFF implements comprehensive Server-Side Request Forgery (SSRF) protection for S3 endpoint URLs to prevent attacks targeting internal resources. This document describes the security validations applied to S3 connections.

## Affected Endpoints

The following API endpoints use S3 credentials and are protected:

- **GET** `/api/v1/s3/file` - Download files from S3

This endpoint retrieves S3 credentials from Kubernetes secrets and validates the `AWS_S3_ENDPOINT` value before use.

## Security Validations

### 1. HTTPS Enforcement

**Requirement**: All S3 endpoint URLs MUST use the HTTPS scheme.

**Rejected**:
- `http://s3.amazonaws.com` ❌

**Accepted**:
- `https://s3.amazonaws.com` ✅
- `https://s3.us-east-1.amazonaws.com` ✅
- `https://minio.example.com:9000` ✅

**Error Message**: `endpoint URL must use HTTPS scheme, got: http`

### 2. Private IP Range Blocking (RFC-1918)

**Blocked Ranges**:
- `10.0.0.0/8`
- `172.16.0.0/12`
- `192.168.0.0/16`

**Rejected**:
- `https://10.0.0.1:9000` ❌
- `https://172.16.0.1:9000` ❌
- `https://192.168.1.1:9000` ❌

**Error Message**: `endpoint IP <ip> is in blocked RFC-1918 private range (<range>)`

### 3. Loopback Address Blocking

**Blocked Range**: `127.0.0.0/8`

**Rejected**:
- `https://127.0.0.1:9000` ❌
- `https://localhost:9000` (resolves to 127.0.0.1) ❌

**Error Message**: `endpoint IP <ip> is in blocked loopback range (127.0.0.0/8)`

### 4. Link-Local Address Blocking

**Blocked Range**: `169.254.0.0/16` (including AWS metadata service)

**Rejected**:
- `https://169.254.169.254` ❌ (AWS metadata service)
- `https://169.254.0.1` ❌

**Error Message**: `endpoint IP <ip> is in blocked link-local range (169.254.0.0/16)`

### 5. IPv6 Private Range Blocking

**Blocked Ranges**:
- `::1/128` (IPv6 loopback)
- `fe80::/10` (IPv6 link-local)
- `fc00::/7` (IPv6 unique local addresses)

**Rejected**:
- `https://[::1]:9000` ❌
- `https://[fe80::1]:9000` ❌
- `https://[fc00::1]:9000` ❌

**Error Message**: `endpoint IP <ip> is in blocked <description>`

### 6. URL Format Validation

**Requirements**:
- Must be a valid URL format
- Must include a hostname

**Rejected**:
- `not-a-url` ❌
- `https://` ❌ (missing hostname)

**Error Message**: `invalid endpoint URL format: <error>`

### 7. DNS Resolution Validation

When a hostname is provided (not an IP address), the endpoint validator:

1. **Resolves the hostname** to its IP addresses using `net.LookupIP`
2. **Validates all resolved IPs** against the blocked ranges
3. **Rejects unresolvable hostnames by default** to prevent DNS rebinding/TOCTOU attacks
4. **Revalidates on every request** to prevent DNS rebinding attacks

**Example**:
```
Hostname: minio.example.com
Resolves to: 192.168.1.10
Result: ❌ Blocked - resolves to private IP
```

**Error Message**: `endpoint hostname '<hostname>' resolves to blocked IP <ip>: <error>`

#### Production Mode (Default)

By default, unresolvable hostnames are **rejected** as a security measure:

```
Error: endpoint hostname 'unknown.example.com' cannot be resolved: <error> (this may indicate a DNS rebinding attempt or misconfiguration)
```

This fail-closed approach prevents:
- **DNS rebinding attacks**: where a hostname resolves to a public IP at validation time but is changed to point to a private IP before the actual S3 connection
- **TOCTOU vulnerabilities**: Time-of-check to time-of-use race conditions in DNS resolution

#### Non-Production/Testing Mode

For testing or development environments where DNS resolution may differ between validation and runtime, you can enable permissive mode by setting:

```bash
ALLOW_UNRESOLVED_S3_ENDPOINTS=true
```

When enabled, unresolvable hostnames are **allowed with a warning**:

```
Warning: Unable to resolve S3 endpoint hostname, allowing it to proceed (ALLOW_UNRESOLVED_S3_ENDPOINTS=true)
```

⚠️ **Security Warning**: This should only be used in non-production environments. Production deployments should use resolvable hostnames or direct IP addresses.

#### Revalidation at Connection Time

To protect against DNS rebinding attacks where a hostname's IP address changes between credential validation and the actual S3 connection, the endpoint is **revalidated on every S3 operation**:

- The `GetS3Credentials` function validates the endpoint when credentials are first retrieved
- The `GetS3Object` function revalidates the endpoint immediately before establishing the S3 connection

This ensures that even if a hostname's DNS record is changed maliciously between these two operations, the blocked IP ranges are checked again at connection time, preventing TOCTOU vulnerabilities.

### Mock S3 Client Production Guard

The mock S3 client (`MockS3Repository`) intentionally skips SSRF validation for testing purposes. To prevent accidental use in production:

**Production Guard**: The server validates during startup that `MockS3Client` can only be enabled when running in development mode (`-dev-mode` flag). Attempting to enable `MockS3Client` without `-dev-mode` will cause the server to abort with an error:

```
mock-s3-client can only be enabled in development mode (set -dev-mode flag)
```

This ensures that SSRF protections cannot be bypassed in production deployments, while still allowing tests to use the mock implementation.

## Implementation Details

### Validation Function

The validation is implemented in `internal/repositories/s3.go`:

```go
// validateAndNormalizeEndpoint validates the S3 endpoint URL to prevent SSRF attacks.
// It ensures the URL uses HTTPS, is properly formatted, and does not target private IP ranges.
// Returns the normalized URL string or an error if validation fails.
func validateAndNormalizeEndpoint(endpoint string) (string, error)

// validateIPAddress checks if an IP address is in a blocked range (private or link-local).
// Returns an error if the IP is blocked, nil otherwise.
func validateIPAddress(ip net.IP) error
```

### Where Validation Occurs

The validation is applied at multiple points for defense in depth:

1. **`GetS3Credentials()`** in `s3.go`
   - Called when retrieving credentials from Kubernetes secrets
   - Validates and normalizes the `AWS_S3_ENDPOINT` value
   - Returns error if endpoint is invalid

2. **`GetS3Object()`** in `s3.go`
   - Revalidates the endpoint before each S3 download operation
   - Protects against DNS rebinding attacks
   - Returns error if endpoint validation fails

3. **`GetS3Credentials()`** in `s3_mock.go`
   - Mock implementation skips SSRF validation
   - Stores endpoint as-is for test fixtures
   - Tests can verify validation in the real implementation

### Error Handling

When validation fails, the error is wrapped with context:

**At secret retrieval**:
```
secret '<secret-name>' has invalid AWS_S3_ENDPOINT: <validation-error>
```

**At per-request validation**:
```
endpoint validation failed: <validation-error>
```

This provides clear feedback about which secret has an invalid endpoint and what the specific validation failure is. Per-request validation ensures endpoints are revalidated even if DNS records change after initial secret validation.

## Secret Requirements

For a Kubernetes secret to be used with S3 endpoints, it must contain:

### Required Fields

| Field | Description | Example |
|-------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | S3 access key | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | S3 secret key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_DEFAULT_REGION` | AWS region | `us-east-1` |
| `AWS_S3_ENDPOINT` | S3 endpoint URL | `https://s3.amazonaws.com` |

### Optional Fields

| Field | Description | Example |
|-------|-------------|---------|
| `AWS_S3_BUCKET` | Default bucket name | `my-training-data` |

**Note**: Field names are case-insensitive (`AWS_S3_ENDPOINT` = `aws_s3_endpoint`)

## Valid Endpoint Examples

### AWS S3
```
https://s3.amazonaws.com
https://s3.us-east-1.amazonaws.com
https://s3-us-west-2.amazonaws.com
```

### S3-Compatible Services (Public Hostnames)
```
https://minio.example.com:9000
https://storage.company.com
https://objects.cloud-provider.com
```

### Important Notes

- ✅ **Always use HTTPS** - HTTP endpoints are rejected
- ✅ **Use externally resolvable hostnames** - Hostnames that resolve to public IPs or use secure access patterns (VPN, VPC peering, Private Link, Service Mesh)
- ✅ **Include port if non-standard** - e.g., `:9000` for MinIO
- ⚠️ **Private IPs are blocked by SSRF protection** - For internal MinIO/S3 services, use Service Mesh/Network Policies, VPN, VPC peering, Private Link, or a secured API gateway (see Migration Guide)
- ❌ **Never use localhost or loopback addresses** - These are always blocked

## Security Rationale

### SSRF Attack Prevention

SSRF attacks allow attackers to make requests to internal resources by manipulating URLs. Common targets include:

1. **AWS Metadata Service** (`169.254.169.254`)
   - Exposes IAM credentials and other sensitive data
   - Blocked by link-local range validation

2. **Internal Services** (RFC-1918 private IPs)
   - Internal APIs, databases, admin panels
   - Blocked by private IP range validation

3. **Localhost Services** (`127.0.0.1`)
   - Services running on the same host
   - Blocked by loopback range validation

### Defense in Depth

The validation implements multiple layers of protection:

1. **Scheme validation** - Prevents downgrade attacks via HTTP
2. **IP range blocking** - Prevents targeting internal resources
3. **DNS resolution validation** - Prevents DNS rebinding attacks
4. **URL format validation** - Prevents malformed URL exploits

## Testing

Comprehensive tests verify the SSRF protection:

```bash
go test -v ./internal/api -run TestS3Repository_GetS3Credentials
```

### Test Coverage

- ✅ HTTP scheme rejection
- ✅ Private IP blocking (all RFC-1918 ranges)
- ✅ Loopback address blocking
- ✅ Link-local address blocking
- ✅ Invalid URL format rejection
- ✅ Valid HTTPS URL acceptance

All tests are located in `internal/api/s3_handler_test.go`.

## Troubleshooting

### "endpoint URL must use HTTPS scheme"

**Problem**: Secret contains HTTP URL instead of HTTPS.

**Solution**: Update the secret's `AWS_S3_ENDPOINT` to use `https://`:

```bash
kubectl patch secret my-s3-secret -n my-namespace \
  --type='json' -p='[{"op": "replace", "path": "/data/AWS_S3_ENDPOINT", "value":"'$(echo -n "https://s3.amazonaws.com" | base64)'"}]'
```

### "endpoint IP is in blocked RFC-1918 private range"

**Problem**: Endpoint uses a private IP address.

**Solution**: Do NOT expose internal S3 services publicly. Instead, implement secure access:
- **For cluster-internal services**: Use Service Mesh or Network Policies to allow BFF pods to access specific internal S3 endpoints
- **For external services**: Use VPN, VPC peering, or Private Link for secure connectivity
- **If a gateway is required**: Deploy a secured API gateway/bastion with strict authentication, IP allowlists, TLS, and RBAC
- See Migration Guide for detailed alternatives

### "endpoint hostname resolves to blocked IP"

**Problem**: Hostname resolves to a private/blocked IP address.

**Solution**: The hostname DNS record points to an internal IP. Use secure access patterns:
- **For cluster-internal services**: Configure Service Mesh or Network Policies to allow BFF pods to access the internal S3 service
- **For external services**: Implement VPN, VPC peering, or Private Link (AWS PrivateLink, Azure Private Link) for secure private connectivity
- **If a gateway is required**: Deploy a secured API gateway/bastion with:
  - Strong authentication (mutual TLS, OAuth2, API keys)
  - IP allowlists restricting access to known clients
  - TLS encryption and credential rotation
  - RBAC and request validation
- See Migration Guide for detailed secure alternatives

### "invalid endpoint URL format"

**Problem**: Malformed URL in the secret.

**Solution**: Ensure the URL is properly formatted:
- Include scheme: `https://`
- Include hostname: `s3.amazonaws.com`
- Include port if needed: `:9000`

## Migration Guide

If you have existing secrets with endpoints that are now blocked:

1. **Internal MinIO/S3 Services**:

   ⚠️ **Do not expose internal services publicly to bypass SSRF protection.**

   Instead, use one of these safer alternatives:

   - **Service Mesh / Network Policy Exceptions** (Recommended for production):
     - Configure service mesh or network policies to allow BFF pods to access specific internal S3 endpoints
     - Maintain SSRF protection while allowing trusted cluster-internal communication
     - Example: Create NetworkPolicy allowing traffic from autorag-bff namespace to minio-service namespace

   - **Cluster-Local Validation Mode** (If implementing custom validation):
     - Add an opt-in flag to allow RFC-1918 addresses only for specific namespaces
     - Require additional validation (e.g., TLS certificate verification, namespace-scoped allowlists)
     - Document the security trade-offs clearly

   - **Known Limitation** (Current state):
     - Cluster-internal S3 services using private IPs are blocked by design
     - This is an intentional security measure to prevent SSRF attacks
     - For cluster-internal deployments, this represents a trade-off between SSRF protection and internal service accessibility
     - Consider using external object storage or implementing one of the safer alternatives above

2. **AWS S3**:
   - Should already use `https://` and public endpoints
   - No changes needed

3. **Testing/Development**:
   - **Recommended**: Use public cloud storage services (AWS S3, Google Cloud Storage, Azure Blob Storage)
   - **For internal testing**: Use VPN or port forwarding to securely access internal MinIO instances, or configure Service Mesh for cluster-internal access
   - **Never** deploy MinIO with unrestricted public access - always enforce authentication, TLS, and network controls
   - Avoid localhost/private IP configurations in production secrets
