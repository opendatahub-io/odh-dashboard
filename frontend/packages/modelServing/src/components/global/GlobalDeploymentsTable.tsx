import React from 'react';
import {
  initialModelServingFilterData,
  type ModelServingFilterDataType,
} from '@odh-dashboard/internal/pages/modelServing/screens/global/const';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import DashboardEmptyTableView from '@odh-dashboard/internal/concepts/dashboard/DashboardEmptyTableView';
import { namespaceToProjectDisplayName } from '@odh-dashboard/internal/concepts/projects/utils';
import { ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { useExtensions, useResolvedExtensions } from '@odh-dashboard/plugin-core';
import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { Label } from '@patternfly/react-core';
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

const GlobalDeploymentsTable: React.FC<{ deployments: Deployment[]; loaded: boolean }> = ({
  deployments,
  loaded,
}) => {
  const { projects } = React.useContext(ProjectsContext);
  const [filterData, setFilterData] = React.useState<ModelServingFilterDataType>(
    initialModelServingFilterData,
  );

  const filteredDeployments = React.useMemo(
    () =>
      deployments.filter((deployment) => {
        const nameFilter = filterData.Name?.toLowerCase();
        const projectFilter = filterData.Project?.toLowerCase();

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

  const [tableExtensions, tableExtensionsLoaded] = useResolvedExtensions(
    isModelServingDeploymentsTableExtension,
  );

  const platformColumns = React.useMemo(() => {
    const result: DeploymentsTableColumn<Deployment>[] = [];
    // Add a generic 'project name' column
    result.push(projectColumn(projects));
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
  }, [tableExtensions, projects]);

  return (
    <DeploymentsTable
      deployments={filteredDeployments}
      loaded={loaded && tableExtensionsLoaded}
      platformColumns={platformColumns}
      toolbarContent={
        <GlobalModelsToolbar
          filterData={filterData}
          onFilterUpdate={(key, value) => setFilterData((prev) => ({ ...prev, [key]: value }))}
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
