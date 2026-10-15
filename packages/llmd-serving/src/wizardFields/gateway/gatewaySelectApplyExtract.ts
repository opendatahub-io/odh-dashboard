import { GatewaySelectFieldData } from './GatewaySelectField';
import { LLMdDeployment } from '../../types';
import { isGatewayOption } from '../../api/services/gatewayDiscovery';

/**
 * Applies gateway selections to an LLMInferenceService deployment.
 * Sets the gateway refs to exactly the provided gateways.
 * Will remove any existing gateways when selections are empty.
 *
 * @param deployment - The deployment to apply the gateway selections to
 * @param fieldData - Field data containing the selected gateways
 * @returns The deployment with the gateways applied
 */
export const applyGatewaySelectData = (
  deployment: LLMdDeployment,
  fieldData?: GatewaySelectFieldData,
): LLMdDeployment => {
  const selections = fieldData?.selections ?? [];
  const result = structuredClone(deployment);

  result.model.spec.router = {
    ...result.model.spec.router,
    gateway:
      selections.length > 0
        ? {
            refs: selections.map((gateway) => ({
              // Strip listener and status from the gateway option
              name: gateway.name,
              namespace: gateway.namespace,
            })),
          }
        : {},
  };

  return result;
};

export const extractGatewaySelectData = (
  deployment: LLMdDeployment,
): GatewaySelectFieldData | undefined => {
  const refs = deployment.model.spec.router?.gateway?.refs;
  if (!refs?.length) {
    return undefined;
  }

  const selections = refs.filter(isGatewayOption).map((ref) => ({
    name: ref.name,
    namespace: ref.namespace,
  }));

  if (selections.length === 0) {
    return undefined;
  }

  return { selections };
};
