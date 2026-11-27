import React from 'react';
import { byName, type ProjectKind } from '@odh-dashboard/k8s-core';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
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

  // Where the host knows the caller's deploy permission, a project must be a
  // deployment target, and with no project selected at least one must exist.
  const { deploymentTargetProjects } = React.useContext(ProjectsContext);
  const isNotDeployTarget =
    !!deploymentTargetProjects &&
    (project
      ? !deploymentTargetProjects.some(byName(project.metadata.name))
      : deploymentTargetProjects.length === 0);

  const disabled =
    isMissingTemplates || isKueueDisabled || isMissingDeployMethods || isNotDeployTarget;
  const disabledReason = isNotDeployTarget
    ? project
      ? 'You cannot deploy models in this project.'
      : // Also when access could not be determined (discovery unavailable).
        'No project is available for deploying models.'
    : isMissingTemplates
    ? 'At least one serving runtime must be enabled to deploy a model. Contact your administrator.'
    : isKueueDisabled
    ? 'Kueue is not enabled. Contact your administrator.'
    : isMissingDeployMethods
    ? 'At least one model serving platform must be enabled to deploy a model. Contact your administrator.'
    : 'Deploying a model is not possible. Contact your administrator.';

  return { disabled, disabledReason };
};
