import React from 'react';
import { Link, useLocation, matchPath } from 'react-router-dom';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/internal/concepts/areas';
import type { Deployment } from '../../../extension-points';

// Projects routes don't exist in project-less distributions (e.g. RHAII)
const getMetricsUrl = (currentPath: string, deployment: Deployment, hasProjects: boolean) => {
  if (matchPath('/ai-hub/models/deployments/*', currentPath)) {
    return `/ai-hub/models/deployments/${deployment.model.metadata.namespace}/metrics/${deployment.model.metadata.name}`;
  }
  if (hasProjects) {
    return `/projects/${deployment.model.metadata.namespace}/metrics/model/${deployment.model.metadata.name}`;
  }
  return undefined;
};

export const DeploymentMetricsLink: React.FC<{
  deployment: Deployment;
}> = ({ deployment, ...props }) => {
  const currentPath = useLocation().pathname;
  const hasProjects = useIsAreaAvailable(SupportedArea.DS_PROJECTS_VIEW).status;
  const metricsUrl = getMetricsUrl(currentPath, deployment, hasProjects);

  if (!metricsUrl) {
    return <span>{getDisplayNameFromK8sResource(deployment.model)}</span>;
  }

  return (
    <Link
      to={metricsUrl}
      data-testid={`metrics-link-${getDisplayNameFromK8sResource(deployment.model)}`}
      {...props}
    >
      {getDisplayNameFromK8sResource(deployment.model)}
    </Link>
  );
};
