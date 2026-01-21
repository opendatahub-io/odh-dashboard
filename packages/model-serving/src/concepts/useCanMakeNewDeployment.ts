import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { useKueueConfiguration } from '@odh-dashboard/internal/concepts/hardwareProfiles/kueueUtils';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { useServingRuntimeTemplates } from './servingRuntimeTemplates/useServingRuntimeTemplates';
import { isModelServingDeploy } from '../../extension-points';

export const useCanMakeNewDeployment = (
  project?: ProjectKind | null,
): {
  disabled: boolean;
  disabledReason: string;
} => {
  const deployMethods = useExtensions(isModelServingDeploy);
  const isMissingDeployMethods = deployMethods.length === 0;

  const { isKueueDisabled } = useKueueConfiguration(project ?? undefined);

  const [globalTemplates, globalTemplatesLoaded] = useServingRuntimeTemplates();
  const isMissingTemplates = globalTemplates.length === 0 && globalTemplatesLoaded;

  const disabled = isMissingTemplates || isKueueDisabled || isMissingDeployMethods;
  const disabledReason = isMissingTemplates
    ? 'At least one serving runtime must be enabled to deploy a model. Contact your administrator.'
    : isKueueDisabled
    ? 'Kueue is not enabled. Contact your administrator.'
    : isMissingDeployMethods
    ? 'At least one model serving platform must be enabled to deploy a model. Contact your administrator.'
    : 'Deploying a model is not possible. Contact your administrator.';

  return { disabled, disabledReason };
};
