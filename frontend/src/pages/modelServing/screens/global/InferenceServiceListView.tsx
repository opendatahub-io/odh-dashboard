import * as React from 'react';
import { ToolbarItem } from '@patternfly/react-core';
import { InferenceServiceKind, ServingRuntimeKind } from '~/k8sTypes';
import SearchField, { SearchType } from '~/pages/projects/components/SearchField';
import { ModelServingContext } from '~/pages/modelServing/ModelServingContext';
import { getInferenceServiceDisplayName, getInferenceServiceProjectDisplayName } from './utils';
import ServeModelButton from './ServeModelButton';
import InferenceServiceTable from './InferenceServiceTable';

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
    projects: { data: projects },
  } = React.useContext(ModelServingContext);
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

  const searchTypes = React.useMemo(
    () =>
      Object.keys(SearchType).filter(
        (key) => SearchType[key] === SearchType.NAME || SearchType[key] === SearchType.PROJECT,
      ),
    [],
  );

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
              <SearchField
                types={searchTypes}
                searchType={searchType}
                searchValue={search}
                onSearchTypeChange={(searchType) => {
                  setSearchType(searchType);
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
