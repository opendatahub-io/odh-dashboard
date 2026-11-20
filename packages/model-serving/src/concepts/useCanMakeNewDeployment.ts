import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { useKueueConfiguration } from '@odh-dashboard/hardware-profiles/shared';
import { useServingRuntimeTemplates } from './servingRuntimeTemplates/useServingRuntimeTemplates';
import { useModelServingDeployMethods } from './useModelServingDeployMethods';

/** Platforms whose deploy path still depends on serving-runtime templates. */
const PLATFORMS_REQUIRING_SERVING_RUNTIME_TEMPLATES = new Set(['kserve']);

export const useCanMakeNewDeployment = (
  project?: ProjectKind | null,
): {
  disabled: boolean;
  disabledReason: string;
} => {
  const { deployMethods, hasDeployMethods } = useModelServingDeployMethods();
  const isMissingDeployMethods = !hasDeployMethods;

  const { isKueueDisabled } = useKueueConfiguration(project ?? undefined);

  const [globalTemplates, globalTemplatesLoaded] = useServingRuntimeTemplates();
  const needsServingRuntimeTemplates = deployMethods.some((ext) =>
    PLATFORMS_REQUIRING_SERVING_RUNTIME_TEMPLATES.has(ext.properties.platform),
  );
  const isMissingTemplates =
    needsServingRuntimeTemplates && globalTemplates.length === 0 && globalTemplatesLoaded;

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
