import { k8sDeleteResource } from '@openshift/dynamic-plugin-sdk-utils';
import { K8sStatusError } from '@odh-dashboard/k8s-core';
import { mockLLMInferenceServiceK8sResource } from '@odh-dashboard/llmd-serving/__mocks__/mockLLMInferenceServiceK8sResource';
import { deleteDeployment } from '../LLMdDeployment';
import {
  LLMInferenceServiceConfigModel,
  LLMInferenceServiceModel,
  TOPOLOGY_CONFIG_REF_ANNOTATION,
  ACCELERATOR_CONFIG_REF_ANNOTATION,
  type LLMdDeployment,
  type LLMInferenceServiceKind,
} from '../../types';

jest.mock('@openshift/dynamic-plugin-sdk-utils');

const mockK8sDeleteResource = jest.mocked(k8sDeleteResource);

const DEPLOYMENT_NAME = 'test-llm-inference-service';
const NAMESPACE = 'test-project';

const makeDeployment = (
  overrides?: Partial<{
    baseRefs: LLMInferenceServiceKind['spec']['baseRefs'];
    annotations: Record<string, string>;
  }>,
): LLMdDeployment => {
  const model = mockLLMInferenceServiceK8sResource({
    additionalAnnotations: overrides?.annotations,
  });
  if (overrides?.baseRefs) {
    model.spec.baseRefs = overrides.baseRefs;
  }
  return { modelServingPlatformId: 'llmd-serving', model };
};

/** The names passed to k8sDeleteResource, grouped by the model they were deleted from. */
const deletedNames = (
  model: typeof LLMInferenceServiceConfigModel | typeof LLMInferenceServiceModel,
) =>
  mockK8sDeleteResource.mock.calls
    .filter(([options]) => options.model === model)
    .map(([options]) => options.queryOptions?.name);

const k8sStatusError = (code: number) =>
  new K8sStatusError({
    apiVersion: 'v1',
    kind: 'Status',
    status: 'Failure',
    code,
    message: 'error',
    reason: 'Error',
  });

describe('deleteDeployment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockK8sDeleteResource.mockResolvedValue({ kind: 'Status', status: 'Success' });
  });

  it('should delete only the deployment when it references no configs', async () => {
    await deleteDeployment(makeDeployment());

    expect(deletedNames(LLMInferenceServiceModel)).toEqual([DEPLOYMENT_NAME]);
    expect(deletedNames(LLMInferenceServiceConfigModel)).toEqual([]);
    expect(mockK8sDeleteResource).toHaveBeenCalledWith(
      expect.objectContaining({
        model: LLMInferenceServiceModel,
        queryOptions: expect.objectContaining({ name: DEPLOYMENT_NAME, ns: NAMESPACE }),
      }),
    );
  });

  it('should delete the accelerator config that shares the deployment name', async () => {
    const checkAccess = jest.fn().mockResolvedValue(true);
    await deleteDeployment(makeDeployment({ baseRefs: [{ name: DEPLOYMENT_NAME }] }), {
      checkAccess,
    });

    expect(checkAccess).toHaveBeenCalledTimes(1);
    expect(deletedNames(LLMInferenceServiceModel)).toEqual([DEPLOYMENT_NAME]);
    expect(deletedNames(LLMInferenceServiceConfigModel)).toEqual([DEPLOYMENT_NAME]);
  });

  it('should delete the local topology config copy named by the annotation', async () => {
    const localConfigName = `${DEPLOYMENT_NAME}-multi-node-config`;
    await deleteDeployment(
      makeDeployment({
        baseRefs: [{ name: localConfigName }],
        annotations: { [TOPOLOGY_CONFIG_REF_ANNOTATION]: localConfigName },
      }),
    );

    expect(deletedNames(LLMInferenceServiceModel)).toEqual([DEPLOYMENT_NAME]);
    expect(deletedNames(LLMInferenceServiceConfigModel)).toEqual([localConfigName]);
    expect(mockK8sDeleteResource).toHaveBeenCalledWith(
      expect.objectContaining({
        model: LLMInferenceServiceConfigModel,
        queryOptions: expect.objectContaining({ name: localConfigName, ns: NAMESPACE }),
      }),
    );
  });

  it('should delete both the accelerator config and the local topology config copy', async () => {
    const localConfigName = `${DEPLOYMENT_NAME}-multi-node-config`;
    await deleteDeployment(
      makeDeployment({
        baseRefs: [{ name: DEPLOYMENT_NAME }, { name: localConfigName }],
        annotations: { [TOPOLOGY_CONFIG_REF_ANNOTATION]: localConfigName },
      }),
    );

    expect(deletedNames(LLMInferenceServiceConfigModel)).toEqual([
      DEPLOYMENT_NAME,
      localConfigName,
    ]);
  });

  it('should not delete the same config twice when the annotation matches the deployment name', async () => {
    await deleteDeployment(
      makeDeployment({
        baseRefs: [{ name: DEPLOYMENT_NAME }],
        annotations: { [TOPOLOGY_CONFIG_REF_ANNOTATION]: DEPLOYMENT_NAME },
      }),
    );

    expect(deletedNames(LLMInferenceServiceConfigModel)).toEqual([DEPLOYMENT_NAME]);
  });

  it('should check each configuration before starting the model deletion', async () => {
    const deployment = makeDeployment({
      baseRefs: [{ name: DEPLOYMENT_NAME }],
      annotations: { [TOPOLOGY_CONFIG_REF_ANNOTATION]: 'topology-config' },
    });
    const checkAccess = jest.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await expect(deleteDeployment(deployment, { checkAccess })).rejects.toThrow(
      'Access denied to delete configuration "topology-config"',
    );
    expect(checkAccess).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        resource: 'llminferenceserviceconfigs',
        verb: 'delete',
        name: DEPLOYMENT_NAME,
        namespace: NAMESPACE,
      }),
    );
    expect(checkAccess).toHaveBeenCalledTimes(2);
    expect(mockK8sDeleteResource).not.toHaveBeenCalled();
  });

  it('should leave the configurations in place if Kubernetes rejects the model deletion', async () => {
    mockK8sDeleteResource.mockRejectedValueOnce(k8sStatusError(403));
    await expect(
      deleteDeployment(makeDeployment({ baseRefs: [{ name: DEPLOYMENT_NAME }] })),
    ).rejects.toBeInstanceOf(K8sStatusError);
    expect(deletedNames(LLMInferenceServiceConfigModel)).toEqual([]);
  });

  it('should delete the local accelerator config copy named by the annotation', async () => {
    const localConfigName = `${DEPLOYMENT_NAME}-rocm`;
    await deleteDeployment(
      makeDeployment({
        baseRefs: [{ name: localConfigName }],
        annotations: { [ACCELERATOR_CONFIG_REF_ANNOTATION]: localConfigName },
      }),
    );

    expect(deletedNames(LLMInferenceServiceModel)).toEqual([DEPLOYMENT_NAME]);
    expect(deletedNames(LLMInferenceServiceConfigModel)).toEqual([localConfigName]);
    expect(mockK8sDeleteResource).toHaveBeenCalledWith(
      expect.objectContaining({
        model: LLMInferenceServiceConfigModel,
        queryOptions: expect.objectContaining({ name: localConfigName, ns: NAMESPACE }),
      }),
    );
  });

  it('should not block deletion when the topology config is not found', async () => {
    const localConfigName = `${DEPLOYMENT_NAME}-multi-node-config`;
    mockK8sDeleteResource.mockImplementation((options) =>
      options.queryOptions?.name === localConfigName
        ? Promise.reject(k8sStatusError(404))
        : Promise.resolve({ kind: 'Status', status: 'Success' }),
    );

    await expect(
      deleteDeployment(
        makeDeployment({
          baseRefs: [{ name: localConfigName }],
          annotations: { [TOPOLOGY_CONFIG_REF_ANNOTATION]: localConfigName },
        }),
      ),
    ).resolves.toBeUndefined();

    expect(deletedNames(LLMInferenceServiceModel)).toEqual([DEPLOYMENT_NAME]);
  });

  it('should propagate non-404 errors from the topology config deletion', async () => {
    const localConfigName = `${DEPLOYMENT_NAME}-multi-node-config`;
    mockK8sDeleteResource.mockImplementation((options) =>
      options.queryOptions?.name === localConfigName
        ? Promise.reject(k8sStatusError(403))
        : Promise.resolve({ kind: 'Status', status: 'Success' }),
    );

    await expect(
      deleteDeployment(
        makeDeployment({
          baseRefs: [{ name: localConfigName }],
          annotations: { [TOPOLOGY_CONFIG_REF_ANNOTATION]: localConfigName },
        }),
      ),
    ).rejects.toThrow('Model deletion was accepted, but configuration cleanup failed.');
  });
});
