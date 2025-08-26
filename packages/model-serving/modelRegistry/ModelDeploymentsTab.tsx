import React from 'react';
import { ProjectObjectType, typedEmptyImage } from '@odh-dashboard/internal/concepts/design/utils';
import { ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { KnownLabels } from '@odh-dashboard/internal/k8sTypes';
import { useExtensions, useResolvedExtensions } from '@odh-dashboard/plugin-core';
import {
  initialModelServingFilterData,
  type ModelServingFilterDataType,
  ModelServingToolbarFilterOptions,
  modelServingFilterOptions,
} from '@odh-dashboard/internal/pages/modelServing/screens/global/const';
import { SearchInput, ToolbarItem, Label, Alert, Pagination } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import FilterToolbar from '@odh-dashboard/internal/components/FilterToolbar';
import DashboardEmptyTableView from '@odh-dashboard/internal/concepts/dashboard/DashboardEmptyTableView';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import { namespaceToProjectDisplayName } from '@odh-dashboard/internal/concepts/projects/utils';
import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import EmptyDeploymentsState from './EmptyDeploymentsState';
import {
  isModelServingPlatformExtension,
  isModelServingDeploymentsTableExtension,
  type DeploymentsTableColumn,
  type Deployment,
} from '../extension-points';
import DeploymentsTable from '../src/components/deployments/DeploymentsTable';
import {
  ModelDeploymentsContext,
  ModelDeploymentsProvider,
} from '../src/concepts/ModelDeploymentsContext';

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

const projectColumn = (projects: ProjectKind[]): DeploymentsTableColumn<Deployment> => ({
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
  // Try to extract version name from deployment name if it follows the pattern "model-name - version-name"
  // This is the most reliable source for human-readable version names
  const deploymentName = getDisplayNameFromK8sResource(deployment.model);
  const versionMatch = deploymentName.match(/^.*?\s*-\s*(.+)$/);
  if (versionMatch?.[1]) {
    return versionMatch[1];
  }

  // Check annotations for version name
  const versionNameAnnotation =
    deployment.model.metadata.annotations?.['modelregistry.opendatahub.io/model-version-name'];
  if (versionNameAnnotation) {
    return versionNameAnnotation;
  }

  // Last resort: try version ID from labels (though this is likely a UUID)
  const versionId =
    deployment.model.metadata.labels?.['modelregistry.opendatahub.io/model-version-id'];
  if (versionId) {
    return versionId;
  }

  // Fallback to showing "Unknown"
  return 'Unknown';
};

const versionColumn: DeploymentsTableColumn<Deployment> = {
  field: 'version',
  label: 'Version name',
  sortable: (deploymentA: Deployment, deploymentB: Deployment) =>
    getVersionName(deploymentA).localeCompare(getVersionName(deploymentB)),
  cellRenderer: (deployment: Deployment) => (
    <span data-testid="deployment-version-name">{getVersionName(deployment)}</span>
  ),
};

const ModelDeploymentsTabContent: React.FC = () => {
  const { deployments, loaded: deploymentsLoaded } = React.useContext(ModelDeploymentsContext);
  const { projects } = React.useContext(ProjectsContext);
  const [filterData, setFilterData] = React.useState<ModelServingFilterDataType>(
    initialModelServingFilterData,
  );
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);

  const filteredDeployments = React.useMemo(
    () =>
      (deployments ?? []).filter((deployment) => {
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

  const paginatedDeployments = React.useMemo(() => {
    const startIndex = (page - 1) * perPage;
    return filteredDeployments.slice(startIndex, startIndex + perPage);
  }, [filteredDeployments, page, perPage]);

  const [tableExtensions, tableExtensionsLoaded] = useResolvedExtensions(
    isModelServingDeploymentsTableExtension,
  );

  const platformColumns = React.useMemo(() => {
    const result: DeploymentsTableColumn<Deployment>[] = [];
    // Add a generic 'project name' column
    result.push(projectColumn(projects));
    // Add version name column
    result.push(versionColumn);
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

  if (deploymentsLoaded && deployments?.length === 0) {
    return (
      <EmptyDeploymentsState
        title="No deployments from model registry"
        headerIcon={() => (
          <img
            src={typedEmptyImage(ProjectObjectType.registeredModels, 'MissingDeployment')}
            alt="missing deployment"
          />
        )}
        description="No deployments initiated from model registry for this model."
        testid="model-deployments-empty-state"
      />
    );
  }

  return (
    <DeploymentsTable
      deployments={paginatedDeployments}
      loaded={deploymentsLoaded && tableExtensionsLoaded}
      platformColumns={platformColumns}
      toolbarContent={
        <>
          <FilterToolbar<keyof typeof modelServingFilterOptions>
            data-testid="model-deployments-table-toolbar"
            filterOptions={modelServingFilterOptions}
            filterOptionRenders={{
              [ModelServingToolbarFilterOptions.name]: ({ onChange, ...props }) => (
                <SearchInput
                  {...props}
                  aria-label="Filter by name"
                  placeholder="Filter by name"
                  onChange={(_event, value) => onChange(value)}
                />
              ),
              [ModelServingToolbarFilterOptions.project]: ({ onChange, ...props }) => (
                <SearchInput
                  {...props}
                  aria-label="Filter by project"
                  placeholder="Filter by project"
                  onChange={(_event, value) => onChange(value)}
                />
              ),
            }}
            filterData={filterData}
            onFilterUpdate={(key, value) => setFilterData((prev) => ({ ...prev, [key]: value }))}
          >
            <ToolbarItem variant="pagination" align={{ default: 'alignEnd' }}>
              <Pagination
                itemCount={filteredDeployments.length}
                perPage={perPage}
                page={page}
                onSetPage={(_, newPage) => setPage(newPage)}
                onPerPageSelect={(_, newPerPage) => {
                  setPerPage(newPerPage);
                  setPage(1);
                }}
                variant="top"
                isCompact
              />
            </ToolbarItem>
          </FilterToolbar>
          <Alert
            variant="info"
            isInline
            title="Filtered list: Deployments from model registry only"
          >
            This list includes only deployments that were initiated from the model registry. To view{' '}
            and manage all of your deployments, go to the{' '}
            <Link to="/modelServing">Model Serving</Link> page.
          </Alert>
        </>
      }
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
  );
};

const ModelDeploymentsTab: React.FC<{ rmId?: string; mrName?: string }> = ({ rmId, mrName }) => {
  const { projects } = React.useContext(ProjectsContext);
  const modelServingPlatforms = useExtensions(isModelServingPlatformExtension);
  const labelSelectors = React.useMemo(() => {
    if (!rmId) {
      return undefined;
    }
    return {
      [KnownLabels.REGISTERED_MODEL_ID]: rmId,
    };
  }, [rmId]);

  return (
    <ModelDeploymentsProvider
      projects={projects}
      modelServingPlatforms={modelServingPlatforms}
      labelSelectors={labelSelectors}
      mrName={mrName}
    >
      <ModelDeploymentsTabContent />
    </ModelDeploymentsProvider>
  );
};

export default ModelDeploymentsTab;
