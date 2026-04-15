import { mockLLMInferenceServiceK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceK8sResource';
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
  it('should add the gateway ref when a selection is provided', () => {
    const deployment = makeDeployment();
    const result = applyGatewaySelectData(deployment, {
      selection: { name: 'my-gw', namespace: 'gw-ns' },
    });

    expect(result.model.spec.router?.gateway).toEqual({
      refs: [{ name: 'my-gw', namespace: 'gw-ns' }],
    });
  });

  it('should replace existing gateway refs with the new selection', () => {
    const deployment = makeDeployment({
      refs: [
        { name: 'old-gw-1', namespace: 'ns-a' },
        { name: 'old-gw-2', namespace: 'ns-b' },
      ],
    });

    const result = applyGatewaySelectData(deployment, {
      selection: { name: 'new-gw', namespace: 'ns-c' },
    });

    expect(result.model.spec.router?.gateway).toEqual({
      refs: [{ name: 'new-gw', namespace: 'ns-c' }],
    });
  });

  it('should set gateway to an empty object when no selection is provided', () => {
    const deployment = makeDeployment({
      refs: [{ name: 'existing-gw', namespace: 'ns-1' }],
    });

    const result = applyGatewaySelectData(deployment, { selection: undefined });

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
      selection: { name: 'new-gw', namespace: 'new-ns' },
    });

    expect(deployment.model.spec.router?.gateway?.refs).toEqual([{ name: 'gw', namespace: 'ns' }]);
  });
});

describe('extractGatewaySelectData', () => {
  it('should extract the first gateway ref from the deployment', () => {
    const deployment = makeDeployment({
      refs: [
        { name: 'gw-alpha', namespace: 'ns-1' },
        { name: 'gw-beta', namespace: 'ns-2' },
      ],
    });

    expect(extractGatewaySelectData(deployment)).toEqual({
      selection: { name: 'gw-alpha', namespace: 'ns-1' },
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

  it('should return undefined when a ref is missing name', () => {
    const deployment = makeDeployment({
      refs: [{ namespace: 'ns-1' }],
    });

    expect(extractGatewaySelectData(deployment)).toBeUndefined();
  });

  it('should return undefined when a ref is missing namespace', () => {
    const deployment = makeDeployment({
      refs: [{ name: 'gw-alpha' }],
    });

    expect(extractGatewaySelectData(deployment)).toBeUndefined();
  });
});
