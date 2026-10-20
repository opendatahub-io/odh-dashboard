import type { WizardFormData } from '@odh-dashboard/model-serving/shared/types/form-data';
import type { GatewayOption } from '../../api/services/gatewayDiscovery';
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

  it('should derive properties from gateway field selections', () => {
    expect(
      getLlmdWizardTrackingProperties(
        wizardState({
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
