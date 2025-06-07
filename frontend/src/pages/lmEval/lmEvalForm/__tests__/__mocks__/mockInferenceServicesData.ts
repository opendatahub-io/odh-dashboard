import { mockInferenceServiceK8sResource } from '#~/__mocks__/mockInferenceServiceK8sResource';

// Mock inference services data with vLLM modelFormat
export const mockInferenceServices = [
  {
    ...mockInferenceServiceK8sResource({
      name: 'model-1',
      namespace: 'default',
      displayName: 'Model One',
    }),
    spec: {
      ...mockInferenceServiceK8sResource({
        name: 'model-1',
        namespace: 'default',
        displayName: 'Model One',
      }).spec,
      predictor: {
        ...mockInferenceServiceK8sResource({
          name: 'model-1',
          namespace: 'default',
          displayName: 'Model One',
        }).spec.predictor,
        model: {
          ...mockInferenceServiceK8sResource({
            name: 'model-1',
            namespace: 'default',
            displayName: 'Model One',
          }).spec.predictor.model,
          modelFormat: {
            name: 'vLLM',
            version: '1',
          },
        },
      },
    },
  },
  {
    ...mockInferenceServiceK8sResource({
      name: 'model-2',
      namespace: 'default',
      displayName: 'Model Two',
    }),
    spec: {
      ...mockInferenceServiceK8sResource({
        name: 'model-2',
        namespace: 'default',
        displayName: 'Model Two',
      }).spec,
      predictor: {
        ...mockInferenceServiceK8sResource({
          name: 'model-2',
          namespace: 'default',
          displayName: 'Model Two',
        }).spec.predictor,
        model: {
          ...mockInferenceServiceK8sResource({
            name: 'model-2',
            namespace: 'default',
            displayName: 'Model Two',
          }).spec.predictor.model,
          modelFormat: {
            name: 'vLLM',
            version: '1',
          },
        },
      },
    },
  },
  {
    ...mockInferenceServiceK8sResource({
      name: 'model-3',
      namespace: 'production',
      displayName: 'Model Three',
    }),
    spec: {
      ...mockInferenceServiceK8sResource({
        name: 'model-3',
        namespace: 'production',
        displayName: 'Model Three',
      }).spec,
      predictor: {
        ...mockInferenceServiceK8sResource({
          name: 'model-3',
          namespace: 'production',
          displayName: 'Model Three',
        }).spec.predictor,
        model: {
          ...mockInferenceServiceK8sResource({
            name: 'model-3',
            namespace: 'production',
            displayName: 'Model Three',
          }).spec.predictor.model,
          modelFormat: {
            name: 'vLLM',
            version: '1',
          },
        },
      },
    },
  },
  {
    ...mockInferenceServiceK8sResource({
      name: 'model-4',
      namespace: 'staging',
      displayName: 'Model Four',
    }),
    spec: {
      ...mockInferenceServiceK8sResource({
        name: 'model-4',
        namespace: 'staging',
        displayName: 'Model Four',
      }).spec,
      predictor: {
        ...mockInferenceServiceK8sResource({
          name: 'model-4',
          namespace: 'staging',
          displayName: 'Model Four',
        }).spec.predictor,
        model: {
          ...mockInferenceServiceK8sResource({
            name: 'model-4',
            namespace: 'staging',
            displayName: 'Model Four',
          }).spec.predictor.model,
          modelFormat: {
            name: 'vLLM',
            version: '1',
          },
        },
      },
    },
  },
];

// Create a non-vLLM service for testing filtering
export const nonVllmService = {
  ...mockInferenceServiceK8sResource({
    name: 'non-llm-model',
    namespace: 'default',
    displayName: 'Non-LLM Model',
  }),
  spec: {
    ...mockInferenceServiceK8sResource({
      name: 'non-llm-model',
      namespace: 'default',
      displayName: 'Non-LLM Model',
    }).spec,
    predictor: {
      ...mockInferenceServiceK8sResource({
        name: 'non-llm-model',
        namespace: 'default',
        displayName: 'Non-LLM Model',
      }).spec.predictor,
      model: {
        ...mockInferenceServiceK8sResource({
          name: 'non-llm-model',
          namespace: 'default',
          displayName: 'Non-LLM Model',
        }).spec.predictor.model,
        modelFormat: {
          name: 'onnx',
          version: '1',
        },
      },
    },
  },
};
