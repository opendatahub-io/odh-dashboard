import { mockLLMInferenceServiceK8sResource } from '@odh-dashboard/llmd-serving/__mocks__/mockLLMInferenceServiceK8sResource';
import { LLMdDeployment, LLMInferenceServiceKind } from '../../../types';
import { applyGatewaySelectData, extractGatewaySelectData } from '../gatewaySelectApplyExtract';

const makeDeployment = (
  gateway?: NonNullable<LLMInferenceServiceKind['spec']['router']>['gateway'],
): LLMdDeployment => {
  const model = mockLLMInferenceServiceK8sResource({});
  model.spec.router = { ...model.spec.router, gateway: gateway ?? {} };
  return { modelServingPlatformId: 'llmd-serving', model };
};

describe('applyGatewaySelectData', () => {
  it('should add gateway refs when selections are provided', () => {
    const deployment = makeDeployment();
    const result = applyGatewaySelectData(deployment, {
      selections: [{ name: 'my-gw', namespace: 'gw-ns' }],
    });

    expect(result.model.spec.router?.gateway).toEqual({
      refs: [{ name: 'my-gw', namespace: 'gw-ns' }],
    });
  });

  it('should apply multiple gateway refs from selections', () => {
    const deployment = makeDeployment();
    const result = applyGatewaySelectData(deployment, {
      selections: [
        { name: 'gw-1', namespace: 'ns-a' },
        { name: 'gw-2', namespace: 'ns-b' },
      ],
    });

    expect(result.model.spec.router?.gateway).toEqual({
      refs: [
        { name: 'gw-1', namespace: 'ns-a' },
        { name: 'gw-2', namespace: 'ns-b' },
      ],
    });
  });

  it('should replace existing gateway refs with the new selections', () => {
    const deployment = makeDeployment({
      refs: [
        { name: 'old-gw-1', namespace: 'ns-a' },
        { name: 'old-gw-2', namespace: 'ns-b' },
      ],
    });

    const result = applyGatewaySelectData(deployment, {
      selections: [{ name: 'new-gw', namespace: 'ns-c' }],
    });

    expect(result.model.spec.router?.gateway).toEqual({
      refs: [{ name: 'new-gw', namespace: 'ns-c' }],
    });
  });

  it('should set gateway to an empty object when selections are empty', () => {
    const deployment = makeDeployment({
      refs: [{ name: 'existing-gw', namespace: 'ns-1' }],
    });

    const result = applyGatewaySelectData(deployment, { selections: [] });

    expect(result.model.spec.router?.gateway).toEqual({});
  });

  it('should set gateway to an empty object when fieldData is undefined', () => {
    const deployment = makeDeployment({
      refs: [{ name: 'existing-gw', namespace: 'ns-1' }],
    });

    const result = applyGatewaySelectData(deployment);

    expect(result.model.spec.router?.gateway).toEqual({});
  });

  it('should not mutate the original deployment', () => {
    const deployment = makeDeployment({
      refs: [{ name: 'gw', namespace: 'ns' }],
    });

    applyGatewaySelectData(deployment, {
      selections: [{ name: 'new-gw', namespace: 'new-ns' }],
    });

    expect(deployment.model.spec.router?.gateway?.refs).toEqual([{ name: 'gw', namespace: 'ns' }]);
  });
});

describe('extractGatewaySelectData', () => {
  it('should extract all gateway refs from the deployment', () => {
    const deployment = makeDeployment({
      refs: [
        { name: 'gw-alpha', namespace: 'ns-1' },
        { name: 'gw-beta', namespace: 'ns-2' },
      ],
    });

    expect(extractGatewaySelectData(deployment)).toEqual({
      selections: [
        { name: 'gw-alpha', namespace: 'ns-1' },
        { name: 'gw-beta', namespace: 'ns-2' },
      ],
    });
  });

  it('should return undefined when refs is an empty array', () => {
    const deployment = makeDeployment({ refs: [] });

    expect(extractGatewaySelectData(deployment)).toBeUndefined();
  });

  it('should return undefined when gateway has no refs', () => {
    const deployment = makeDeployment({});

    expect(extractGatewaySelectData(deployment)).toBeUndefined();
  });

  it('should skip invalid refs and return valid selections', () => {
    const deployment = makeDeployment({
      refs: [{ namespace: 'ns-1' }, { name: 'gw-valid', namespace: 'ns-2' }],
    });

    expect(extractGatewaySelectData(deployment)).toEqual({
      selections: [{ name: 'gw-valid', namespace: 'ns-2' }],
    });
  });

  it('should return undefined when all refs are invalid', () => {
    const deployment = makeDeployment({
      refs: [{ namespace: 'ns-1' }, { name: 'gw-alpha' }],
    });

    expect(extractGatewaySelectData(deployment)).toBeUndefined();
  });
});
