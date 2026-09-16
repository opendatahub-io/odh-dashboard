import { K8sStatusError } from '@odh-dashboard/k8s-core';
import { applyConfigRef, createLocalConfigName, preDeployConfigCopy } from '../configs';
import { type LLMdDeployment, type LLMInferenceServiceConfigKind } from '../../types';
import * as configApi from '../../api/LLMInferenceServiceConfigs';

jest.mock('../../api/LLMInferenceServiceConfigs');

const createSpy = jest.mocked(configApi.createLLMInferenceServiceConfig);
const deleteSpy = jest.mocked(configApi.deleteLLMInferenceServiceConfig);

const ANN = 'opendatahub.io/test-config-ref';

const makeDeployment = (overrides?: Partial<LLMdDeployment['model']['spec']>): LLMdDeployment => ({
  modelServingPlatformId: 'llmd-serving',
  model: {
    apiVersion: 'serving.kserve.io/v1alpha2',
    kind: 'LLMInferenceService',
    metadata: { name: 'my-deployment', namespace: 'ns', annotations: {} },
    spec: { model: { uri: '', name: 'my-deployment' }, router: { scheduler: {} }, ...overrides },
  },
});

const makeConfig = (name: string): LLMInferenceServiceConfigKind => ({
  apiVersion: 'serving.kserve.io/v1alpha2',
  kind: 'LLMInferenceServiceConfig',
  metadata: { name, namespace: 'dashboard', labels: {} },
});

const opts = {
  annotationKey: ANN,
  configName: createLocalConfigName,
};

describe('applyConfigRef', () => {
  it('adds a baseRef and annotation for a selected config', () => {
    const result = applyConfigRef(
      makeDeployment(),
      { selectedConfig: makeConfig('accel-a') },
      opts,
    );
    expect(result.model.spec.baseRefs).toEqual([{ name: 'my-deployment-accel-a' }]);
    expect(result.model.metadata.annotations?.[ANN]).toBe('my-deployment-accel-a');
  });

  it('does not touch spec.router.scheduler', () => {
    const result = applyConfigRef(
      makeDeployment(),
      { selectedConfig: makeConfig('accel-a') },
      opts,
    );
    expect(result.model.spec.router?.scheduler).toEqual({});
  });

  it('replaces a previous ref when switching configs', () => {
    const prev = applyConfigRef(makeDeployment(), { selectedConfig: makeConfig('accel-a') }, opts);
    const next = applyConfigRef(prev, { selectedConfig: makeConfig('accel-b') }, opts);
    expect(next.model.spec.baseRefs).toEqual([{ name: 'my-deployment-accel-b' }]);
    expect(next.model.metadata.annotations?.[ANN]).toBe('my-deployment-accel-b');
  });

  it('removes the ref and annotation for a placeholder selection', () => {
    const prev = applyConfigRef(makeDeployment(), { selectedConfig: makeConfig('accel-a') }, opts);
    const next = applyConfigRef(
      prev,
      { selectedConfig: 'default' },
      { ...opts, isDefaultPlaceholder: (c) => c === 'default' },
    );
    expect(next.model.spec.baseRefs ?? []).toEqual([]);
    expect(next.model.metadata.annotations?.[ANN]).toBeUndefined();
  });

  it('leaves the deployment unchanged when configRef is set but unresolved', () => {
    const deployment = makeDeployment();
    const result = applyConfigRef(deployment, { configRef: 'x' }, opts);
    expect(result).toEqual(deployment);
  });
});

describe('preDeployConfigCopy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createSpy.mockResolvedValue({} as LLMInferenceServiceConfigKind);
    deleteSpy.mockResolvedValue({} as never);
  });

  const withAnnotation = (name?: string): LLMdDeployment => {
    const d = makeDeployment();
    d.model.metadata.annotations = name ? { [ANN]: name } : {};
    return d;
  };

  it('clones the selected config into the deployment namespace', async () => {
    await preDeployConfigCopy(
      { annotationKey: ANN },
      { selectedConfig: makeConfig('accel-a') },
      withAnnotation('my-deployment-accel-a'),
    );
    expect(createSpy).toHaveBeenCalledTimes(1);
    const [created] = createSpy.mock.calls[0];
    expect(created.metadata.name).toBe('my-deployment-accel-a');
    expect(created.metadata.namespace).toBe('ns');
  });

  it('deletes the old copy when switching configs', async () => {
    await preDeployConfigCopy(
      { annotationKey: ANN },
      { selectedConfig: makeConfig('accel-b') },
      withAnnotation('my-deployment-accel-b'),
      withAnnotation('my-deployment-accel-a'),
    );
    expect(deleteSpy).toHaveBeenCalledWith('my-deployment-accel-a', 'ns', { dryRun: undefined });
    expect(createSpy).toHaveBeenCalledTimes(1);
  });

  it('creates the new copy before deleting the old one', async () => {
    const order: string[] = [];
    createSpy.mockImplementation(async () => {
      order.push('create');
      return {} as LLMInferenceServiceConfigKind;
    });
    deleteSpy.mockImplementation(async () => {
      order.push('delete');
      return {} as never;
    });
    await preDeployConfigCopy(
      { annotationKey: ANN },
      { selectedConfig: makeConfig('accel-b') },
      withAnnotation('my-deployment-accel-b'),
      withAnnotation('my-deployment-accel-a'),
    );
    expect(order).toEqual(['create', 'delete']);
  });

  it('does not delete the old copy when creating the new one fails', async () => {
    // A non-409 create failure must leave the previous copy intact so the deployment never ends up
    // referencing a config that was already deleted.
    createSpy.mockRejectedValue(
      new K8sStatusError({
        apiVersion: 'v1',
        kind: 'Status',
        status: 'Failure',
        code: 500,
        message: 'server error',
        reason: 'InternalError',
      }),
    );
    await expect(
      preDeployConfigCopy(
        { annotationKey: ANN },
        { selectedConfig: makeConfig('accel-b') },
        withAnnotation('my-deployment-accel-b'),
        withAnnotation('my-deployment-accel-a'),
      ),
    ).rejects.toThrow();
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('does not clone for a placeholder selection', async () => {
    await preDeployConfigCopy(
      { annotationKey: ANN, isDefaultPlaceholder: (c) => c === 'default' },
      { selectedConfig: 'default' },
      withAnnotation(undefined),
    );
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('swallows a 409 on create', async () => {
    createSpy.mockRejectedValue(
      new K8sStatusError({
        apiVersion: 'v1',
        kind: 'Status',
        status: 'Failure',
        code: 409,
        message: 'already exists',
        reason: 'AlreadyExists',
      }),
    );
    await expect(
      preDeployConfigCopy(
        { annotationKey: ANN },
        { selectedConfig: makeConfig('accel-a') },
        withAnnotation('my-deployment-accel-a'),
      ),
    ).resolves.toBeDefined();
  });

  it('swallows a 404 on delete', async () => {
    deleteSpy.mockRejectedValue(
      new K8sStatusError({
        apiVersion: 'v1',
        kind: 'Status',
        status: 'Failure',
        code: 404,
        message: 'not found',
        reason: 'NotFound',
      }),
    );
    await expect(
      preDeployConfigCopy(
        { annotationKey: ANN },
        { selectedConfig: makeConfig('accel-b') },
        withAnnotation('my-deployment-accel-b'),
        withAnnotation('my-deployment-accel-a'),
      ),
    ).resolves.toBeDefined();
    expect(createSpy).toHaveBeenCalledTimes(1);
  });
});
