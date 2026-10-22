import { useDeployMethod } from './useDeployMethod';
import type { DeployMethodActivationInput } from '../../../../extension-points/deployment-wizard';

export const useIsDRAHardwareProfileSupported = (
  wizardData: DeployMethodActivationInput,
): boolean | undefined => {
  const { deployMethod, deployMethodLoaded } = useDeployMethod(wizardData);
  if (!deployMethodLoaded) {
    return undefined;
  }
  return !!deployMethod?.properties.supportsDRAHardwareProfiles;
};
