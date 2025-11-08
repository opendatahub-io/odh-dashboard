# Logging Best Practices

This document outlines recommended practices for configuring and managing logging in the gen-ai system.

## Production Logging

1. **Use Appropriate Log Levels:**
   - Use `LOG_LEVEL=INFO` in production environments
   - Avoid `LOG_LEVEL=DEBUG` in production to prevent logging sensitive data
   - Monitor log volume and adjust as needed

2. **Log Volume Management:**
   - Set appropriate log retention policies
   - Use log aggregation tools (e.g., Elasticsearch, Splunk)
   - Monitor log storage usage
   - Consider log rotation policies

3. **Security Considerations:**
   - Never log sensitive information (passwords, tokens, PII)
   - Review log output to ensure sensitive data is properly redacted
   - Restrict access to log files and log aggregation systems
   - Use secure log transmission (TLS) when forwarding logs

## Development Logging

1. **Detailed Diagnostics:**
   - Use `LOG_LEVEL=DEBUG` for detailed diagnostic information
   - Enable trace IDs to follow requests through the system
   - Review redacted headers to ensure sensitive data is protected

2. **Local Development:**
   - Use structured logging to easily parse and filter logs
   - Enable context-based logging for request tracing
   - Test log levels to understand what information is captured

## Structured Logging

1. **Consistent Format:**
   - Always use structured logging with key-value pairs
   - Include relevant context (trace_id, namespace, etc.)
   - Avoid logging sensitive information

2. **Log Context:**
   - Include request IDs or trace IDs in all log entries
   - Add relevant metadata (namespace, component, operation)
   - Use consistent field names across components

3. **Log Levels:**
   - Use appropriate log levels for different scenarios:
     - `ERROR`: System errors, failures
     - `WARN`: Potentially problematic situations
     - `INFO`: General informational messages
     - `DEBUG`: Detailed diagnostic information

## vLLM Integration

1. **Configuration:**
   - Create the logging ConfigMap before configuring InferenceServices
   - Configure vLLM environment variables (`VLLM_CONFIGURE_LOGGING`, `VLLM_LOGGING_CONFIG_PATH`) in InferenceService or LlamaStackDistribution
   - Ensure volume mounts are correctly configured to mount the logging ConfigMap

2. **Security:**
   - Use secrets for API tokens rather than plain text
   - Store sensitive configuration in Kubernetes secrets
   - Review logging configuration to avoid exposing sensitive data

3. **Monitoring:**
   - Monitor both BFF and vLLM logs for complete request tracing
   - Use log aggregation to correlate logs across components
   - Set up alerts for error patterns

## OpenShift CLI Usage

1. **Configuration Updates:**
   - Use `oc patch` for programmatic configuration updates
   - Use `oc set env` for quick environment variable updates
   - Document configuration changes for reproducibility

2. **Verification:**
   - Always verify configuration changes with `oc get` commands
   - Check logs after configuration changes
   - Test logging configuration in non-production environments first

## Log Aggregation and Analysis

1. **Centralized Logging:**
   - Use centralized log aggregation systems
   - Implement log forwarding from all components
   - Ensure consistent log format across components

2. **Log Analysis:**
   - Use log analysis tools to identify patterns
   - Set up dashboards for common queries
   - Create alerts for critical error conditions

3. **Performance:**
   - Monitor log ingestion rates
   - Optimize log queries
   - Consider log sampling for high-volume scenarios

## Related Documentation

- [BFF Logging Configuration](./bff-logging.md) - BFF logging setup
- [vLLM Logging Configuration](./vllm-logging.md) - vLLM logging setup
- [Configuration Examples](./configuration-examples.md) - Example configurations
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions

