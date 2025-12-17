# BFF Logging Configuration

This document describes how to configure logging for the BFF (Backend for Frontend) component.

## Log Levels

The BFF supports four log levels, controlled by the `LOG_LEVEL` environment variable:

- `DEBUG` - Detailed diagnostic information (default for development)
- `INFO` - General informational messages
- `WARN` - Warning messages for potentially harmful situations
- `ERROR` - Error messages for failures

## Environment Variables

### LOG_LEVEL

Sets the server log level for the BFF component.

**Default:** `DEBUG`

**Example:**
```bash
export LOG_LEVEL=INFO
```

**Command-line flag:**
```bash
./bff --log-level=INFO
```

## Structured Logging

The BFF uses Go's `log/slog` package for structured logging. All log entries include:
- Timestamp
- Log level
- Message
- Structured key-value pairs

**Example log output:**
```
time=2025-01-21T10:30:00Z level=INFO msg="starting server" addr=:8080 TLS_enabled=false path_prefix=/gen-ai swagger_ui=/api/v1/swagger-ui
```

## Context-Based Logging

The BFF implements context-based logging with trace IDs for request tracing:

- Each HTTP request receives a unique `trace_id`
- All logs within a request context include the `trace_id`
- This enables tracing requests across the entire system

**Example:**
```
time=2025-01-21T10:30:00Z level=DEBUG msg="Incoming HTTP request" trace_id=abc123 request.method=GET request.url=/gen-ai/api/v1/models
```

## Sensitive Data Redaction

The BFF automatically redacts sensitive information from logs:

**Redacted Headers:**
- `Authorization`
- `Cookie`
- `Set-Cookie`
- `Proxy-Authorization`
- `X-Forwarded-Access-Token`
- `X-Auth-Request-Access-Token`
- `X-Auth-Request-Email`
- `X-Auth-Request-User`
- `X-Auth-Request-Groups`
- `X-Envoy-Peer-Metadata`
- `X-Envoy-Peer-Metadata-Id`
- `X-Llamastack-Provider-Data`
- `X-Mcp-Bearer`

**Request Bodies:**
- All request bodies are redacted for privacy and security
- This protects user chat conversations, prompts, and other sensitive data

## Kubernetes Client Logging

The BFF integrates with Kubernetes client libraries that use `klog`:

- When `LOG_LEVEL=DEBUG`, klog verbosity is set to `v=4`
- When `LOG_LEVEL` is INFO or higher, klog verbosity is set to `v=1`
- This ensures appropriate logging detail from Kubernetes operations

## Related Documentation

- [Configuration Examples](./configuration-examples.md) - Example configurations
- [Best Practices](./best-practices.md) - Recommended practices
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions
- [vLLM Logging Configuration](./vllm-logging.md) - vLLM logging setup

