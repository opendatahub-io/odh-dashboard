import { useIsAreaAvailable } from '@odh-dashboard/internal/concepts/areas/index';
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';
import { DeploymentMode } from '@odh-dashboard/internal/k8sTypes';
import type { KServeDeployment } from './deployments';

// This isn't really a hook but I figure it should be used as one anyway
export const useKServePlatformAuthEnabled = (deployment?: KServeDeployment): boolean => {
  const isAuthAvailable = useIsAreaAvailable(SupportedArea.K_SERVE_AUTH).status;
  const isKServeRaw =
    deployment?.model.metadata.annotations?.['serving.kserve.io/deploymentMode'] ===
    DeploymentMode.RawDeployment;
  return isAuthAvailable || isKServeRaw;
};
