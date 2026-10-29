import type { WizardFormData } from '@odh-dashboard/model-serving/shared/types/form-data';
import type { GatewayOption } from '../../api/services/gatewayDiscovery';
import {
  ACCELERATOR_CONFIG_DEFAULT,
  ACCELERATOR_CONFIG_FIELD_ID,
  CUSTOM_TOPOLOGY_CONFIG_FIELD_ID,
  TOPOLOGY_TYPE_FIELD_ID,
} from '../../const';
import { TopologyType } from '../../types';
import {
  getLlmdGatewayTrackingProperties,
  getLlmdWizardTrackingProperties,
  LLMD_GATEWAY_FIELD_ID,
  MAAS_DEFAULT_GATEWAY_REF,
  OPENSHIFT_AI_INFERENCE_GATEWAY_REF,
} from '../llmdWizardTracking';

const wizardState = (fields: Record<string, unknown>): WizardFormData['state'] =>
  fields as WizardFormData['state'];

const gateway = (name: string, namespace: string): GatewayOption => ({ name, namespace });

describe('getLlmdGatewayTrackingProperties', () => {
  it('should report zeros and false flags when no gateways are selected', () => {
    expect(getLlmdGatewayTrackingProperties([])).toEqual({
      numberOfGateways: 0,
      usesMaasDefault: false,
      usesOpenShiftInference: false,
      usesCustomGateway: false,
    });
  });

  it('should flag MaaS default only when that gateway is selected', () => {
    expect(
      getLlmdGatewayTrackingProperties([
        gateway(MAAS_DEFAULT_GATEWAY_REF.name, MAAS_DEFAULT_GATEWAY_REF.namespace),
      ]),
    ).toEqual({
      numberOfGateways: 1,
      usesMaasDefault: true,
      usesOpenShiftInference: false,
      usesCustomGateway: false,
    });
  });

  it('should flag OpenShift AI inference only when that gateway is selected', () => {
    expect(
      getLlmdGatewayTrackingProperties([
        gateway(
          OPENSHIFT_AI_INFERENCE_GATEWAY_REF.name,
          OPENSHIFT_AI_INFERENCE_GATEWAY_REF.namespace,
        ),
      ]),
    ).toEqual({
      numberOfGateways: 1,
      usesMaasDefault: false,
      usesOpenShiftInference: true,
      usesCustomGateway: false,
    });
  });

  it('should flag custom gateways and count multiple selections', () => {
    expect(
      getLlmdGatewayTrackingProperties([
        gateway('team-gateway', 'my-ns'),
        gateway(MAAS_DEFAULT_GATEWAY_REF.name, MAAS_DEFAULT_GATEWAY_REF.namespace),
      ]),
    ).toEqual({
      numberOfGateways: 2,
      usesMaasDefault: true,
      usesOpenShiftInference: false,
      usesCustomGateway: true,
    });
  });

  it('should treat same name in a non-default namespace as custom', () => {
    expect(
      getLlmdGatewayTrackingProperties([gateway(MAAS_DEFAULT_GATEWAY_REF.name, 'other-ns')]),
    ).toEqual({
      numberOfGateways: 1,
      usesMaasDefault: false,
      usesOpenShiftInference: false,
      usesCustomGateway: true,
    });
  });

  it('should flag both defaults without custom when only platform defaults are selected', () => {
    expect(
      getLlmdGatewayTrackingProperties([
        gateway(MAAS_DEFAULT_GATEWAY_REF.name, MAAS_DEFAULT_GATEWAY_REF.namespace),
        gateway(
          OPENSHIFT_AI_INFERENCE_GATEWAY_REF.name,
          OPENSHIFT_AI_INFERENCE_GATEWAY_REF.namespace,
        ),
      ]),
    ).toEqual({
      numberOfGateways: 2,
      usesMaasDefault: true,
      usesOpenShiftInference: true,
      usesCustomGateway: false,
    });
  });
});

describe('getLlmdWizardTrackingProperties', () => {
  it('should return empty properties when the gateway field is absent', () => {
    expect(getLlmdWizardTrackingProperties(wizardState({}))).toEqual({});
  });

  it('should return empty properties when gateway field data is invalid', () => {
    expect(
      getLlmdWizardTrackingProperties(
        wizardState({
          [LLMD_GATEWAY_FIELD_ID]: { selections: [{ name: 'gw-only' }] },
        }),
      ),
    ).toEqual({});
  });

  it('should derive composable properties without gateway data', () => {
    expect(
      getLlmdWizardTrackingProperties(
        wizardState({
          deploymentMethod: { method: 'llm-inference-service-llmd' },
          [TOPOLOGY_TYPE_FIELD_ID]: { topologyType: TopologyType.MULTI_NODE_DISAGGREGATED },
          [CUSTOM_TOPOLOGY_CONFIG_FIELD_ID]: {
            selectedConfig: { metadata: { name: 'topology-config' } },
          },
          hardwareProfileConfig: {
            formData: { selectedProfile: { metadata: { name: 'gpu-profile' } } },
          },
          numReplicas: { data: 3 },
          [ACCELERATOR_CONFIG_FIELD_ID]: {
            selectedConfig: { metadata: { name: 'accelerator-config' } },
          },
          'llmd-serving/advanced-routing': {
            selectedConfig: { metadata: { name: 'routing-config' } },
          },
        }),
      ),
    ).toEqual({
      deploymentMethod: 'llm-inference-service-llmd',
      llmdComposablePattern: TopologyType.MULTI_NODE_DISAGGREGATED,
      topologyConfigurationId: 'topology-config',
      hardwareProfile: 'gpu-profile',
      replicaCount: 3,
      acceleratorConfigurationId: 'accelerator-config',
      routingConfigurationId: 'routing-config',
    });
  });

  it('should omit a retained hardware profile when using existing settings', () => {
    expect(
      getLlmdWizardTrackingProperties(
        wizardState({
          hardwareProfileConfig: {
            formData: {
              useExistingSettings: true,
              selectedProfile: { metadata: { name: 'unused-profile' } },
            },
          },
        }),
      ),
    ).toEqual({});
  });

  it.each([undefined, null, 'malformed', {}])(
    'should not invent a default for unresolved topology data %p',
    (config) => {
      expect(
        getLlmdWizardTrackingProperties(
          wizardState({
            [TOPOLOGY_TYPE_FIELD_ID]: { topologyType: TopologyType.SINGLE_NODE },
            [CUSTOM_TOPOLOGY_CONFIG_FIELD_ID]: config,
          }),
        ),
      ).toEqual({ llmdComposablePattern: TopologyType.SINGLE_NODE });
    },
  );

  it('should omit defaults and selected configs incompatible with the topology', () => {
    for (const selectedConfig of [
      'default',
      {
        metadata: {
          name: 'wrong-config',
          labels: { 'opendatahub.io/config-type': TopologyType.SINGLE_NODE },
        },
      },
    ]) {
      expect(
        getLlmdWizardTrackingProperties(
          wizardState({
            [TOPOLOGY_TYPE_FIELD_ID]: { topologyType: TopologyType.MULTI_NODE },
            [CUSTOM_TOPOLOGY_CONFIG_FIELD_ID]: { selectedConfig },
          }),
        ),
      ).toEqual({ llmdComposablePattern: TopologyType.MULTI_NODE });
    }
  });

  it('should preserve extracted edit references without fetching resources', () => {
    expect(
      getLlmdWizardTrackingProperties(
        wizardState({
          [TOPOLOGY_TYPE_FIELD_ID]: { topologyType: TopologyType.MULTI_NODE },
          [CUSTOM_TOPOLOGY_CONFIG_FIELD_ID]: { configRef: 'existing-topology' },
          [ACCELERATOR_CONFIG_FIELD_ID]: { configRef: 'existing-accelerator' },
          'llmd-serving/advanced-routing': { configRef: 'existing-routing' },
        }),
      ),
    ).toEqual({
      llmdComposablePattern: TopologyType.MULTI_NODE,
      topologyConfigurationId: 'existing-topology',
      acceleratorConfigurationId: 'existing-accelerator',
      routingConfigurationId: 'existing-routing',
    });
  });

  it.each(Object.values(TopologyType))(
    'should report the serving/decode replica count for %s',
    (topologyType) => {
      expect(
        getLlmdWizardTrackingProperties(
          wizardState({
            [TOPOLOGY_TYPE_FIELD_ID]: { topologyType },
            numReplicas: { data: 4 },
          }),
        ),
      ).toEqual({ llmdComposablePattern: topologyType, replicaCount: 4 });
    },
  );

  it('should report explicit built-in defaults and preserve zero replicas', () => {
    expect(
      getLlmdWizardTrackingProperties(
        wizardState({
          [TOPOLOGY_TYPE_FIELD_ID]: { topologyType: TopologyType.SINGLE_NODE },
          [CUSTOM_TOPOLOGY_CONFIG_FIELD_ID]: { selectedConfig: 'default' },
          [ACCELERATOR_CONFIG_FIELD_ID]: { selectedConfig: ACCELERATOR_CONFIG_DEFAULT },
          'llmd-serving/advanced-routing': {},
          numReplicas: { data: 0 },
        }),
      ),
    ).toEqual({
      llmdComposablePattern: TopologyType.SINGLE_NODE,
      topologyConfigurationId: 'default',
      acceleratorConfigurationId: 'default',
      routingConfigurationId: '__default-optimized-routing__',
      replicaCount: 0,
    });
  });

  it('should omit malformed or unresolved property values', () => {
    expect(
      getLlmdWizardTrackingProperties(
        wizardState({
          deploymentMethod: { method: 2 },
          [TOPOLOGY_TYPE_FIELD_ID]: { topologyType: 'invalid' },
          hardwareProfileConfig: { formData: { selectedProfile: { metadata: { name: 5 } } } },
          numReplicas: { data: Number.NaN },
          [ACCELERATOR_CONFIG_FIELD_ID]: { selectedConfig: { metadata: { name: '' } } },
          'llmd-serving/advanced-routing': { selectedConfig: null },
        }),
      ),
    ).toEqual({});
  });

  it('should derive properties from gateway field selections alongside composable data', () => {
    expect(
      getLlmdWizardTrackingProperties(
        wizardState({
          deploymentMethod: { method: 'llm-inference-service-llmd' },
          [LLMD_GATEWAY_FIELD_ID]: {
            selections: [
              gateway('custom-gw', 'custom-ns'),
              gateway(
                OPENSHIFT_AI_INFERENCE_GATEWAY_REF.name,
                OPENSHIFT_AI_INFERENCE_GATEWAY_REF.namespace,
              ),
            ],
          },
        }),
      ),
    ).toEqual({
      deploymentMethod: 'llm-inference-service-llmd',
      numberOfGateways: 2,
      usesMaasDefault: false,
      usesOpenShiftInference: true,
      usesCustomGateway: true,
    });
  });
});
