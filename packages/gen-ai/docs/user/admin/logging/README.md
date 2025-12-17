# Logging Configuration

This documentation describes how to configure and enable logging across various gen-ai components.

## Overview

The gen-ai system uses structured logging throughout its components. This guide covers:
- BFF (Backend for Frontend) logging configuration
- Log level settings and environment variables
- Structured logging implementation
- vLLM logging configuration
- Examples and best practices

## Documentation Structure

- [BFF Logging Configuration](./bff-logging.md) - Configure logging for the BFF component
- [vLLM Logging Configuration](./vllm-logging.md) - Configure logging for vLLM components
- [Configuration Examples](./configuration-examples.md) - Example configurations for different environments
- [Best Practices](./best-practices.md) - Recommended practices for logging
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions

## Quick Start

### BFF Logging

Set the log level using the `LOG_LEVEL` environment variable:

```bash
export LOG_LEVEL=INFO
```

See [BFF Logging Configuration](./bff-logging.md) for detailed information.

### vLLM Logging

Enable vLLM logging by creating a ConfigMap and configuring your InferenceService:

1. Create the logging ConfigMap (see [vLLM Logging Configuration](./vllm-logging.md))
2. Configure environment variables in your InferenceService
3. Mount the ConfigMap as a volume

See [vLLM Logging Configuration](./vllm-logging.md) for step-by-step instructions.

## Related Documentation

- [BFF Testing Guide](../../../bff/README.md) - Testing the BFF with different configurations
- [System Architecture](../../../adr/0002-system-architecture.md) - Overall system architecture
- [Core User Flows](../../../adr/0003-core-user-flows.md) - Request flow documentation

