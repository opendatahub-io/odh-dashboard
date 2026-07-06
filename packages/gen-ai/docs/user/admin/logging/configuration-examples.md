# Configuration Examples

This document provides example configurations for different environments and use cases.

## Development Environment

For local development with detailed logging:

```bash
export LOG_LEVEL=DEBUG
export LLAMA_STACK_URL=http://localhost:8321
export AUTH_METHOD=user_token
```

## Production Environment

For production with appropriate log levels:

```bash
export LOG_LEVEL=INFO
# Production should use INFO level to avoid logging sensitive data
# DEBUG level should only be used in development
```

## Full Logging Chain (BFF + vLLM)

To enable logging across the entire request chain:

```bash
# BFF logging
export LOG_LEVEL=INFO

# vLLM logging (configured in LlamaStackDistribution)
# Set via environment variables in the deployment
```

## Complete OpenShift Deployment Example

### 1. Create vLLM Logging ConfigMap

```bash
cat <<EOF | oc apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: vllm-logging
  namespace: <namespace>
data:
  logging.json: |
    {
      "formatters": {
        "vllm": {
          "class": "vllm.logging_utils.NewLineFormatter",
          "datefmt": "%m-%d %H:%M:%S",
          "format": "%(levelname)s %(asctime)s %(filename)s:%(lineno)d] %(message)s"
        }
      },
      "handlers": {
        "vllm": {
          "class": "logging.StreamHandler",
          "formatter": "vllm",
          "level": "DEBUG",
          "stream": "ext://sys.stdout"
        }
      },
      "loggers": {
        "vllm": {
          "handlers": ["vllm"],
          "level": "DEBUG",
          "propagate": true
        },
        "vllm.example_noisy_logger": {
          "propagate": false
        }
      },
      "version": 1
    }
EOF
```

### 2. Configure BFF Deployment

```bash
# Set log level
oc set env deployment/gen-ai-bff -n <namespace> LOG_LEVEL=INFO
```

### 3. Configure InferenceService

```bash
# Add environment variables
oc patch inferenceservice <service-name> -n <namespace> --type='json' -p='[
  {"op": "add", "path": "/spec/predictor/containers/0/env/-", "value": {"name": "VLLM_CONFIGURE_LOGGING", "value": "1"}},
  {"op": "add", "path": "/spec/predictor/containers/0/env/-", "value": {"name": "VLLM_LOGGING_CONFIG_PATH", "value": "/config/logging_config.json"}}
]'

# Add volume mount
oc patch inferenceservice <service-name> -n <namespace> --type='json' -p='[
  {"op": "add", "path": "/spec/predictor/containers/0/volumeMounts/-", "value": {"mountPath": "/config/logging_config.json", "name": "logging-config", "subPath": "logging.json"}}
]'

# Add volume
oc patch inferenceservice <service-name> -n <namespace> --type='json' -p='[
  {"op": "add", "path": "/spec/predictor/volumes/-", "value": {"configMap": {"name": "vllm-logging"}, "name": "logging-config"}}
]'
```

### 4. Verify Configuration

```bash
# Check BFF logs
oc logs -f deployment/gen-ai-bff -n <namespace>

# Check vLLM logs
oc logs -f deployment/<vllm-deployment> -n <namespace>
```

## Related Documentation

- [BFF Logging Configuration](./bff-logging.md) - BFF logging setup
- [vLLM Logging Configuration](./vllm-logging.md) - vLLM logging setup
- [Best Practices](./best-practices.md) - Recommended practices
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions

