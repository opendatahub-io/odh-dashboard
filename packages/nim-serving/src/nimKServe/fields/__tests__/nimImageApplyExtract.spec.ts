import { mockInferenceServiceK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockInferenceServiceK8sResource';
import type { KServeDeployment } from '@odh-dashboard/kserve/types';
import type { ServingRuntimeKind } from '@odh-dashboard/model-serving/shared';
import { applyNIMImageFieldData } from '../nimImageApplyExtract';

const NIM_IMAGE = { repository: 'nvcr.io/nim/snowflake/arctic-embed-l', tag: '1.0.1' };

const makeServingRuntime = (): ServingRuntimeKind => ({
  apiVersion: 'serving.kserve.io/v1alpha1',
  kind: 'ServingRuntime',
  metadata: { name: 'test-model', namespace: 'test-project' },
  spec: {
    containers: [{ name: 'transformer-container' }, { name: 'kserve-container' }],
    supportedModelFormats: [{ name: 'placeholder', version: '1' }],
  },
});

const makeDeployment = (server?: ServingRuntimeKind): KServeDeployment => ({
  modelServingPlatformId: 'kserve',
  model: mockInferenceServiceK8sResource({ name: 'test-model' }),
  server,
});

describe('applyNIMImageFieldData', () => {
  it('should return the deployment untouched when the repository is empty', () => {
    const deployment = makeDeployment(makeServingRuntime());

    expect(applyNIMImageFieldData(deployment, { repository: '', tag: '1.0.1' })).toBe(deployment);
  });

  it('should return the deployment untouched when the tag is empty', () => {
    const deployment = makeDeployment(makeServingRuntime());

    expect(applyNIMImageFieldData(deployment, { repository: NIM_IMAGE.repository, tag: '' })).toBe(
      deployment,
    );
  });

  // The InferenceService format and the runtime image must both be written -- KServe refuses to
  // bind the deployment to the runtime when the model format doesn't match.
  it('should set the model format and the runtime image together', () => {
    const result = applyNIMImageFieldData(makeDeployment(makeServingRuntime()), NIM_IMAGE);

    expect(result.model.spec.predictor.model?.modelFormat).toEqual({ name: 'arctic-embed-l' });
    expect(result.server?.spec.supportedModelFormats).toEqual([
      { autoSelect: false, name: 'arctic-embed-l', priority: 1, version: '1.0.1' },
    ]);
    expect(result.server?.spec.containers[1].image).toBe(
      'nvcr.io/nim/snowflake/arctic-embed-l:1.0.1',
    );
  });

  it('should only set the image on the kserve-container', () => {
    const result = applyNIMImageFieldData(makeDeployment(makeServingRuntime()), NIM_IMAGE);

    expect(result.server?.spec.containers[0].image).toBeUndefined();
  });

  it('should set the model format when the deployment has no server', () => {
    const result = applyNIMImageFieldData(makeDeployment(), NIM_IMAGE);

    expect(result.model.spec.predictor.model?.modelFormat).toEqual({ name: 'arctic-embed-l' });
    expect(result.server).toBeUndefined();
  });

  it('should fall back to the full repository when it has no path segments', () => {
    const result = applyNIMImageFieldData(makeDeployment(makeServingRuntime()), {
      repository: 'arctic-embed-l',
      tag: '1.0.1',
    });

    expect(result.model.spec.predictor.model?.modelFormat).toEqual({ name: 'arctic-embed-l' });
  });
});
