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
3. **Allows unresolvable hostnames** with a warning (they may resolve in a different network at runtime)

**Example**:
```
Hostname: minio.example.com
Resolves to: 192.168.1.10
Result: ❌ Blocked - resolves to private IP
```

**Error Message**: `endpoint hostname '<hostname>' resolves to blocked IP <ip>: <error>`

**Warning Log**: If a hostname cannot be resolved at validation time, a warning is logged:
```
Unable to resolve S3 endpoint hostname, allowing it to proceed
```

This allows for environments where DNS resolution may differ between validation and runtime.

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

The validation is applied in:

1. **`GetS3Credentials()`** in `s3.go`
   - Called when retrieving credentials from Kubernetes secrets
   - Validates and normalizes the `AWS_S3_ENDPOINT` value
   - Returns error if endpoint is invalid

2. **`GetS3Credentials()`** in `s3_mock.go`
   - Mock implementation skips SSRF validation
   - Stores endpoint as-is for test fixtures
   - Tests can verify validation in the real implementation

### Error Handling

When validation fails, the error is wrapped with context:

```
secret '<secret-name>' has invalid AWS_S3_ENDPOINT: <validation-error>
```

This provides clear feedback about which secret has an invalid endpoint and what the specific validation failure is.

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
- ✅ **Use public hostnames or IPs** - Private/internal IPs are blocked
- ✅ **Include port if non-standard** - e.g., `:9000` for MinIO
- ❌ **Never use private IPs** - Even for internal MinIO/S3 services
- ❌ **Never use localhost** - Use external hostname instead

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

**Solution**: Use a public hostname or IP. For internal MinIO/S3 services, ensure they're accessible via a public hostname or configure network routing appropriately.

### "endpoint hostname resolves to blocked IP"

**Problem**: Hostname resolves to a private/blocked IP address.

**Solution**: The hostname DNS record points to an internal IP. Either:
- Use a different hostname that resolves to a public IP
- Update DNS to point to a public IP
- Deploy S3 service with a publicly accessible endpoint

### "invalid endpoint URL format"

**Problem**: Malformed URL in the secret.

**Solution**: Ensure the URL is properly formatted:
- Include scheme: `https://`
- Include hostname: `s3.amazonaws.com`
- Include port if needed: `:9000`

## Migration Guide

If you have existing secrets with endpoints that are now blocked:

1. **Internal MinIO/S3 Services**:
   - Expose via a public hostname or IP
   - Update ingress/routing to make service publicly accessible
   - Update secret with new public endpoint URL

2. **AWS S3**:
   - Should already use `https://` and public endpoints
   - No changes needed

3. **Testing/Development**:
   - Use public cloud storage services
   - Deploy MinIO with public access
   - Avoid localhost/private IP configurations
