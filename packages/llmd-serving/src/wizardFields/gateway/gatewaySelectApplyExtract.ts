import { GatewaySelectFieldData } from './GatewaySelectField';
import { LLMdDeployment } from '../../types';
import { isGatewayOption } from '../../api/services/gatewayDiscovery';

/**
 * Applies gateway selection to an LLMInferenceService deployment.
 * Sets the gateway refs to exactly the provided gateway.
 * Will remove any existing gateways
 *
 * @param deployment - The deployment to apply the gateway selection to
 * @param gateway - The gateway to apply to the deployment
 * @returns The deployment with the gateway applied
 */
export const applyGatewaySelectData = (
  deployment: LLMdDeployment,
  fieldData?: GatewaySelectFieldData,
): LLMdDeployment => {
  const gateway = fieldData?.selection;
  const result = structuredClone(deployment);

  // Remove any existing gateways
  result.model.spec.router = {
    ...result.model.spec.router,
    gateway: {},
  };

  if (gateway) {
    result.model.spec.router = {
      ...result.model.spec.router,
      gateway: {
        refs: [
          // Strip listener and status from the gateway option
          { name: gateway.name, namespace: gateway.namespace },
        ],
      },
    };
  }
  return result;
};

export const extractGatewaySelectData = (
  deployment: LLMdDeployment,
): GatewaySelectFieldData | undefined => {
  const refs = deployment.model.spec.router?.gateway?.refs;
  const ref = refs && refs.length > 0 ? refs[0] : undefined;

  if (!isGatewayOption(ref)) {
    return undefined;
  }

  return {
    selection: {
      name: ref.name,
      namespace: ref.namespace,
    },
  };
};
