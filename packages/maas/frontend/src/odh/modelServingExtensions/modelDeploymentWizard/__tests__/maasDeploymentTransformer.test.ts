import type { LLMdDeployment } from '@odh-dashboard/llmd-serving/types';
import type { MaaSFieldValue } from '~/odh/modelServingExtensions/modelDeploymentWizard/MaaSEndpointCheckbox';
import {
  applyMaaSEndpointData,
  extractMaaSEndpointData,
} from '~/odh/modelServingExtensions/modelDeploymentWizard/maasDeploymentTransformer';

const MAAS_DEFAULT_GATEWAY = {
  name: 'maas-default-gateway',
  namespace: 'openshift-ingress',
};

const createMockDeployment = (
  overrides: Partial<LLMdDeployment['model']> = {},
): LLMdDeployment => ({
  modelServingPlatformId: 'llmd-serving',
  model: {
    apiVersion: 'serving.kserve.io/v1alpha1',
    kind: 'LLMInferenceService',
    metadata: {
      name: 'test-deployment',
      namespace: 'test-namespace',
      annotations: {},
    },
    spec: {
      model: {
        uri: 's3://bucket/model',
      },
    },
    ...overrides,
  },
});

describe('maasDeploymentTransformer', () => {
  describe('applyMaaSEndpointData', () => {
    it('should not add gateway when MaaS is not enabled', () => {
      const deployment = createMockDeployment();
      const fieldData: MaaSFieldValue = { isChecked: false };

      const result = applyMaaSEndpointData(deployment, fieldData);

      expect(result.model.spec.router?.gateway?.refs).toBeUndefined();
    });

    it('should add maas-default-gateway when MaaS is enabled', () => {
      const deployment = createMockDeployment();
      const fieldData: MaaSFieldValue = { isChecked: true };

      const result = applyMaaSEndpointData(deployment, fieldData);

      expect(result.model.spec.router?.gateway?.refs).toEqual([MAAS_DEFAULT_GATEWAY]);
    });

    it('should preserve existing non-MaaS gateways when MaaS is enabled', () => {
      const existingGateway = { name: 'custom-gateway', namespace: 'custom-ns' };
      const deployment = createMockDeployment();
      deployment.model.spec.router = {
        gateway: {
          refs: [existingGateway],
        },
      };
      const fieldData: MaaSFieldValue = { isChecked: true };

      const result = applyMaaSEndpointData(deployment, fieldData);

      expect(result.model.spec.router?.gateway?.refs).toEqual([
        existingGateway,
        MAAS_DEFAULT_GATEWAY,
      ]);
    });

    it('should remove maas-default-gateway when MaaS is disabled', () => {
      const deployment = createMockDeployment();
      deployment.model.spec.router = {
        gateway: {
          refs: [MAAS_DEFAULT_GATEWAY],
        },
      };
      const fieldData: MaaSFieldValue = { isChecked: false };

      const result = applyMaaSEndpointData(deployment, fieldData);

      expect(result.model.spec.router?.gateway?.refs).toBeUndefined();
    });

    it('should keep other gateways when MaaS is disabled', () => {
      const existingGateway = { name: 'custom-gateway', namespace: 'custom-ns' };
      const deployment = createMockDeployment();
      deployment.model.spec.router = {
        gateway: {
          refs: [existingGateway, MAAS_DEFAULT_GATEWAY],
        },
      };
      const fieldData: MaaSFieldValue = { isChecked: false };

      const result = applyMaaSEndpointData(deployment, fieldData);

      expect(result.model.spec.router?.gateway?.refs).toEqual([existingGateway]);
    });

    it('should not mutate the original deployment', () => {
      const deployment = createMockDeployment();
      const originalRefs = deployment.model.spec.router?.gateway?.refs;
      const fieldData: MaaSFieldValue = { isChecked: true };

      applyMaaSEndpointData(deployment, fieldData);

      expect(deployment.model.spec.router?.gateway?.refs).toEqual(originalRefs);
    });

    it('should not duplicate maas-default-gateway if already present', () => {
      const deployment = createMockDeployment();
      deployment.model.spec.router = {
        gateway: {
          refs: [MAAS_DEFAULT_GATEWAY],
        },
      };
      const fieldData: MaaSFieldValue = { isChecked: true };

      const result = applyMaaSEndpointData(deployment, fieldData);

      expect(result.model.spec.router?.gateway?.refs).toEqual([MAAS_DEFAULT_GATEWAY]);
    });
  });

  describe('extractMaaSEndpointData', () => {
    it('should return undefined when no gateway refs exist', () => {
      const deployment = createMockDeployment();

      const result = extractMaaSEndpointData(deployment);

      expect(result).toBeUndefined();
    });

    it('should return undefined when maas-default-gateway is not present', () => {
      const deployment = createMockDeployment();
      deployment.model.spec.router = {
        gateway: {
          refs: [{ name: 'other-gateway', namespace: 'other-ns' }],
        },
      };

      const result = extractMaaSEndpointData(deployment);

      expect(result).toBeUndefined();
    });

    it('should return isChecked: true when maas-default-gateway is present', () => {
      const deployment = createMockDeployment();
      deployment.model.spec.router = {
        gateway: {
          refs: [MAAS_DEFAULT_GATEWAY],
        },
      };

      const result = extractMaaSEndpointData(deployment);

      expect(result).toEqual({ isChecked: true });
    });

    it('should return isChecked: true when maas-default-gateway is among other gateways', () => {
      const deployment = createMockDeployment();
      deployment.model.spec.router = {
        gateway: {
          refs: [{ name: 'other-gateway', namespace: 'other-ns' }, MAAS_DEFAULT_GATEWAY],
        },
      };

      const result = extractMaaSEndpointData(deployment);

      expect(result).toEqual({ isChecked: true });
    });
  });
});
