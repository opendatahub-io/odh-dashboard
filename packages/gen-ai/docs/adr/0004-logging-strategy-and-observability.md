# 0004 - Logging Strategy and Observability

* Date: 2025-12-16
* Authors: Matias Schimuneck

## Context and Problem Statement

The BFF requires comprehensive logging for debugging, monitoring, and troubleshooting in both development and production environments. We need a logging strategy that provides:
- Appropriate verbosity for development (detailed troubleshooting) vs production (actionable signals)
- Structured logging for easy parsing and analysis
- Security through sensitive data redaction
- Consistent logging patterns across the entire codebase
- Request tracing capabilities
- No performance impact from excessive logging in production

## Decision Drivers

* Production logs must be actionable and not overly verbose (signal-to-noise ratio)
* Development logs need full detail for troubleshooting
* Security requirements for sensitive data (tokens, credentials, user data)
* Need for request correlation and distributed tracing
* Standard logging library for Go ecosystem compatibility
* Minimal performance overhead
* Easy configuration via environment variables

## Considered Options

* **Option 1**: Standard Go `log` package
  - Simple but lacks structured logging and log levels
* **Option 2**: Third-party logging library (logrus, zap)
  - Feature-rich but adds external dependencies
* **Option 3**: Go's native `log/slog` (structured logging)
  - Standard library, structured logging, proper log levels, zero external deps
* **Option 4**: No logging standardization
  - Easy initially but leads to inconsistent patterns and production issues

## Decision Outcome

Chosen option: "Go's native `log/slog` (structured logging)", because:
- Part of Go standard library (Go 1.21+), no external dependencies
- Structured logging with key-value pairs for machine parsing
- Built-in log level support (DEBUG, INFO, WARN, ERROR)
- Context propagation support
- Performant with minimal allocation overhead
- Future-proof as Go's official logging direction

### Positive Consequences

* Standardized logging across entire BFF codebase
* Production INFO logs are ~40% less verbose than original DEBUG-everywhere approach
* Full debugging capability preserved when LOG_LEVEL=DEBUG
* Secure sensitive data redaction (tokens, credentials, request bodies)
* Easy log aggregation and analysis with structured fields
* Zero external logging dependencies

### Negative Consequences

* Requires Go 1.21+ (already requirement)
* Required migration from `fmt.Println` and inconsistent patterns (one-time effort)
* Developers must understand appropriate log level selection

## Implementation

### Log Level Guidelines

**ERROR**: Failures requiring immediate attention
- Operations that failed and couldn't recover
- Data loss or corruption scenarios
- Critical system component failures
- Examples: Failed to create K8s client, Database connection lost

**WARN**: Recoverable issues and degraded functionality
- Fallback to defaults due to missing/invalid config
- Recoverable errors (retry will be attempted)
- Missing optional features
- Examples: CA bundle unreadable (fallback to system), Service account not found (use default)

**INFO**: Important business events and high-level operations (Default for production)
- Server lifecycle events (startup, shutdown)
- Resource creation/deletion (LlamaStackDistribution, ConfigMaps)
- Client factory initialization (mock vs real)
- High-level operation summaries
- Examples: "Server starting on port 8080", "LlamaStackDistribution created"

**DEBUG**: Detailed operational information (Default for development)
- Internal discovery and lookup operations
- Detailed model/resource configuration
- Service account and secret discovery
- Request/response details (with redaction)
- URL construction and internal routing
- Examples: "Found InferenceService by name", "Loaded MaaS models into map"

### Configuration

**Environment Variables:**
```bash
# Production (default)
LOG_LEVEL=info

# Development (make dev-start)
LOG_LEVEL=debug
```

**Command-line Flags:**
```bash
--log-level=debug   # Override environment variable
```

### Context-based Logging

Each HTTP request gets a trace logger with unique trace_id:

```go
// Middleware injects trace logger into context
traceId := uuid.NewString()
traceLogger := app.logger.With(slog.String("trace_id", traceId))
ctx = context.WithValue(ctx, constants.TraceLoggerKey, traceLogger)

// Handlers retrieve logger from context
logger := helper.GetContextLoggerFromReq(r)
logger.Info("operation completed", "result", "success")
```

### Sensitive Data Redaction

Automatically redacts sensitive information:
- **Headers**: Authorization, Cookie, tokens, user info
- **Request Bodies**: Always redacted (may contain chat conversations, prompts)
- **Tokens**: Never logged in plaintext

```go
var sensitiveHeaders = []string{
    "Authorization",
    "Cookie",
    "X-Forwarded-Access-Token",
    "X-Auth-Request-Access-Token",
    "X-Llamastack-Provider-Data",
    "X-Mcp-Bearer",
    // ... more
}
```

### Log Level Adjustments (Commit 08968703f)

Optimized 15 log statements for better production readiness:
- **13 Info → Debug**: Verbose operational details (service account discovery, model configuration, resource lookups)
- **1 Info → Warn**: Invalid configuration fallback (transport type)
- **1 Info → Debug**: Low-level initialization (memory store)
- **2 fmt.Println → slog.Error**: Configuration errors (klog verbosity)
- **1 fmt.Println removed**: Debug print statement (already logged elsewhere)

### Development vs Production

**Development (`make dev-start`)**:
- LOG_LEVEL=debug (explicit in Makefile)
- Full request/response logging
- Detailed resource discovery logs
- All intermediate steps logged
- ~250 log statements active

**Production (default)**:
- LOG_LEVEL=info
- Only important business events
- Summary logs instead of per-item logs
- Sensitive data always redacted
- ~150 log statements active (40% reduction)

## Examples

### Appropriate Log Level Selection

```go
// ERROR - unrecoverable failure
kc.Logger.Error("failed to create user client", "error", err)

// WARN - recoverable, using fallback
logger.Warn("No CA certificates loaded, falling back to system defaults")

// INFO - important business event
logger.Info("LlamaStackDistribution created successfully", "namespace", ns, "name", name)

// DEBUG - internal operational detail
kc.Logger.Debug("Found InferenceService by model name", "modelName", modelName)
```

### Structured Logging with Context

```go
logger.Info("processing request",
    "namespace", namespace,
    "model_count", len(models),
    "user", username,
    "operation", "create_lsd")
```

## Performance Impact

- **Disabled log statements**: Near-zero overhead (slog skips formatting for disabled levels)
- **Structured logging**: Minimal allocation overhead vs fmt.Printf
- **Production (INFO)**: ~40% fewer log statements executed
- **Context logger**: One logger allocation per request (acceptable overhead)

## Links

* [Related to] ADR-0002 - System Architecture (logging infrastructure)
* [Related to] ADR-0005 - Authentication (sensitive data in logs)
* [Supersedes] Previous inconsistent logging patterns (fmt.Println, ad-hoc approaches)
* [External] [Go slog package](https://pkg.go.dev/log/slog) - Official documentation
* [External] [RHAIENG-1554](https://issues.redhat.com/browse/RHAIENG-1554) - Original logging ticket
* [Implemented in] Commit 08968703f - Logging level optimizations

