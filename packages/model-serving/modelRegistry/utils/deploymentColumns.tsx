import React from 'react';
import { Link } from 'react-router-dom';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import type { DeploymentsTableColumn, Deployment } from '../../extension-points';

const getVersionName = (deployment: Deployment): string => {
  // 1. Prefer explicit annotation for version name (most reliable human-readable name)
  const versionNameAnnotation =
    deployment.model.metadata.annotations?.['modelregistry.opendatahub.io/model-version-name'];
  if (versionNameAnnotation) {
    return versionNameAnnotation;
  }

  // 2. Parse deployment name for human-readable version - more flexible but still safe
  const deploymentName = getDisplayNameFromK8sResource(deployment.model);
  // Look for " - " (space-hyphen-space) pattern but be more flexible with surrounding content
  const versionMatch = deploymentName.match(/^.+?\s-\s(.+)$/);
  if (versionMatch?.[1]) {
    return versionMatch[1];
  }

  // 3. Last resort: version ID from labels (likely UUID, not ideal for display)
  const versionId =
    deployment.model.metadata.labels?.['modelregistry.opendatahub.io/model-version-id'];
  if (versionId) {
    return versionId;
  }

  return 'Unknown';
};

const getVersionLink = (
  deployment: Deployment,
  preferredModelRegistryName?: string,
): string | null => {
  const registeredModelId =
    deployment.model.metadata.labels?.['modelregistry.opendatahub.io/registered-model-id'];
  const versionId =
    deployment.model.metadata.labels?.['modelregistry.opendatahub.io/model-version-id'];

  if (registeredModelId && versionId) {
    const registryPath = preferredModelRegistryName || '';
    return `/model-registry/${registryPath}/registeredModels/${registeredModelId}/versions/${versionId}`;
  }

  return null;
};

export const createVersionColumn = (
  preferredModelRegistryName?: string,
): DeploymentsTableColumn<Deployment> => ({
  field: 'version',
  label: 'Version name',
  sortable: (deploymentA: Deployment, deploymentB: Deployment) =>
    getVersionName(deploymentA).localeCompare(getVersionName(deploymentB)),
  cellRenderer: (deployment: Deployment) => {
    const versionName = getVersionName(deployment);
    const versionLink = getVersionLink(deployment, preferredModelRegistryName);

    return versionLink ? (
      <Link to={versionLink} data-testid="deployment-version-link">
        {versionName}
      </Link>
    ) : (
      <span data-testid="deployment-version-name">{versionName}</span>
    );
  },
});
