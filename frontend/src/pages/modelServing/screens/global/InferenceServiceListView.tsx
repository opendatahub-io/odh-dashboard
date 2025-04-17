import * as React from 'react';
import { InferenceServiceKind, SecretKind, ServingRuntimeKind } from '~/k8sTypes';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { getInferenceServiceProjectDisplayName } from './utils';
import InferenceServiceTable from './InferenceServiceTable';
import InferenceServiceToolbar from './InferenceServiceToolbar';
import { DashboardFilterDataType, initialDashboardFilterData } from './const';

type InferenceServiceListViewProps = {
  inferenceServices: InferenceServiceKind[];
  servingRuntimes: ServingRuntimeKind[];
  refresh: () => void;
  filterTokens: (servingRuntime?: string | undefined) => SecretKind[];
};

const InferenceServiceListView: React.FC<InferenceServiceListViewProps> = ({
  inferenceServices: unfilteredInferenceServices,
  servingRuntimes,
  refresh,
  filterTokens,
}) => {
  const { projects } = React.useContext(ProjectsContext);
  const [filterData, setFilterData] = React.useState<DashboardFilterDataType>(
    initialDashboardFilterData,
  );
  const onClearFilters = React.useCallback(
    () => setFilterData(initialDashboardFilterData),
    [setFilterData],
  );

  const filteredInferenceServices = React.useMemo(
    () =>
      unfilteredInferenceServices.filter((project) => {
        const nameFilter = filterData.Name?.toLowerCase();
        const userFilter = filterData.Project?.toLowerCase();

        if (
          nameFilter &&
          !getDisplayNameFromK8sResource(project).toLowerCase().includes(nameFilter)
        ) {
          return false;
        }

        return (
          !userFilter ||
          getInferenceServiceProjectDisplayName(project, projects)
            .toLowerCase()
            .includes(userFilter)
        );
      }),
    [projects, filterData],
  );

  const resetFilters = () => {
    setFilterData(initialDashboardFilterData);
  };

  const onFilterUpdate = React.useCallback(
    (key: string, value: string | { label: string; value: string } | undefined) =>
      setFilterData((prevValues) => ({ ...prevValues, [key]: value })),
    [setFilterData],
  );

  return (
    <InferenceServiceTable
      isGlobal
      clearFilters={resetFilters}
      servingRuntimes={servingRuntimes}
      inferenceServices={filteredInferenceServices}
      refresh={() => {
        refresh();
      }}
      filterTokens={filterTokens}
      enablePagination
      onClearFilters={onClearFilters}
      toolbarContent={
        <InferenceServiceToolbar filterData={filterData} onFilterUpdate={onFilterUpdate} />
      }
    />
  );
};

export default InferenceServiceListView;
