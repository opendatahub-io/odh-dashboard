// api/k8s/apis/serving.kserve.io/v1alpha1/namespaces/project/servingruntimes

export const mockAPINamespaceProjectServingRruntimes = {
    "apiVersion": "serving.kserve.io/v1alpha1",
    "items": [
        {
            "apiVersion": "serving.kserve.io/v1alpha1",
            "kind": "ServingRuntime",
            "metadata": {
                "creationTimestamp": "2023-03-17T16:05:55Z",
                "generation": 1,
                "labels": {
                    "name": "model-server-project",
                    "opendatahub.io/dashboard": "true"
                },
                "name": "model-server-project",
                "namespace": "project",
                "resourceVersion": "1302239",
                "uid": "170e3426-6596-4c0b-b21a-f36b039e7949"
            },
            "spec": {
                "builtInAdapter": {
                    "memBufferBytes": 134217728,
                    "modelLoadingTimeoutMillis": 90000,
                    "runtimeManagementPort": 8888,
                    "serverType": "ovms"
                },
                "containers": [
                    {
                        "args": [
                            "--port=8001",
                            "--rest_port=8888",
                            "--config_path=/models/model_config_list.json",
                            "--file_system_poll_wait_seconds=0",
                            "--grpc_bind_address=127.0.0.1",
                            "--rest_bind_address=127.0.0.1"
                        ],
                        "image": "registry.redhat.io/rhods/odh-openvino-servingruntime-rhel8@sha256:8af20e48bb480a7ba1ee1268a3cf0a507e05b256c5fcf988f8e4a3de8b87edc6",
                        "name": "ovms",
                        "resources": {
                            "limits": {
                                "cpu": "2",
                                "memory": "8Gi"
                            },
                            "requests": {
                                "cpu": "1",
                                "memory": "4Gi"
                            }
                        }
                    }
                ],
                "grpcDataEndpoint": "port:8001",
                "grpcEndpoint": "port:8085",
                "multiModel": true,
                "protocolVersions": [
                    "grpc-v1"
                ],
                "replicas": 1,
                "supportedModelFormats": [
                    {
                        "autoSelect": true,
                        "name": "openvino_ir",
                        "version": "opset1"
                    },
                    {
                        "autoSelect": true,
                        "name": "onnx",
                        "version": "1"
                    }
                ]
            }
        }
    ],
    "kind": "ServingRuntimeList",
    "metadata": {
        "continue": "",
        "resourceVersion": "1462210"
    }
}