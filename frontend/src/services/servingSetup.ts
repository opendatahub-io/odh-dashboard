export const servingSecret = {
  apiVersion: 'v1',
  kind: 'Secret',
  type: 'Opaque',
  metadata: {
    name: 'storage-config',
  },
  stringData: {},
};

export const mlServerRuntime = {
  apiVersion: 'serving.kserve.io/v1alpha1',
  kind: 'ServingRuntime',
  metadata: {
    name: 'mlserver-0.x',
    labels: {
      name: 'modelmesh-serving-mlserver-0.x-SR',
    },
  },
  spec: {
    supportedModelFormats: [
      {
        autoSelect: true,
        name: 'sklearn',
        version: '0',
      },
      {
        autoSelect: true,
        name: 'xgboost',
        version: '1',
      },
      {
        autoSelect: true,
        name: 'lightgbm',
        version: '3',
      },
    ],
    multiModel: true,
    grpcEndpoint: 'port:8085',
    grpcDataEndpoint: 'port:8001',
    containers: [
      {
        name: 'mlserver',
        image: 'quay.io/opendatahub/mlserver:0.5.2',
        env: [
          {
            name: 'MLSERVER_MODELS_DIR',
            value: '/models/_mlserver_models/',
          },
          {
            name: 'MLSERVER_GRPC_PORT',
            value: '8001',
          },
          {
            name: 'MLSERVER_HTTP_PORT',
            value: '8002',
          },
          {
            name: 'MLSERVER_LOAD_MODELS_AT_STARTUP',
            value: 'false',
          },
          {
            name: 'MLSERVER_MODEL_NAME',
            value: 'dummy-model-fixme',
          },
          {
            name: 'MLSERVER_HOST',
            value: '127.0.0.1',
          },
          {
            name: 'MLSERVER_GRPC_MAX_MESSAGE_LENGTH',
            value: '16777216',
          },
        ],
        resources: {
          requests: {
            cpu: '500m',
            memory: '1Gi',
          },
          limits: {
            cpu: '5',
            memory: '1Gi',
          },
        },
      },
    ],
    builtInAdapter: {
      memBufferBytes: 134217728,
      modelLoadingTimeoutMillis: 90000,
      runtimeManagementPort: 8001,
      serverType: 'mlserver',
    },
  },
};

export const tritonRuntime = {
  apiVersion: 'serving.kserve.io/v1alpha1',
  kind: 'ServingRuntime',
  metadata: {
    name: 'triton-2.x',
    labels: {
      name: 'modelmesh-serving-triton-2.x-SR',
    },
  },
  spec: {
    supportedModelFormats: [
      {
        autoSelect: true,
        name: 'keras',
        version: '2',
      },
      {
        autoSelect: true,
        name: 'onnx',
        version: '1',
      },
      {
        autoSelect: true,
        name: 'pytorch',
        version: '1',
      },
      {
        autoSelect: true,
        name: 'tensorflow',
        version: '1',
      },
      {
        autoSelect: true,
        name: 'tensorflow',
        version: '2',
      },
      {
        autoSelect: true,
        name: 'tensorrt',
        version: '7',
      },
    ],
    multiModel: true,
    grpcEndpoint: 'port:8085',
    grpcDataEndpoint: 'port:8001',
    containers: [
      {
        args: [
          '-c',
          'mkdir -p /models/_triton_models; chmod 777 /models/_triton_models; exec tritonserver "--model-repository=/models/_triton_models" "--model-control-mode=explicit" "--strict-model-config=false" "--strict-readiness=false" "--allow-http=true" "--allow-sagemaker=false" ',
        ],
        command: ['/bin/sh'],
        image: 'nvcr.io/nvidia/tritonserver:21.06.1-py3',
        livenessProbe: {
          exec: {
            command: [
              'curl',
              '--fail',
              '--silent',
              '--show-error',
              '--max-time',
              '9',
              'http://localhost:8000/v2/health/live',
            ],
          },
          initialDelaySeconds: 5,
          periodSeconds: 30,
          timeoutSeconds: 10,
        },
        name: 'triton',
        resources: {
          limits: {
            cpu: '5',
            memory: '1Gi',
          },
          requests: {
            cpu: '500m',
            memory: '1Gi',
          },
        },
      },
    ],
    builtInAdapter: {
      memBufferBytes: 134217728,
      modelLoadingTimeoutMillis: 90000,
      runtimeManagementPort: 8001,
      serverType: 'triton',
    },
  },
};

export const servingRoute = {
  apiVersion: 'route.openshift.io/v1',
  kind: 'Route',
  metadata: {
    name: 'modelmesh-serving',
  },
  spec: {
    to: {
      kind: 'Service',
      name: 'modelmesh-serving',
    },
    port: {
      targetPort: 'http',
    },
    tls: {
      termination: 'edge',
      insecureEdgeTerminationPolicy: 'Redirect',
    },
    wildcardPolicy: 'None',
  },
};
