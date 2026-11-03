import type { WizardFormData } from '@odh-dashboard/model-serving/shared/types/form-data';
import type { GatewayOption } from '@odh-dashboard/model-serving/shared/api/gatewayDiscovery';
import {
  ACCELERATOR_CONFIG_DEFAULT,
  ACCELERATOR_CONFIG_FIELD_ID,
  CUSTOM_TOPOLOGY_CONFIG_FIELD_ID,
  TOPOLOGY_TYPE_FIELD_ID,
  LLMD_GATEWAY_FIELD_ID,
  LLMD_ROUTING_FIELD_ID,
} from '../../const';
import { TopologyType } from '../../types';
import {
  getLlmdGatewayTrackingProperties,
  extractLlmdDeploymentTrackingProperties,
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

describe('extractLlmdDeploymentTrackingProperties', () => {
  it('should return empty properties when the gateway field is absent', () => {
    expect(extractLlmdDeploymentTrackingProperties(wizardState({}))).toEqual({});
  });

  it('should return empty properties when gateway field data is invalid', () => {
    expect(
      extractLlmdDeploymentTrackingProperties(
        wizardState({
          [LLMD_GATEWAY_FIELD_ID]: { selections: [{ name: 'gw-only' }] },
        }),
      ),
    ).toEqual({});
  });

  it('should derive composable properties without gateway data', () => {
    expect(
      extractLlmdDeploymentTrackingProperties(
        wizardState({
          deploymentMethod: { method: 'llm-inference-service-llmd' },
          [TOPOLOGY_TYPE_FIELD_ID]: { topologyType: TopologyType.MULTI_NODE_DISAGGREGATED },
          [CUSTOM_TOPOLOGY_CONFIG_FIELD_ID]: {
            selectedConfig: { metadata: { name: 'topology-config' } },
          },
          hardwareProfileConfig: {
            formData: { selectedProfile: { metadata: { name: 'gpu-profile' } } },
          },
          [ACCELERATOR_CONFIG_FIELD_ID]: {
            selectedConfig: { metadata: { name: 'accelerator-config' } },
          },
          [LLMD_ROUTING_FIELD_ID]: {
            selectedConfig: { metadata: { name: 'routing-config' } },
          },
        }),
      ),
    ).toEqual({
      llmdComposablePattern: TopologyType.MULTI_NODE_DISAGGREGATED,
      isDefaultTopology: false,
      isDefaultAccelerator: false,
      isDefaultRouting: false,
    });
  });

  it.each([true, false])(
    'should never report hardware-profile names with useExistingSettings=%s',
    (useExistingSettings) => {
      expect(
        extractLlmdDeploymentTrackingProperties(
          wizardState({
            hardwareProfileConfig: {
              formData: {
                useExistingSettings,
                selectedProfile: { metadata: { name: 'user-provided-profile-name' } },
              },
            },
          }),
        ),
      ).toEqual({});
    },
  );

  it.each([undefined, null, 'malformed', {}])(
    'should not invent a default for unresolved topology data %p',
    (config) => {
      expect(
        extractLlmdDeploymentTrackingProperties(
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
        extractLlmdDeploymentTrackingProperties(
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
      extractLlmdDeploymentTrackingProperties(
        wizardState({
          [TOPOLOGY_TYPE_FIELD_ID]: { topologyType: TopologyType.MULTI_NODE },
          [CUSTOM_TOPOLOGY_CONFIG_FIELD_ID]: { configRef: 'existing-topology' },
          [ACCELERATOR_CONFIG_FIELD_ID]: { configRef: 'existing-accelerator' },
          [LLMD_ROUTING_FIELD_ID]: { configRef: 'existing-routing' },
        }),
      ),
    ).toEqual({
      llmdComposablePattern: TopologyType.MULTI_NODE,
      isDefaultTopology: false,
      isDefaultAccelerator: false,
      isDefaultRouting: false,
    });
  });

  it.each([null, 'invalid', {}, { metadata: null }, { metadata: 5 }])(
    'should not replace a malformed selected config %p with an edit reference',
    (selectedConfig) => {
      const result = extractLlmdDeploymentTrackingProperties(
        wizardState({
          [TOPOLOGY_TYPE_FIELD_ID]: { topologyType: TopologyType.MULTI_NODE },
          [CUSTOM_TOPOLOGY_CONFIG_FIELD_ID]: { selectedConfig, configRef: 'stale-topology' },
          [ACCELERATOR_CONFIG_FIELD_ID]: { selectedConfig, configRef: 'stale-accelerator' },
          [LLMD_ROUTING_FIELD_ID]: { selectedConfig, configRef: 'stale-routing' },
        }),
      );
      expect(result).toStrictEqual({ llmdComposablePattern: TopologyType.MULTI_NODE });
    },
  );

  it('should classify a shaped selected resource without reading or reporting its name', () => {
    expect(
      extractLlmdDeploymentTrackingProperties(
        wizardState({
          [TOPOLOGY_TYPE_FIELD_ID]: { topologyType: TopologyType.MULTI_NODE },
          [CUSTOM_TOPOLOGY_CONFIG_FIELD_ID]: { selectedConfig: { metadata: { name: '' } } },
          [ACCELERATOR_CONFIG_FIELD_ID]: { selectedConfig: { metadata: { name: 'private-name' } } },
          [LLMD_ROUTING_FIELD_ID]: { selectedConfig: { metadata: { name: 'private-routing' } } },
        }),
      ),
    ).toStrictEqual({
      llmdComposablePattern: TopologyType.MULTI_NODE,
      isDefaultTopology: false,
      isDefaultAccelerator: false,
      isDefaultRouting: false,
    });
  });

  it('should not replace incompatible topology or invalid default selections with edit references', () => {
    for (const selectedConfig of [
      'default',
      {
        metadata: {
          name: 'wrong-topology',
          labels: { 'opendatahub.io/config-type': TopologyType.SINGLE_NODE },
        },
      },
    ]) {
      expect(
        extractLlmdDeploymentTrackingProperties(
          wizardState({
            [TOPOLOGY_TYPE_FIELD_ID]: { topologyType: TopologyType.MULTI_NODE },
            [CUSTOM_TOPOLOGY_CONFIG_FIELD_ID]: { selectedConfig, configRef: 'stale-topology' },
          }),
        ),
      ).toStrictEqual({ llmdComposablePattern: TopologyType.MULTI_NODE });
    }
  });

  it('should report explicit built-in defaults and preserve zero replicas', () => {
    expect(
      extractLlmdDeploymentTrackingProperties(
        wizardState({
          [TOPOLOGY_TYPE_FIELD_ID]: { topologyType: TopologyType.SINGLE_NODE },
          [CUSTOM_TOPOLOGY_CONFIG_FIELD_ID]: { selectedConfig: 'default' },
          [ACCELERATOR_CONFIG_FIELD_ID]: { selectedConfig: ACCELERATOR_CONFIG_DEFAULT },
          [LLMD_ROUTING_FIELD_ID]: {},
        }),
      ),
    ).toEqual({
      llmdComposablePattern: TopologyType.SINGLE_NODE,
      isDefaultTopology: true,
      isDefaultAccelerator: true,
      isDefaultRouting: true,
    });
  });

  it('should omit malformed or unresolved property values', () => {
    expect(
      extractLlmdDeploymentTrackingProperties(
        wizardState({
          deploymentMethod: { method: 2 },
          [TOPOLOGY_TYPE_FIELD_ID]: { topologyType: 'invalid' },
          hardwareProfileConfig: { formData: { selectedProfile: { metadata: { name: 5 } } } },
          numReplicas: { data: Number.NaN },
          [ACCELERATOR_CONFIG_FIELD_ID]: { selectedConfig: { metadata: null } },
          [LLMD_ROUTING_FIELD_ID]: { selectedConfig: null },
        }),
      ),
    ).toEqual({});
  });

  it('should derive properties from gateway field selections alongside composable data', () => {
    expect(
      extractLlmdDeploymentTrackingProperties(
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
      numberOfGateways: 2,
      usesMaasDefault: false,
      usesOpenShiftInference: true,
      usesCustomGateway: true,
    });
  });
});
