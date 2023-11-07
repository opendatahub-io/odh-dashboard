import { assembleInferenceService } from '~/api/k8s/inferenceServices';
import { InferenceServiceStorageType } from '~/pages/modelServing/screens/types';

global.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));

describe('assembleInferenceService', () => {
  it('should have the right annotations when creating for Kserve', async () => {
    const inferenceService = assembleInferenceService({
      name: 'my-inference-service',
      project: 'caikit-example',
      servingRuntimeName: 'caikit',
      storage: {
        type: InferenceServiceStorageType.NEW_STORAGE,
        path: '/caikit-llama',
        dataConnection: 'aws-data-connection',
        awsData: [],
      },
      format: {
        name: 'caikit',
        version: '1.0.0',
      },
    });

    expect(inferenceService.metadata.annotations).toBeDefined();
    expect(inferenceService.metadata.annotations?.['serving.kserve.io/deploymentMode']).toBe(
      undefined,
    );
    expect(
      inferenceService.metadata.annotations?.['serving.knative.openshift.io/enablePassthrough'],
    ).toBe('true');
    expect(inferenceService.metadata.annotations?.['sidecar.istio.io/inject']).toBe('true');
    expect(inferenceService.metadata.annotations?.['sidecar.istio.io/rewriteAppHTTPProbers']).toBe(
      'true',
    );
  });

  it('should have the right annotations when creating for modelmesh', async () => {
    const inferenceService = assembleInferenceService(
      {
        name: 'my-inference-service',
        project: 'caikit-example',
        servingRuntimeName: 'caikit',
        storage: {
          type: InferenceServiceStorageType.NEW_STORAGE,
          path: '/caikit-llama',
          dataConnection: 'aws-data-connection',
          awsData: [],
        },
        format: {
          name: 'caikit',
          version: '1.0.0',
        },
      },
      undefined,
      undefined,
      true,
    );

    expect(inferenceService.metadata.annotations).toBeDefined();
    expect(inferenceService.metadata.annotations?.['serving.kserve.io/deploymentMode']).toBe(
      'ModelMesh',
    );
    expect(
      inferenceService.metadata.annotations?.['serving.knative.openshift.io/enablePassthrough'],
    ).toBe(undefined);
    expect(inferenceService.metadata.annotations?.['sidecar.istio.io/inject']).toBe(undefined);
    expect(inferenceService.metadata.annotations?.['sidecar.istio.io/rewriteAppHTTPProbers']).toBe(
      undefined,
    );
  });
});
