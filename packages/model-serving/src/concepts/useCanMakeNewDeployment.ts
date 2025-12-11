import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { useKueueConfiguration } from '@odh-dashboard/internal/concepts/hardwareProfiles/kueueUtils';
import { useAvailableClusterPlatforms } from './useAvailableClusterPlatforms';
import { useServingRuntimeTemplates } from './servingRuntimeTemplates/useServingRuntimeTemplates';

export const useCanMakeNewDeployment = (
  project?: ProjectKind | null,
): {
  disabled: boolean;
  disabledReason: string;
} => {
  const { clusterPlatforms } = useAvailableClusterPlatforms();
  const isMissingPlatforms = clusterPlatforms.length === 0;

  const { isKueueDisabled } = useKueueConfiguration(project ?? undefined);

  const [globalTemplates, globalTemplatesLoaded] = useServingRuntimeTemplates();
  const isMissingTemplates = globalTemplates.length === 0 && globalTemplatesLoaded;

  const disabled = isMissingTemplates || isKueueDisabled || isMissingPlatforms;
  const disabledReason = isMissingTemplates
    ? 'At least one serving runtime must be enabled to deploy a model. Contact your administrator.'
    : isKueueDisabled
    ? 'Kueue is not enabled. Contact your administrator.'
    : isMissingPlatforms
    ? 'At least one platform must be enabled to deploy a model. Contact your administrator.'
    : 'Deploying a model is not possible. Contact your administrator.';

  return { disabled, disabledReason };
};
