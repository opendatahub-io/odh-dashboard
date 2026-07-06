# Logging Troubleshooting

This document provides solutions for common logging issues and how to diagnose problems.

## Logs Not Appearing

### Symptoms
- No log output from the application
- Missing expected log messages

### Solutions

1. **Check `LOG_LEVEL` environment variable:**
   ```bash
   oc get deployment <deployment-name> -n <namespace> -o jsonpath='{.spec.template.spec.containers[0].env}'
   ```

2. **Verify the log level allows the message type:**
   - DEBUG messages won't appear with `LOG_LEVEL=ERROR`
   - Ensure the log level is set appropriately for the messages you expect

3. **Check application startup logs:**
   ```bash
   oc logs deployment/<deployment-name> -n <namespace> --previous
   ```
   Look for logging configuration errors in startup logs

4. **Verify the application is running:**
   ```bash
   oc get pods -n <namespace> -l app=<app-label>
   ```

## Too Many Logs

### Symptoms
- Excessive log volume
- Performance degradation
- Storage issues

### Solutions

1. **Increase log level:**
   ```bash
   # Change from DEBUG to INFO
   oc set env deployment/<deployment-name> -n <namespace> LOG_LEVEL=INFO
   
   # Or change to WARN for even less logging
   oc set env deployment/<deployment-name> -n <namespace> LOG_LEVEL=WARN
   ```

2. **Review log output:**
   - Identify noisy components
   - Check for repeated error messages
   - Look for components logging at inappropriate levels

3. **Filter logs at aggregation level:**
   - Configure log aggregation tools to filter noise
   - Use log sampling for high-volume scenarios
   - Set up log retention policies

## Missing Trace IDs

### Symptoms
- Log entries don't include trace IDs
- Unable to trace requests across components

### Solutions

1. **Ensure requests go through the `EnableTelemetry` middleware:**
   - Verify middleware is configured in the application
   - Check that requests are routed through the middleware chain

2. **Check context propagation:**
   - Verify context is properly propagated through request handlers
   - Ensure trace IDs are added to context early in request processing

3. **Verify logger retrieval:**
   - Use `GetContextLogger` helper function to retrieve context logger
   - Don't use default logger for request-scoped logging
   - Check that logger is retrieved from request context

## vLLM Logs Not Appearing

### Symptoms
- No logs from vLLM components
- vLLM logging configuration not working

### Solutions

1. **Verify the ConfigMap exists:**
   ```bash
   oc get configmap vllm-logging -n <namespace>
   ```
   If it doesn't exist, create it following the [vLLM Logging Configuration](./vllm-logging.md) guide.

2. **Check environment variables:**
   ```bash
   oc get inferenceservice <service-name> -n <namespace> -o jsonpath='{.spec.predictor.containers[0].env}'
   ```
   Verify `VLLM_CONFIGURE_LOGGING` and `VLLM_LOGGING_CONFIG_PATH` are set correctly.

3. **Verify volume mounts:**
   ```bash
   oc get inferenceservice <service-name> -n <namespace> -o jsonpath='{.spec.predictor.containers[0].volumeMounts}'
   ```
   Ensure the logging config volume mount is configured.

4. **Check that the volume is mounted:**
   ```bash
   oc get inferenceservice <service-name> -n <namespace> -o jsonpath='{.spec.predictor.volumes}'
   ```
   Verify the ConfigMap volume is defined.

5. **Verify the logging config file is accessible:**
   ```bash
   oc exec -it deployment/<vllm-deployment> -n <namespace> -- cat /config/logging_config.json
   ```
   If the file doesn't exist or is empty, check the volume mount configuration.

6. **Check pod logs:**
   ```bash
   oc logs deployment/<vllm-deployment> -n <namespace>
   ```
   Look for errors related to logging configuration.

7. **Verify InferenceService is using the correct container:**
   ```bash
   oc get inferenceservice <service-name> -n <namespace> -o yaml
   ```
   Ensure environment variables and volume mounts are in the correct container.

## Log Format Issues

### Symptoms
- Logs are not in expected format
- Structured logging not working correctly

### Solutions

1. **Check log handler configuration:**
   - Verify structured logging is enabled
   - Check log format configuration

2. **Verify log output destination:**
   - Ensure logs are going to stdout/stderr
   - Check log aggregation configuration

## Performance Issues

### Symptoms
- Application performance degradation
- High CPU usage from logging

### Solutions

1. **Reduce log verbosity:**
   - Increase log level to reduce log volume
   - Disable verbose logging in production

2. **Optimize log output:**
   - Use asynchronous logging if available
   - Consider log buffering
   - Review log format for efficiency

3. **Monitor log ingestion:**
   - Check log aggregation system performance
   - Monitor log forwarding rates
   - Consider log sampling for high-volume scenarios

## Configuration Verification Commands

### BFF Logging

```bash
# Check BFF log level
oc get deployment <bff-deployment> -n <namespace> -o jsonpath='{.spec.template.spec.containers[0].env[?(@.name=="LOG_LEVEL")].value}'

# View BFF logs
oc logs -f deployment/<bff-deployment> -n <namespace>

# Check BFF pod status
oc get pods -n <namespace> -l app=<bff-label>
```

### vLLM Logging

```bash
# Check ConfigMap
oc get configmap vllm-logging -n <namespace> -o yaml

# Check InferenceService environment variables
oc get inferenceservice <service-name> -n <namespace> -o jsonpath='{.spec.predictor.containers[0].env}'

# Check volume mounts
oc get inferenceservice <service-name> -n <namespace> -o jsonpath='{.spec.predictor.containers[0].volumeMounts}'

# Check volumes
oc get inferenceservice <service-name> -n <namespace> -o jsonpath='{.spec.predictor.volumes}'

# View vLLM logs
oc logs -f deployment/<vllm-deployment> -n <namespace>
```

## Related Documentation

- [BFF Logging Configuration](./bff-logging.md) - BFF logging setup
- [vLLM Logging Configuration](./vllm-logging.md) - vLLM logging setup
- [Configuration Examples](./configuration-examples.md) - Example configurations
- [Best Practices](./best-practices.md) - Recommended practices

