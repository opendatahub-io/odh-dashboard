# S3 Endpoint Security - SSRF Protection

## Overview

The AutoML BFF implements comprehensive Server-Side Request Forgery (SSRF) protection for S3 endpoint URLs to prevent attacks targeting internal resources. This document describes the security validations applied to S3 connections.

## Affected Endpoints

The following API endpoints use S3 credentials and are protected:

- **GET** `/api/v1/s3/file` - Download files from S3
- **GET** `/api/v1/s3/file/schema` - Get CSV file schema from S3

Both endpoints retrieve S3 credentials from Kubernetes secrets and validate the `AWS_S3_ENDPOINT` value before use.

## Security Validations

### 1. HTTPS Enforcement

**Requirement**: External S3 endpoint URLs MUST use HTTPS. Plain HTTP is permitted only
for suffix-qualified Kubernetes service endpoints:
`<service>.<namespace>.svc` and `<service>.<namespace>.svc.cluster.local`.

**Rejected**:
- `http://s3.amazonaws.com` ❌
- `http://minio.example.com:9000` ❌

**Accepted**:
- `https://s3.amazonaws.com` ✅
- `https://s3.us-east-1.amazonaws.com` ✅
- `https://minio.example.com:9000` ✅
- `http://minio.minio.svc:9000` ✅ (all resolved addresses must be private/shared)
- `http://minio.minio.svc.cluster.local:9000` ✅

**Error Message**: `endpoint URL must use HTTPS scheme for external endpoints, got: http`

### 2. Address and Destination Validation

RFC-1918 private ranges and RFC-6598 shared address space are allowed because
cluster-local S3-compatible services commonly use them. For suffix-qualified HTTP
service names, every DNS result must be private or RFC-6598 shared before a connection
is attempted. Public results are rejected.

Unsafe ranges are rejected for all endpoints, including loopback, link-local,
multicast, unspecified, and reserved addresses.

**Error Message**: `endpoint IP <ip> is in blocked <range>`

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

### 5. IPv6 Address Validation

**Blocked Ranges**:
- `::1/128` (IPv6 loopback)
- `fe80::/10` (IPv6 link-local)
- IPv6 unique-local addresses may be used for cluster-local endpoints

**Rejected**:
- `https://[::1]:9000` ❌
- `https://[fe80::1]:9000` ❌
- `http://[fc00::1]:9000` ❌ (not a suffix-qualified service hostname)

**Error Message**: `endpoint IP <ip> is in blocked <description>`

### 6. URL Format Validation

**Requirements**:
- Must be a valid URL format
- Must include a hostname

**Rejected**:
- `not-a-url` ❌
- `https://` ❌ (missing hostname)

**Error Message**: `invalid endpoint URL format: <error>`

### 7. DNS Resolution and Dial-Time Validation

When a hostname is provided (not an IP address), the endpoint validator and transport:

1. Validate the URL syntax and scheme before constructing the client
2. **Resolve the hostname** to its IP addresses at dial time
3. **Validate all resolved IPs** against the blocked ranges
4. Require private/shared results for suffix-qualified HTTP service names
5. Dial the validated addresses directly to avoid a DNS check/use race
6. **Reject unresolvable hostnames** by default (fail-closed)

**Example**:
```
Hostname: minio.example.com
Resolves to: 169.254.1.10
Result: ❌ Blocked - resolves to link-local IP
```

**Error Messages**:
- `endpoint hostname '<hostname>' resolves to blocked IP <ip>: <error>`
- `endpoint hostname '<hostname>' cannot be resolved: <error> (this may indicate a DNS rebinding attempt or misconfiguration)`

A successful DNS lookup that returns no addresses is also rejected with
`endpoint hostname '<hostname>' resolved to no IP addresses`. The unresolved-host opt-out
does not bypass this empty-result check.

**Production Mode (Default)**: If a hostname cannot be resolved at dial time, the
connection fails closed and the request is rejected:
```
Production mode: treat DNS resolution failure as a security error
```

**Testing/Development Mode**: Set the environment variable
`ALLOW_UNRESOLVED_S3_ENDPOINTS=true` to permit unresolvable general endpoints. This
setting never bypasses resolution for suffix-qualified HTTP service names, because their
private destination cannot otherwise be verified. The BFF emits a startup security
warning when this opt-out is enabled in development mode.

**⚠️ Security Warning**: The `ALLOW_UNRESOLVED_S3_ENDPOINTS` environment variable should **NEVER** be enabled in production environments. It exists solely for testing scenarios where DNS may not be available during development.

This fail-closed approach ensures that DNS resolution failures do not bypass SSRF protection by default. The transport validates the addresses returned for each connection to protect against DNS rebinding attacks.

### Operational Timeouts

- DNS resolution and all connection attempts for one endpoint share a 10-second budget
- TLS handshakes are limited to 10 seconds
- S3 response headers are limited to 30 seconds
- Metadata operations are limited to 15 seconds
- Streaming uploads and downloads have no blanket client deadline; request context cancellation still applies

### Mock S3 Client Production Guard

The mock S3 client (`MockS3Repository`) intentionally skips SSRF validation for testing purposes. To prevent accidental use in production:

**Production Guard**: The server validates during startup that `MockS3Client` can only be enabled when running in development mode (`-dev-mode` flag). Attempting to enable `MockS3Client` without `-dev-mode` will cause the server to abort with an error:

```
mock-s3-client can only be enabled in development mode (set -dev-mode flag)
```

This ensures that SSRF protections cannot be bypassed in production deployments, while still allowing tests to use the mock implementation.

## Implementation Details

### Validation Functions

The validation is implemented in the shared `autox-core` S3 service:

```go
// validateAndNormalizeEndpoint validates the URL and external/internal scheme policy.
func (p *awsClientProvider) validateAndNormalizeEndpoint(endpoint string) (string, error)

// ssrfSafeDialContext validates resolved addresses immediately before dialing.
func ssrfSafeDialContext(...)
```

### Where Validation Occurs

The BFF resolves credentials from Kubernetes and passes the endpoint to the shared S3
service. The real client validates URL syntax and scheme before construction, then its
transport resolves and validates destination addresses immediately before dialing.
Suffix-qualified HTTP service names require private/shared results at this second boundary.
The mock implementation skips SSRF validation and is restricted to development/tests.

### Error Handling

Repository errors identify missing or malformed credential fields. Endpoint validation
errors are returned when the real S3 client is constructed:

```
endpoint validation failed: <validation-error>
```

The transport then validates DNS results and IP destinations immediately before dialing,
so a changed DNS result cannot bypass the endpoint policy.

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
| `AWS_S3_UPLOAD_CHECKSUM_ALGORITHM` | Optional explicit upload checksum algorithm | `CRC32` |
| `AWS_S3_DISABLE_UPLOAD_CHECKSUM_TRAILERS` | Disable optional streaming checksum trailers | `true` |

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

### S3-Compatible Services (Cluster-Local)
```
http://minio.minio.svc:9000
http://minio.minio.svc.cluster.local:9000
```

### Important Notes

- ✅ **Use HTTPS for external endpoints** - HTTP is accepted only for suffix-qualified Kubernetes service names
- ✅ **Use suffix-qualified service names for cluster-local HTTP** - Suffix-qualified HTTP requires private/shared DNS results
- ✅ **Use externally resolvable hostnames for external services** - Hostnames should resolve to public IPs or use secure access patterns (VPN, VPC peering, Private Link, Service Mesh)
- ✅ **Include port if non-standard** - e.g., `:9000` for MinIO
- ⚠️ **Unsafe IPs are blocked by SSRF protection** - Cluster-local S3 services must use suffix-qualified service names and private/shared destinations
- ❌ **Never use localhost or loopback addresses** - These are always blocked

## Security Rationale

### SSRF Attack Prevention

SSRF attacks allow attackers to make requests to internal resources by manipulating URLs. Common targets include:

1. **AWS Metadata Service** (`169.254.169.254`)
   - Exposes IAM credentials and other sensitive data
   - Blocked by link-local range validation

2. **Internal Services** (unsafe or unexpected destinations)
   - Internal APIs, databases, admin panels
   - Suffix-qualified HTTP is limited to private/shared service destinations; unsafe ranges are blocked

3. **Localhost Services** (`127.0.0.1`)
   - Services running on the same host
   - Blocked by loopback range validation

### Defense in Depth

The validation implements multiple layers of protection:

1. **Scheme validation** - Requires HTTPS externally and limits HTTP to recognized service names
2. **IP range and destination validation** - Blocks unsafe ranges and constrains suffix-qualified HTTP destinations
3. **DNS resolution validation** - Prevents DNS rebinding attacks
4. **URL format validation** - Prevents malformed URL exploits

## Testing

Comprehensive tests verify the SSRF protection:

```bash
cd packages/autox-core/services && go test -v ./s3 -run 'Test(IsInternalHost|ValidateAndNormalizeEndpoint|ValidateResolvedIPs|SSRFSafeDialContext)'
```

### Test Coverage

- ✅ HTTP scheme rejection
- ✅ Suffix-qualified Kubernetes HTTP service acceptance
- ✅ Public and unresolved destination rejection for suffix-qualified HTTP
- ✅ Unsafe IP range blocking
- ✅ RFC-6598 shared-address acceptance for cluster-local HTTP
- ✅ Loopback address blocking
- ✅ Link-local address blocking
- ✅ Invalid URL format rejection
- ✅ Valid HTTPS URL acceptance

Validator tests are located in `packages/autox-core/services/s3/*_test.go`.

## Troubleshooting

### "The S3 endpoint rejected the upload's streaming checksum trailer."

**Problem**: The endpoint returned `400 InvalidArgument` because it does not support streaming checksum trailers. This can occur with affected NetApp ONTAP versions.

**Solution**: Set `AWS_S3_DISABLE_UPLOAD_CHECKSUM_TRAILERS=true` on the data connection Secret. If the Secret has `AWS_S3_UPLOAD_CHECKSUM_ALGORITHM`, remove it first because the two settings cannot be combined. Disabling optional trailers does not disable checksums required by the S3 operation.

### "endpoint URL must use HTTPS scheme for external endpoints"

**Problem**: Secret contains an HTTP URL for an external or ambiguous hostname.

**Solution**: Use `https://` for external endpoints. For cluster-local HTTP, use a
suffix-qualified service hostname such as `http://minio.minio.svc:9000`.

```bash
kubectl patch secret my-s3-secret -n my-namespace \
  --type='json' -p='[{"op": "replace", "path": "/data/AWS_S3_ENDPOINT", "value":"'$(echo -n "https://s3.amazonaws.com" | base64)'"}]'
```

### "endpoint IP is in a blocked range"

**Problem**: Endpoint uses a loopback, link-local, multicast, unspecified, or reserved IP address.

**Solution**: Use a valid suffix-qualified service hostname for cluster-local S3, or
use HTTPS for an external service. Never use localhost, metadata, or other blocked ranges.

### "endpoint hostname resolves to blocked IP"

**Problem**: Hostname resolves to a blocked IP, or a suffix-qualified HTTP service hostname resolves to a public IP.

**Solution**: The hostname DNS record points to an internal IP. Use secure access patterns:
- **For cluster-internal services**: Use `service.namespace.svc` or
  `service.namespace.svc.cluster.local`, and ensure DNS resolves to private/shared addresses
- **For external services**: Use HTTPS and secure access patterns such as VPN, VPC peering, or Private Link

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
     - Example: Create NetworkPolicy allowing traffic from automl-bff namespace to minio-service namespace

   - **Cluster-Local Validation Mode** (If implementing custom validation):
     - Add an opt-in flag to allow RFC-1918 addresses only for specific namespaces
     - Require additional validation (e.g., TLS certificate verification, namespace-scoped allowlists)
     - Document the security trade-offs clearly

   - **Known Limitation** (Current state):
      - Suffix-qualified cluster-internal S3 services are supported
      - Suffix-qualified HTTP service names require private/shared DNS results at dial time
      - Unsafe destinations and ambiguous/bare hostnames remain protected by the external HTTPS policy

2. **AWS S3**:
   - Should already use `https://` and public endpoints
   - No changes needed

3. **Testing/Development**:
   - **Recommended**: Use public cloud storage services (AWS S3, Google Cloud Storage, Azure Blob Storage)
   - **For internal testing**: Use VPN or port forwarding to securely access internal MinIO instances, or configure Service Mesh for cluster-internal access
   - **Never** deploy MinIO with unrestricted public access - always enforce authentication, TLS, and network controls
   - Avoid localhost/private IP configurations in production secrets
