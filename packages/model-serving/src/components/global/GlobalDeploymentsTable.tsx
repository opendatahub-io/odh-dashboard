import React from 'react';
import {
  initialModelServingFilterData,
  type ModelServingFilterDataType,
  ModelServingToolbarFilterOptions,
} from '@odh-dashboard/internal/pages/modelServing/screens/global/const';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import DashboardEmptyTableView from '@odh-dashboard/internal/concepts/dashboard/DashboardEmptyTableView';
import { Label, Toolbar, ToolbarContent, Stack } from '@patternfly/react-core';
import { namespaceToProjectDisplayName } from '@odh-dashboard/internal/concepts/projects/utils';
import { ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { useExtensions, useResolvedExtensions } from '@odh-dashboard/plugin-core';
import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { Link } from 'react-router-dom';
import GlobalModelsToolbar from './GlobalModelsToolbar';
import DeploymentsTable from '../deployments/DeploymentsTable';
import {
  isModelServingDeploymentsTableExtension,
  isModelServingPlatformExtension,
  type Deployment,
  type DeploymentsTableColumn,
} from '../../../extension-points';

const ProjectCell: React.FC<{ deployment: Deployment; projects: ProjectKind[] }> = ({
  deployment,
  projects,
}) => {
  const platformLabel = useExtensions(isModelServingPlatformExtension);
  const platform = platformLabel.find((p) => p.properties.id === deployment.modelServingPlatformId);
  return (
    <>
      {namespaceToProjectDisplayName(deployment.model.metadata.namespace, projects)}{' '}
      {platform && (
        <Label data-testid="serving-platform-label" isCompact>
          {platform.properties.enableCardText.enabledText}
        </Label>
      )}
    </>
  );
};

const projectColumn = (projects: ProjectKind[]): DeploymentsTableColumn => ({
  field: 'project',
  label: 'Project',
  sortable: (deploymentA: Deployment, deploymentB: Deployment) =>
    namespaceToProjectDisplayName(deploymentA.model.metadata.namespace, projects).localeCompare(
      namespaceToProjectDisplayName(deploymentB.model.metadata.namespace, projects),
    ),
  cellRenderer: (deployment: Deployment) => (
    <ProjectCell deployment={deployment} projects={projects} />
  ),
});

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

const createVersionColumn = (
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

const GlobalDeploymentsTable: React.FC<{
  deployments: Deployment[];
  loaded: boolean;
  hideDeployButton?: boolean;
  showAlert?: boolean;
  alertContent?: React.ReactNode;
  showVersionColumn?: boolean;
  mrName?: string;
}> = ({
  deployments,
  loaded,
  hideDeployButton = false,
  showAlert = false,
  alertContent,
  showVersionColumn = false,
  mrName,
}) => {
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const { projects } = React.useContext(ProjectsContext);
  const [filterData, setFilterData] = React.useState<ModelServingFilterDataType>(
    initialModelServingFilterData,
  );

  const filteredDeployments = React.useMemo(
    () =>
      deployments.filter((deployment) => {
        const nameFilter = filterData[ModelServingToolbarFilterOptions.name]?.toLowerCase();
        const projectFilter = filterData[ModelServingToolbarFilterOptions.project]?.toLowerCase();

        if (
          nameFilter &&
          !getDisplayNameFromK8sResource(deployment.model).toLowerCase().includes(nameFilter)
        ) {
          return false;
        }

        return (
          !projectFilter ||
          namespaceToProjectDisplayName(deployment.model.metadata.namespace, projects)
            .toLowerCase()
            .includes(projectFilter)
        );
      }),
    [filterData, deployments, projects],
  );

  const paginatedDeployments = React.useMemo(() => {
    if (showAlert) {
      const startIndex = (page - 1) * perPage;
      return filteredDeployments.slice(startIndex, startIndex + perPage);
    }
    return filteredDeployments;
  }, [filteredDeployments, page, perPage, showAlert]);

  const [tableExtensions, tableExtensionsLoaded] = useResolvedExtensions(
    isModelServingDeploymentsTableExtension,
  );

  const platformColumns = React.useMemo(() => {
    const result: DeploymentsTableColumn<Deployment>[] = [];
    // Add a generic 'project name' column
    result.push(projectColumn(projects));
    // Add version column if requested
    if (showVersionColumn) {
      result.push(createVersionColumn(mrName));
    }
    // Only add platform columns if all platforms have the same columns
    if (tableExtensions.length > 0) {
      const [firstExtension, ...restExtensions] = tableExtensions;
      const firstExtensionColumns = firstExtension.properties.columns();
      const commonColumns = firstExtensionColumns.filter((column) =>
        restExtensions.every((a) => a.properties.columns().find((c) => c.field === column.field)),
      );
      result.push(...commonColumns);
    }
    return result;
  }, [tableExtensions, projects, showVersionColumn, mrName]);

  if (showAlert && alertContent) {
    return (
      <Stack hasGutter>
        <Toolbar>
          <ToolbarContent>
            <GlobalModelsToolbar
              filterData={filterData}
              onFilterUpdate={(key, value) => setFilterData((prev) => ({ ...prev, [key]: value }))}
              hideDeployButton={hideDeployButton}
              showPagination
              paginationProps={{
                itemCount: filteredDeployments.length,
                perPage,
                page,
                onSetPage: (_, newPage) => setPage(newPage),
                onPerPageSelect: (_, newPerPage) => {
                  setPerPage(newPerPage);
                  setPage(1);
                },
              }}
            />
          </ToolbarContent>
        </Toolbar>
        {alertContent}
        <DeploymentsTable
          deployments={paginatedDeployments}
          loaded={loaded && tableExtensionsLoaded}
          platformColumns={platformColumns}
          onClearFilters={() => {
            setFilterData(initialModelServingFilterData);
            setPage(1);
          }}
          emptyTableView={
            <DashboardEmptyTableView
              onClearFilters={() => {
                setFilterData(initialModelServingFilterData);
                setPage(1);
              }}
            />
          }
        />
      </Stack>
    );
  }

  return (
    <DeploymentsTable
      deployments={filteredDeployments}
      loaded={loaded && tableExtensionsLoaded}
      platformColumns={platformColumns}
      toolbarContent={
        <GlobalModelsToolbar
          filterData={filterData}
          onFilterUpdate={(key, value) => setFilterData((prev) => ({ ...prev, [key]: value }))}
          hideDeployButton={hideDeployButton}
        />
      }
      onClearFilters={() => setFilterData(initialModelServingFilterData)}
      enablePagination
      emptyTableView={
        <DashboardEmptyTableView
          onClearFilters={() => setFilterData(initialModelServingFilterData)}
        />
      }
    />
  );
};

export default GlobalDeploymentsTable;
