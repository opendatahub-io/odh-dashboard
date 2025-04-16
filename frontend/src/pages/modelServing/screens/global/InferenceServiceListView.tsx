import * as React from 'react';
import { ToolbarItem } from '@patternfly/react-core';
import { InferenceServiceKind, SecretKind, ServingRuntimeKind } from '~/k8sTypes';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import DashboardSearchField, { SearchType } from '~/concepts/dashboard/DashboardSearchField';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { getInferenceServiceProjectDisplayName } from './utils';
import InferenceServiceTable from './InferenceServiceTable';
import InferenceServiceToolbar from './InferenceServiceToolbar';

type InferenceServiceListViewProps = {
  inferenceServices: InferenceServiceKind[];
  servingRuntimes: ServingRuntimeKind[];
  refresh: () => void;
  filterTokens: (servingRuntime?: string | undefined) => SecretKind[];
};

export enum Options {
  name = 'Name',
  project = 'Project',
}

export type DashboardFilterDataType = Record<Options, string | undefined>;

export const initialDashboardFilterData: DashboardFilterDataType = {
  [Options.name]: '',
  [Options.project]: '',
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
  const [searchType, setSearchType] = React.useState<SearchType>(SearchType.NAME);
  const [search, setSearch] = React.useState('');

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
    setSearch('');
  };

  const searchTypes = React.useMemo(() => [SearchType.NAME, SearchType.PROJECT], []);

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
      toolbarContent={
        <InferenceServiceToolbar filterData={filterData} onFilterUpdate={onFilterUpdate} />
      }
    />
  );
};

export default InferenceServiceListView;
