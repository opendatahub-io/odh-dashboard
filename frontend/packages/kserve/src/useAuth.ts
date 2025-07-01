import { useIsAreaAvailable } from '@odh-dashboard/internal/concepts/areas/index';
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';
import { DeploymentMode } from '@odh-dashboard/internal/k8sTypes';
import type { KServeDeployment } from './deployments';

export const useKServeDeploymentAuthEnabled = (deployment: KServeDeployment): boolean =>
  deployment.model.metadata.annotations?.['security.opendatahub.io/enable-auth'] === 'true';

export const useKServePlatformAuthEnabled = (deployment?: KServeDeployment): boolean => {
  const isAuthAvailable = useIsAreaAvailable(SupportedArea.K_SERVE_AUTH).status;
  const isKServeRaw =
    deployment?.model.metadata.annotations?.['serving.kserve.io/deploymentMode'] ===
    DeploymentMode.RawDeployment;
  return isAuthAvailable || isKServeRaw;
};
