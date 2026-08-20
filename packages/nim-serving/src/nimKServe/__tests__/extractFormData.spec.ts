import { mockInferenceServiceK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockInferenceServiceK8sResource';
import type { KServeDeployment } from '@odh-dashboard/kserve/types';
import type { ServingRuntimeKind } from '@odh-dashboard/model-serving/shared';
import { isNIMKServeDeployment } from '../extractFormData';

const makeServingRuntime = (
  kserveContainerImage?: string,
  annotations?: Record<string, string>,
): ServingRuntimeKind => ({
  apiVersion: 'serving.kserve.io/v1alpha1',
  kind: 'ServingRuntime',
  metadata: { name: 'test-model', namespace: 'test-project', annotations },
  spec: {
    containers: [{ name: 'kserve-container', image: kserveContainerImage }],
    supportedModelFormats: [{ name: 'placeholder', version: '1' }],
  },
});

const makeDeployment = (server?: ServingRuntimeKind): KServeDeployment => ({
  modelServingPlatformId: 'kserve',
  model: mockInferenceServiceK8sResource({ name: 'test-model' }),
  server,
});

describe('isNIMKServeDeployment', () => {
  it('should detect NIM from an nvcr.io container image', () => {
    expect(
      isNIMKServeDeployment(makeDeployment(makeServingRuntime('nvcr.io/nim/test:1.0.0'))),
    ).toBe(true);
  });

  it('should detect NIM from the runtime stamp annotation when the image is a mirror registry', () => {
    expect(
      isNIMKServeDeployment(
        makeDeployment(
          makeServingRuntime('mirror.local/nim/test:1.0.0', {
            'runtimes.opendatahub.io/nvidia-nim': 'true',
          }),
        ),
      ),
    ).toBe(true);
  });

  it('should return false for a plain KServe deployment (no NIM image or annotation)', () => {
    expect(
      isNIMKServeDeployment(makeDeployment(makeServingRuntime('quay.io/some/image:1.0'))),
    ).toBe(false);
  });

  it('should return false for a non-NIM nvcr.io image (not under the nim/ namespace)', () => {
    expect(
      isNIMKServeDeployment(
        makeDeployment(makeServingRuntime('nvcr.io/nvidia/tritonserver:24.01')),
      ),
    ).toBe(false);
  });

  it('should return false when there is no server', () => {
    expect(isNIMKServeDeployment(makeDeployment())).toBe(false);
  });
});
