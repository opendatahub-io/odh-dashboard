import type { LLMdDeployment } from '@odh-dashboard/llmd-serving/types';
import type { MaaSFieldValue } from './MaaSEndpointCheckbox';

export const MAAS_DEFAULT_GATEWAY = {
  name: 'maas-default-gateway',
  namespace: 'openshift-ingress',
};

const isMaaSGateway = (ref: { name?: string; namespace?: string }): boolean =>
  ref.name === MAAS_DEFAULT_GATEWAY.name && ref.namespace === MAAS_DEFAULT_GATEWAY.namespace;

/**
 * Applies MaaS endpoint configuration to an LLMInferenceService deployment.
 * When enabled, adds the maas-default-gateway to the router gateway refs.
 * When disabled, removes the maas-default-gateway from the router gateway refs.
 */
export const applyMaaSEndpointData = (
  deployment: LLMdDeployment,
  fieldData: MaaSFieldValue,
): LLMdDeployment => {
  const result = structuredClone(deployment);
  const existingRefs = result.model.spec.router?.gateway?.refs ?? [];

  // Remove any existing MaaS gateway
  const filteredRefs = existingRefs.filter((ref) => !isMaaSGateway(ref));

  if (fieldData.isChecked) {
    // Add the MaaS gateway and remove the enable-auth annotation — MaaS manages auth externally
    result.model.spec.router = {
      ...result.model.spec.router,
      gateway: {
        ...result.model.spec.router?.gateway,
        refs: [...filteredRefs, MAAS_DEFAULT_GATEWAY],
      },
    };
    delete result.model.metadata.annotations?.['security.opendatahub.io/enable-auth'];
  } else if (filteredRefs.length > 0) {
    // Keep other gateways if they exist
    result.model.spec.router = {
      ...result.model.spec.router,
      gateway: {
        ...result.model.spec.router?.gateway,
        refs: filteredRefs,
      },
    };
  } else if (result.model.spec.router?.gateway?.refs !== undefined) {
    // Remove empty refs array
    delete result.model.spec.router.gateway.refs;
  }

  return result;
};

/**
 * Extracts MaaS endpoint configuration from an LLMInferenceService deployment.
 * Returns isChecked: true if the maas-default-gateway is present in the router gateway refs.
 */
export const extractMaaSEndpointData = (deployment: LLMdDeployment): MaaSFieldValue | undefined => {
  const refs = deployment.model.spec.router?.gateway?.refs ?? [];
  const hasMaaSGateway = refs.some(isMaaSGateway);

  if (!hasMaaSGateway) {
    return undefined;
  }

  return { isChecked: true };
};
