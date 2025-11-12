# vLLM Logging Configuration

This document describes how to configure and enable logging for vLLM components.

## Enabling vLLM Logging

To enable comprehensive logging for vLLM components, you need to:

1. **Create a ConfigMap** with the logging configuration
2. **Configure the InferenceService** to use the logging configuration
3. **Set environment variables** to enable logging

**Set the InferenceService name:**
```bash
export ISVC_NAME=vllm
```

### Step 1: Create the Logging ConfigMap

Create a ConfigMap containing the vLLM logging configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: vllm-logging
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
```

**Apply the ConfigMap:**
```bash
oc apply -f vllm-logging-configmap.yaml 
```

### Step 2: Configure InferenceService

Configure your vLLM InferenceService to use the logging configuration by adding environment variables and volume mounts:

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: vllm
spec:
  predictor:
    model:
      env:
      - name: VLLM_CONFIGURE_LOGGING
        value: "1"
      - name: VLLM_LOGGING_CONFIG_PATH
        value: "/config/logging_config.json"
      volumeMounts:
      - mountPath: "/config/logging_config.json"
        name: logging-config
        subPath: logging.json
    volumes:
    - configMap:
        name: vllm-logging
      name: logging-config
```



## Related Documentation

- [BFF Logging Configuration](./bff-logging.md) - BFF logging setup
- [Configuration Examples](./configuration-examples.md) - Example configurations
- [Best Practices](./best-practices.md) - Recommended practices
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions

