import * as React from 'react';
import { ToolbarItem } from '@patternfly/react-core';
import { InferenceServiceKind, ServingRuntimeKind } from '~/k8sTypes';
import { ModelServingContext } from '~/pages/modelServing/ModelServingContext';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import DashboardSearchField, { SearchType } from '~/concepts/dashboard/DashboardSearchField';
import { getInferenceServiceDisplayName, getInferenceServiceProjectDisplayName } from './utils';
import InferenceServiceTable from './InferenceServiceTable';
import ServeModelButton from './ServeModelButton';

type InferenceServiceListViewProps = {
  inferenceServices: InferenceServiceKind[];
  servingRuntimes: ServingRuntimeKind[];
};

const InferenceServiceListView: React.FC<InferenceServiceListViewProps> = ({
  inferenceServices: unfilteredInferenceServices,
  servingRuntimes,
}) => {
  const {
    inferenceServices: { refresh },
  } = React.useContext(ModelServingContext);
  const { projects } = React.useContext(ProjectsContext);
  const [searchType, setSearchType] = React.useState<SearchType>(SearchType.NAME);
  const [search, setSearch] = React.useState('');

  const filteredInferenceServices = unfilteredInferenceServices.filter((project) => {
    if (!search) {
      return true;
    }

    switch (searchType) {
      case SearchType.NAME:
        return getInferenceServiceDisplayName(project).toLowerCase().includes(search.toLowerCase());
      case SearchType.PROJECT:
        return getInferenceServiceProjectDisplayName(project, projects)
          .toLowerCase()
          .includes(search.toLowerCase());
      default:
        return true;
    }
  });

  const resetFilters = () => {
    setSearch('');
  };

  const searchTypes = React.useMemo(() => [SearchType.NAME, SearchType.PROJECT], []);

  return (
    <>
      <InferenceServiceTable
        clearFilters={resetFilters}
        servingRuntimes={servingRuntimes}
        inferenceServices={filteredInferenceServices}
        refresh={refresh}
        enablePagination
        toolbarContent={
          <>
            <ToolbarItem>
              <DashboardSearchField
                types={searchTypes}
                searchType={searchType}
                searchValue={search}
                onSearchTypeChange={(newSearchType) => {
                  setSearchType(newSearchType);
                }}
                onSearchValueChange={(searchValue) => {
                  setSearch(searchValue);
                }}
              />
            </ToolbarItem>
            <ToolbarItem>
              <ServeModelButton />
            </ToolbarItem>
          </>
        }
      />
    </>
  );
};

export default InferenceServiceListView;
