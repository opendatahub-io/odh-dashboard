import React from 'react';
import { Link } from 'react-router-dom';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import type { Deployment } from '../../../extension-points';

const getMetricsUrl = (currentPath: string, deployment: Deployment) => {
  const firstPath = currentPath.split('/')[1];
  if (firstPath === 'modelServing') {
    return `/modelServing/${deployment.model.metadata.namespace}/metrics/${deployment.model.metadata.name}`;
  }
  return `/projects/${deployment.model.metadata.namespace}/metrics/model/${deployment.model.metadata.name}`;
};

export const DeploymentMetricsLink: React.FC<{
  deployment: Deployment;
}> = ({ deployment, ...props }) => {
  const currentPath = window.location.pathname;
  const metricsUrl = getMetricsUrl(currentPath, deployment);
  return (
    <Link to={metricsUrl} {...props}>
      {getDisplayNameFromK8sResource(deployment.model)}
    </Link>
  );
};
