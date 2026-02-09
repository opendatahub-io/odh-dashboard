import type { LLMdDeployment } from '@odh-dashboard/llmd-serving/types';
import type { MaaSTierValue } from '../MaaSEndpointCheckbox';
import {
  applyMaaSEndpointData,
  extractMaaSEndpointData,
  MAAS_TIERS_ANNOTATION,
} from '../maasDeploymentTransformer';
import { TierDropdownOption } from '../MaaSEndpointCheckbox';

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
    it('should not add annotation when MaaS is not enabled', () => {
      const deployment = createMockDeployment();
      const fieldData: MaaSTierValue = { isChecked: false };

      const result = applyMaaSEndpointData(deployment, fieldData);

      expect(result.model.metadata.annotations?.[MAAS_TIERS_ANNOTATION]).toBeUndefined();
      expect(result.model.spec.router?.gateway?.refs).toBeUndefined();
    });

    it('should add "[]" annotation for all-tiers selection', () => {
      const deployment = createMockDeployment();
      const fieldData: MaaSTierValue = {
        isChecked: true,
        tiersDropdownSelection: TierDropdownOption.AllTiers,
        selectedTierNames: [],
      };

      const result = applyMaaSEndpointData(deployment, fieldData);

      expect(result.model.metadata.annotations?.[MAAS_TIERS_ANNOTATION]).toBe('[]');
      expect(result.model.spec.router?.gateway?.refs).toEqual([
        { name: 'maas-default-gateway', namespace: 'openshift-ingress' },
      ]);
    });

    it('should add "null" annotation for no-tiers selection', () => {
      const deployment = createMockDeployment();
      const fieldData: MaaSTierValue = {
        isChecked: true,
        tiersDropdownSelection: TierDropdownOption.NoTiers,
      };

      const result = applyMaaSEndpointData(deployment, fieldData);

      expect(result.model.metadata.annotations?.[MAAS_TIERS_ANNOTATION]).toBe('null');
      expect(result.model.spec.router?.gateway?.refs).toBeDefined();
    });

    it('should add JSON array annotation for specify-tiers selection', () => {
      const deployment = createMockDeployment();
      const fieldData: MaaSTierValue = {
        isChecked: true,
        tiersDropdownSelection: TierDropdownOption.SpecifyTiers,
        selectedTierNames: ['tier-1', 'tier-2'],
      };

      const result = applyMaaSEndpointData(deployment, fieldData);

      expect(result.model.metadata.annotations?.[MAAS_TIERS_ANNOTATION]).toBe(
        '["tier-1","tier-2"]',
      );
    });

    it('should preserve existing gateway refs when MaaS is enabled', () => {
      const existingGatewayRefs = [{ name: 'custom-gateway', namespace: 'custom-ns' }];
      const deployment = createMockDeployment();
      deployment.model.spec.router = {
        gateway: {
          refs: existingGatewayRefs,
        },
      };
      const fieldData: MaaSTierValue = {
        isChecked: true,
        tiersDropdownSelection: TierDropdownOption.AllTiers,
      };

      const result = applyMaaSEndpointData(deployment, fieldData);

      expect(result.model.spec.router?.gateway?.refs).toEqual(existingGatewayRefs);
    });

    it('should remove existing MaaS annotation when disabled', () => {
      const deployment = createMockDeployment();
      deployment.model.metadata.annotations = {
        [MAAS_TIERS_ANNOTATION]: '["old-tier"]',
      };
      const fieldData: MaaSTierValue = { isChecked: false };

      const result = applyMaaSEndpointData(deployment, fieldData);

      expect(result.model.metadata.annotations?.[MAAS_TIERS_ANNOTATION]).toBeUndefined();
    });

    it('should not mutate the original deployment', () => {
      const deployment = createMockDeployment();
      const originalAnnotations = { ...deployment.model.metadata.annotations };
      const fieldData: MaaSTierValue = {
        isChecked: true,
        tiersDropdownSelection: TierDropdownOption.AllTiers,
      };

      applyMaaSEndpointData(deployment, fieldData);

      expect(deployment.model.metadata.annotations).toEqual(originalAnnotations);
    });
  });

  describe('extractMaaSEndpointData', () => {
    it('should return undefined when no MaaS annotation exists', () => {
      const deployment = createMockDeployment();

      const result = extractMaaSEndpointData(deployment);

      expect(result).toBeUndefined();
    });

    it('should extract no-tiers value from "null" annotation', () => {
      const deployment = createMockDeployment();
      deployment.model.metadata.annotations = {
        [MAAS_TIERS_ANNOTATION]: 'null',
      };

      const result = extractMaaSEndpointData(deployment);

      expect(result).toEqual({
        isChecked: true,
        tiersDropdownSelection: 'no-tiers',
        selectedTierNames: undefined,
      });
    });

    it('should extract all-tiers value from "[]" annotation', () => {
      const deployment = createMockDeployment();
      deployment.model.metadata.annotations = {
        [MAAS_TIERS_ANNOTATION]: '[]',
      };

      const result = extractMaaSEndpointData(deployment);

      expect(result).toEqual({
        isChecked: true,
        tiersDropdownSelection: 'all-tiers',
        selectedTierNames: [],
      });
    });

    it('should extract specific tiers from JSON array annotation', () => {
      const deployment = createMockDeployment();
      deployment.model.metadata.annotations = {
        [MAAS_TIERS_ANNOTATION]: '["tier-a","tier-b"]',
      };

      const result = extractMaaSEndpointData(deployment);

      expect(result).toEqual({
        isChecked: true,
        tiersDropdownSelection: 'specify-tiers',
        selectedTierNames: ['tier-a', 'tier-b'],
      });
    });

    it('should return undefined for invalid JSON annotation', () => {
      const deployment = createMockDeployment();
      deployment.model.metadata.annotations = {
        [MAAS_TIERS_ANNOTATION]: 'invalid-json',
      };

      const result = extractMaaSEndpointData(deployment);

      expect(result).toBeUndefined();
    });
  });
});
